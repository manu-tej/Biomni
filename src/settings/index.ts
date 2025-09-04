/**
 * Biomni Settings Service
 * Manages VSCode settings integration, configuration validation, and secure storage
 */

import * as vscode from 'vscode';
import { BiomniSettings, DEFAULT_SETTINGS, SECURE_SETTINGS } from './schema';
import { SecretStorageManager } from '../security/secrets';
import { SettingsValidator } from './validator';
import { SettingsMigrator } from './migration';

export class BiomniSettingsService {
  private static instance: BiomniSettingsService | undefined;
  private readonly secretStorage: SecretStorageManager;
  private readonly validator: SettingsValidator;
  private readonly migrator: SettingsMigrator;
  private readonly configurationTarget: vscode.ConfigurationTarget;
  
  // Event emitters for settings changes
  private readonly _onSettingsChanged = new vscode.EventEmitter<Partial<BiomniSettings>>();
  public readonly onSettingsChanged = this._onSettingsChanged.event;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ) {
    this.configurationTarget = target;
    this.secretStorage = new SecretStorageManager(context);
    this.validator = new SettingsValidator();
    this.migrator = new SettingsMigrator(context);
    
    // Listen for VSCode configuration changes
    vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChange, this);
  }

  /**
   * Get or create settings service instance
   */
  public static getInstance(
    context?: vscode.ExtensionContext, 
    target?: vscode.ConfigurationTarget
  ): BiomniSettingsService {
    if (!BiomniSettingsService.instance && context) {
      BiomniSettingsService.instance = new BiomniSettingsService(context, target);
    }
    if (!BiomniSettingsService.instance) {
      throw new Error('BiomniSettingsService must be initialized with context first');
    }
    return BiomniSettingsService.instance;
  }

  /**
   * Initialize the settings service
   */
  public async initialize(): Promise<void> {
    try {
      // Run settings migration if needed
      await this.migrator.migrateIfNeeded();
      
      // Validate current settings
      const currentSettings = await this.getAllSettings();
      const validationResult = this.validator.validateSettings(currentSettings);
      
      if (!validationResult.isValid) {
        console.warn('Settings validation failed:', validationResult.errors);
        // Attempt to fix invalid settings
        await this.fixInvalidSettings(validationResult.errors);
      }

      console.log('Biomni Settings Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize settings service:', error);
      throw error;
    }
  }

  /**
   * Get all settings with secure values populated
   */
  public async getAllSettings(): Promise<BiomniSettings> {
    const config = vscode.workspace.getConfiguration('biomni');
    const settings = this.mergeWithDefaults(config);
    
    // Populate secure settings from secret storage
    settings.security.apiKeys.ncbiApiKeySet = await this.secretStorage.hasSecret('ncbiApiKey');
    settings.security.apiKeys.uniprotApiKeySet = await this.secretStorage.hasSecret('uniprotApiKey');
    settings.security.apiKeys.ensemblApiKeySet = await this.secretStorage.hasSecret('ensemblApiKey');
    
    // Get custom API key names
    const customKeys = await this.secretStorage.listSecrets('customApiKey_');
    settings.security.apiKeys.customApiKeysSet = customKeys.map(key => key.replace('customApiKey_', ''));

    return settings;
  }

  /**
   * Get a specific setting value
   */
  public async getSetting<K extends keyof BiomniSettings>(
    category: K,
    key?: string
  ): Promise<BiomniSettings[K] | any> {
    const config = vscode.workspace.getConfiguration(`biomni.${category as string}`);
    
    if (key) {
      return config.get(key, this.getDefaultValue(category, key));
    }
    
    const settings = await this.getAllSettings();
    return settings[category];
  }

  /**
   * Update a setting value
   */
  public async updateSetting<K extends keyof BiomniSettings>(
    category: K,
    key: string,
    value: any,
    target?: vscode.ConfigurationTarget
  ): Promise<void> {
    const configTarget = target || this.configurationTarget;
    const configKey = `biomni.${category as string}.${key}`;
    
    // Validate the new value
    const validationResult = this.validator.validateSettingValue(category, key, value);
    if (!validationResult.isValid) {
      throw new Error(`Invalid setting value: ${validationResult.errors.join(', ')}`);
    }

    try {
      const config = vscode.workspace.getConfiguration();
      await config.update(configKey, value, configTarget);
      
      console.log(`Setting updated: ${configKey} = ${value}`);
    } catch (error) {
      console.error(`Failed to update setting ${configKey}:`, error);
      throw error;
    }
  }

  /**
   * Store an API key securely
   */
  public async storeApiKey(keyName: string, keyValue: string): Promise<void> {
    if (!keyValue || keyValue.trim().length === 0) {
      throw new Error('API key value cannot be empty');
    }

    const secureKeyName = SECURE_SETTINGS.includes(keyName as any) 
      ? keyName 
      : `customApiKey_${keyName}`;

    await this.secretStorage.storeSecret(secureKeyName, keyValue);
    
    // Update the corresponding boolean flag
    const flagPath = this.getApiKeyFlagPath(keyName);
    if (flagPath) {
      await this.updateSetting('security', flagPath, true);
    }

    console.log(`API key stored securely: ${keyName}`);
  }

  /**
   * Retrieve an API key
   */
  public async getApiKey(keyName: string): Promise<string | undefined> {
    const secureKeyName = SECURE_SETTINGS.includes(keyName as any) 
      ? keyName 
      : `customApiKey_${keyName}`;
    
    return await this.secretStorage.getSecret(secureKeyName);
  }

  /**
   * Remove an API key
   */
  public async removeApiKey(keyName: string): Promise<void> {
    const secureKeyName = SECURE_SETTINGS.includes(keyName as any) 
      ? keyName 
      : `customApiKey_${keyName}`;

    await this.secretStorage.deleteSecret(secureKeyName);
    
    // Update the corresponding boolean flag
    const flagPath = this.getApiKeyFlagPath(keyName);
    if (flagPath) {
      await this.updateSetting('security', flagPath, false);
    }

    console.log(`API key removed: ${keyName}`);
  }

  /**
   * Export settings to a JSON object (excluding secure data)
   */
  public async exportSettings(includeWorkspace: boolean = false): Promise<any> {
    const settings = await this.getAllSettings();
    
    // Remove secure data
    const exportData = JSON.parse(JSON.stringify(settings));
    delete exportData.security.apiKeys;
    
    // Add metadata
    const exportObject = {
      version: this.context.extension?.packageJSON?.version || '1.0.0',
      exportedAt: new Date().toISOString(),
      includeWorkspace,
      settings: exportData
    };

    return exportObject;
  }

  /**
   * Import settings from a JSON object
   */
  public async importSettings(
    importData: any, 
    target?: vscode.ConfigurationTarget,
    validate: boolean = true
  ): Promise<void> {
    if (!importData.settings) {
      throw new Error('Invalid import data: missing settings object');
    }

    const settings = importData.settings as Partial<BiomniSettings>;
    
    if (validate) {
      const validationResult = this.validator.validateSettings(settings);
      if (!validationResult.isValid) {
        throw new Error(`Import validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    const configTarget = target || this.configurationTarget;

    // Import each setting category
    for (const [category, categorySettings] of Object.entries(settings)) {
      if (categorySettings && typeof categorySettings === 'object') {
        for (const [key, value] of Object.entries(categorySettings)) {
          try {
            await this.updateSetting(category as any, key, value, configTarget);
          } catch (error) {
            console.warn(`Failed to import setting ${category}.${key}:`, error);
          }
        }
      }
    }

    console.log('Settings imported successfully');
  }

  /**
   * Reset settings to defaults
   */
  public async resetToDefaults(category?: keyof BiomniSettings): Promise<void> {
    const config = vscode.workspace.getConfiguration('biomni');
    
    if (category) {
      // Reset specific category
      const defaultCategorySettings = DEFAULT_SETTINGS[category];
      for (const [key, value] of Object.entries(defaultCategorySettings)) {
        const configKey = `${category as string}.${key}`;
        await config.update(configKey, value, this.configurationTarget);
      }
    } else {
      // Reset all settings
      for (const [cat, categorySettings] of Object.entries(DEFAULT_SETTINGS)) {
        for (const [key, value] of Object.entries(categorySettings)) {
          const configKey = `${cat}.${key}`;
          await config.update(configKey, value, this.configurationTarget);
        }
      }
    }

    console.log(`Settings reset to defaults: ${category || 'all categories'}`);
  }

  /**
   * Get workspace-specific settings
   */
  public async getWorkspaceSettings(): Promise<Partial<BiomniSettings>> {
    if (!vscode.workspace.workspaceFolders) {
      return {};
    }

    const workspaceConfig = vscode.workspace.getConfiguration('biomni', vscode.workspace.workspaceFolders[0]);
    return this.mergeWithDefaults(workspaceConfig, true);
  }

  /**
   * Check if workspace settings override global settings
   */
  public hasWorkspaceOverrides(): boolean {
    if (!vscode.workspace.workspaceFolders) {
      return false;
    }

    const workspaceConfig = vscode.workspace.getConfiguration('biomni', vscode.workspace.workspaceFolders[0]);
    const inspect = workspaceConfig.inspect('enabled');
    
    return !!(inspect?.workspaceValue !== undefined || inspect?.workspaceFolderValue !== undefined);
  }

  /**
   * Handle VSCode configuration changes
   */
  private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('biomni')) {
      this.getAllSettings().then(settings => {
        this._onSettingsChanged.fire(settings);
      });
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: vscode.WorkspaceConfiguration, partialOnly: boolean = false): BiomniSettings {
    const result = partialOnly ? {} as any : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    // Merge each category
    for (const category of Object.keys(DEFAULT_SETTINGS) as (keyof BiomniSettings)[]) {
      const categoryConfig = config.get(category as string);
      if (categoryConfig && typeof categoryConfig === 'object') {
        if (partialOnly && Object.keys(categoryConfig).length === 0) {
          continue;
        }
        result[category] = { ...result[category], ...categoryConfig };
      }
    }

    return result;
  }

  /**
   * Get default value for a setting
   */
  private getDefaultValue(category: keyof BiomniSettings, key: string): any {
    const categoryDefaults = DEFAULT_SETTINGS[category] as any;
    return categoryDefaults?.[key];
  }

  /**
   * Get API key flag path for updating boolean indicators
   */
  private getApiKeyFlagPath(keyName: string): string | undefined {
    const flagMap: Record<string, string> = {
      'ncbiApiKey': 'apiKeys.ncbiApiKeySet',
      'uniprotApiKey': 'apiKeys.uniprotApiKeySet',
      'ensemblApiKey': 'apiKeys.ensemblApiKeySet'
    };
    return flagMap[keyName];
  }

  /**
   * Fix invalid settings by resetting to defaults
   */
  private async fixInvalidSettings(errors: string[]): Promise<void> {
    console.log('Attempting to fix invalid settings:', errors);
    
    for (const error of errors) {
      // Parse error to extract category and key (basic implementation)
      const match = error.match(/(\w+)\.(\w+)/);
      if (match) {
        const [, category, key] = match;
        try {
          const defaultValue = this.getDefaultValue(category as keyof BiomniSettings, key);
          if (defaultValue !== undefined) {
            await this.updateSetting(category as keyof BiomniSettings, key, defaultValue);
          }
        } catch (fixError) {
          console.warn(`Failed to fix setting ${category}.${key}:`, fixError);
        }
      }
    }
  }

  /**
   * Dispose of the settings service
   */
  public dispose(): void {
    this._onSettingsChanged.dispose();
    this.secretStorage.dispose();
  }
}