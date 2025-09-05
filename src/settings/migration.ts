/**
 * Settings Migration System for Biomni VSCode Extension
 * Handles version updates and settings schema changes
 */

import * as vscode from 'vscode';
import { DEFAULT_SETTINGS } from './schema';

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (settings: any) => any;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors: string[];
}

export class SettingsMigrator {
  private readonly currentVersion: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.currentVersion = context.extension?.packageJSON?.version || '1.0.0';
  }

  /**
   * Check if migration is needed and perform it
   */
  public async migrateIfNeeded(): Promise<MigrationResult | null> {
    const storedVersion = await this.getStoredVersion();

    if (!storedVersion || storedVersion === this.currentVersion) {
      return null; // No migration needed
    }

    console.log(`Settings migration needed: ${storedVersion} -> ${this.currentVersion}`);
    return await this.performMigration(storedVersion, this.currentVersion);
  }

  /**
   * Perform settings migration from one version to another
   */
  public async performMigration(fromVersion: string, toVersion: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion,
      toVersion,
      changes: [],
      errors: [],
    };

    try {
      // Get current settings
      const currentSettings = this.getAllCurrentSettings();

      // Get applicable migration rules
      const migrationRules = this.getMigrationRules(fromVersion, toVersion);

      if (migrationRules.length === 0) {
        result.success = true;
        result.changes.push('No migration rules applicable');
        await this.updateStoredVersion(toVersion);
        return result;
      }

      // Apply migration rules in order
      let migratedSettings = currentSettings;

      for (const rule of migrationRules) {
        try {
          const beforeMigration = JSON.stringify(migratedSettings);
          migratedSettings = rule.migrate(migratedSettings);
          const afterMigration = JSON.stringify(migratedSettings);

          if (beforeMigration !== afterMigration) {
            result.changes.push(`Applied: ${rule.description}`);
          }
        } catch (error) {
          const errorMsg = `Failed to apply migration rule: ${rule.description}`;
          console.error(errorMsg, error);
          result.errors.push(errorMsg);
        }
      }

      // Apply migrated settings
      if (Object.keys(migratedSettings).length > 0) {
        await this.applyMigratedSettings(migratedSettings);
        result.changes.push('Settings updated with migrated values');
      }

      // Update version
      await this.updateStoredVersion(toVersion);

      result.success = result.errors.length === 0;
      console.log(`Migration completed: ${result.success ? 'Success' : 'With errors'}`);
    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Get migration rules applicable between two versions
   */
  private getMigrationRules(fromVersion: string, toVersion: string): MigrationRule[] {
    const allRules = this.getAllMigrationRules();

    // Filter rules that apply to the version range
    return allRules
      .filter(rule => this.versionInRange(rule.fromVersion, fromVersion, toVersion))
      .sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion));
  }

  /**
   * Define all migration rules
   */
  private getAllMigrationRules(): MigrationRule[] {
    return [
      // Example migration from 0.0.1 to 0.1.0
      {
        fromVersion: '0.0.1',
        toVersion: '0.1.0',
        description: 'Migrate basic settings to categorized structure',
        migrate: (settings: any) => {
          const migrated: any = {};

          // Migrate old flat structure to new nested structure
          if (settings.enabled !== undefined) {
            migrated['extension.core.enabled'] = settings.enabled;
          }
          if (settings.mcpServerUrl !== undefined) {
            migrated['extension.core.mcpServerUrl'] = settings.mcpServerUrl;
          }
          if (settings.autoActivate !== undefined) {
            migrated['extension.core.autoActivate'] = settings.autoActivate;
          }
          if (settings.showSmartSuggestions !== undefined) {
            migrated['extension.fileDetection.showSmartSuggestions'] =
              settings.showSmartSuggestions;
          }
          if (settings.showNewFileNotifications !== undefined) {
            migrated['extension.fileDetection.showNewFileNotifications'] =
              settings.showNewFileNotifications;
          }

          return migrated;
        },
      },

      // Migration for cache settings restructure
      {
        fromVersion: '0.1.0',
        toVersion: '0.2.0',
        description: 'Restructure cache settings and add performance options',
        migrate: (settings: any) => {
          const migrated: any = { ...settings };

          // Migrate old cache settings
          if (settings['fileDetection.cacheEnabled'] !== undefined) {
            migrated['performance.cache.enabled'] = settings['fileDetection.cacheEnabled'];
            delete migrated['fileDetection.cacheEnabled'];
          }
          if (settings['fileDetection.maxCacheSize'] !== undefined) {
            migrated['performance.cache.maxFiles'] = settings['fileDetection.maxCacheSize'];
            delete migrated['fileDetection.maxCacheSize'];
          }

          // Add default performance settings if not present
          if (!migrated['performance.cache.size']) {
            migrated['performance.cache.size'] = DEFAULT_SETTINGS.performance.cache.size;
          }
          if (!migrated['performance.cache.ttl']) {
            migrated['performance.cache.ttl'] = DEFAULT_SETTINGS.performance.cache.ttl;
          }

          return migrated;
        },
      },

      // Migration for security settings introduction
      {
        fromVersion: '0.2.0',
        toVersion: '0.3.0',
        description: 'Add security and privacy settings',
        migrate: (settings: any) => {
          const migrated: any = { ...settings };

          // Add default security settings
          if (!migrated['security.privacy.enableDataRetention']) {
            migrated['security.privacy.enableDataRetention'] =
              DEFAULT_SETTINGS.security.privacy.enableDataRetention;
          }
          if (!migrated['security.privacy.shareUsageStatistics']) {
            migrated['security.privacy.shareUsageStatistics'] =
              DEFAULT_SETTINGS.security.privacy.shareUsageStatistics;
          }

          return migrated;
        },
      },

      // Future migration example for tool settings
      {
        fromVersion: '0.3.0',
        toVersion: '1.0.0',
        description: 'Add comprehensive tool configuration settings',
        migrate: (settings: any) => {
          const migrated: any = { ...settings };

          // Add default tool settings if not present
          const toolCategories = ['blast', 'alignment', 'annotation'] as const;
          for (const tool of toolCategories) {
            const toolSettings = (DEFAULT_SETTINGS.tools as any)[tool];
            for (const [key, value] of Object.entries(toolSettings)) {
              const settingKey = `tools.${tool}.${key}`;
              if (!migrated[settingKey]) {
                migrated[settingKey] = value;
              }
            }
          }

          return migrated;
        },
      },
    ];
  }

  /**
   * Get currently stored settings version
   */
  private async getStoredVersion(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('biomni.internal');
    return config.get<string>('settingsVersion');
  }

  /**
   * Update stored settings version
   */
  private async updateStoredVersion(version: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('biomni.internal');
    await config.update('settingsVersion', version, vscode.ConfigurationTarget.Global);
  }

  /**
   * Get all current settings as flat key-value pairs
   */
  private getAllCurrentSettings(): Record<string, any> {
    const settings: Record<string, any> = {};

    // Extract all biomni settings
    const biomniConfig = vscode.workspace.getConfiguration('biomni');
    this.extractSettingsRecursive(biomniConfig, '', settings);

    return settings;
  }

  /**
   * Recursively extract settings from configuration
   */
  private extractSettingsRecursive(config: any, prefix: string, result: Record<string, any>): void {
    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.extractSettingsRecursive(value, fullKey, result);
      } else {
        result[fullKey] = value;
      }
    }
  }

  /**
   * Apply migrated settings to VSCode configuration
   */
  private async applyMigratedSettings(settings: Record<string, any>): Promise<void> {
    const config = vscode.workspace.getConfiguration('biomni');

    for (const [key, value] of Object.entries(settings)) {
      try {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      } catch (error) {
        console.warn(`Failed to update setting ${key}:`, error);
      }
    }
  }

  /**
   * Check if a version is in range for migration
   */
  private versionInRange(
    ruleFromVersion: string,
    migrationFromVersion: string,
    migrationToVersion: string
  ): boolean {
    return (
      this.compareVersions(ruleFromVersion, migrationFromVersion) >= 0 &&
      this.compareVersions(ruleFromVersion, migrationToVersion) <= 0
    );
  }

  /**
   * Compare two version strings (simple implementation)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

    const maxLength = Math.max(v1parts.length, v2parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part < v2part) {
        return -1;
      }
      if (v1part > v2part) {
        return 1;
      }
    }

    return 0;
  }

  /**
   * Backup current settings before migration
   */
  public async backupSettings(): Promise<void> {
    try {
      const settings = this.getAllCurrentSettings();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Store backup in global state
      await this.context.globalState.update(`biomni_settings_backup_${timestamp}`, {
        version: await this.getStoredVersion(),
        timestamp,
        settings,
      });

      console.log('Settings backup created successfully');
    } catch (error) {
      console.error('Failed to backup settings:', error);
    }
  }

  /**
   * List available setting backups
   */
  public getAvailableBackups(): Array<{ key: string; timestamp: string; version: string }> {
    const backups: Array<{ key: string; timestamp: string; version: string }> = [];
    const globalState = this.context.globalState;

    for (const key of globalState.keys()) {
      if (key.startsWith('biomni_settings_backup_')) {
        const backupData = globalState.get(key) as any;
        if (backupData) {
          backups.push({
            key,
            timestamp: backupData.timestamp,
            version: backupData.version || 'unknown',
          });
        }
      }
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Restore settings from backup
   */
  public async restoreFromBackup(backupKey: string): Promise<void> {
    const backupData = this.context.globalState.get(backupKey) as any;
    if (!backupData || !backupData.settings) {
      throw new Error('Invalid backup data');
    }

    await this.applyMigratedSettings(backupData.settings);
    console.log(`Settings restored from backup: ${backupKey}`);
  }

  /**
   * Clean up old backups (keep last 10)
   */
  public async cleanupOldBackups(): Promise<void> {
    const backups = this.getAvailableBackups();
    const backupsToRemove = backups.slice(10); // Keep last 10

    for (const backup of backupsToRemove) {
      await this.context.globalState.update(backup.key, undefined);
    }

    if (backupsToRemove.length > 0) {
      console.log(`Cleaned up ${backupsToRemove.length} old backup(s)`);
    }
  }
}
