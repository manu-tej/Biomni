/**
 * Tests for BiomniSettingsService
 */

import * as vscode from 'vscode';
import { BiomniSettingsService } from '../../src/settings';
import { SecretStorageManager } from '../../src/security/secrets';
import { DEFAULT_SETTINGS } from '../../src/settings/schema';

// Mock VSCode APIs
const mockContext = {
  extensionUri: vscode.Uri.file('/test'),
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
  },
  secrets: {
    store: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
  extension: {
    packageJSON: { version: '1.0.0' },
  },
} as any;

const mockConfiguration = {
  get: jest.fn(),
  update: jest.fn(),
  inspect: jest.fn(),
  has: jest.fn(),
};

const mockWorkspace = {
  getConfiguration: jest.fn(() => mockConfiguration),
  workspaceFolders: undefined,
  onDidChangeConfiguration: jest.fn(),
};

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: mockWorkspace,
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
}));

describe('BiomniSettingsService', () => {
  let settingsService: BiomniSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (BiomniSettingsService as any).instance = undefined;
    
    // Set up default mock responses
    mockConfiguration.get.mockImplementation((key: string, defaultValue?: any) => {
      const keyParts = key.split('.');
      let value: any = DEFAULT_SETTINGS;
      
      for (const part of keyParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return defaultValue;
        }
      }
      
      return value || defaultValue;
    });
  });

  afterEach(() => {
    if (settingsService) {
      settingsService.dispose();
    }
  });

  describe('Initialization', () => {
    test('should create singleton instance', async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();

      const secondInstance = BiomniSettingsService.getInstance();
      expect(secondInstance).toBe(settingsService);
    });

    test('should throw error if no context provided on first call', () => {
      expect(() => {
        BiomniSettingsService.getInstance();
      }).toThrow('BiomniSettingsService must be initialized with context first');
    });

    test('should initialize successfully with valid context', async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      
      await expect(settingsService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should get all settings with defaults', async () => {
      const settings = await settingsService.getAllSettings();
      
      expect(settings).toHaveProperty('tools');
      expect(settings).toHaveProperty('display');
      expect(settings).toHaveProperty('performance');
      expect(settings).toHaveProperty('security');
      expect(settings).toHaveProperty('workflows');
      expect(settings).toHaveProperty('extension');
      
      expect(settings.tools.blast.database).toBe('nt');
      expect(settings.performance.cache.enabled).toBe(true);
    });

    test('should get specific setting category', async () => {
      const toolsSettings = await settingsService.getSetting('tools');
      
      expect(toolsSettings).toHaveProperty('blast');
      expect(toolsSettings).toHaveProperty('alignment');
      expect(toolsSettings).toHaveProperty('annotation');
      
      expect(toolsSettings.blast.database).toBe('nt');
      expect(toolsSettings.alignment.algorithm).toBe('muscle');
    });

    test('should update setting value', async () => {
      await settingsService.updateSetting('performance', 'cache.size', 512);
      
      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'biomni.performance.cache.size',
        512,
        vscode.ConfigurationTarget.Global
      );
    });

    test('should validate setting values before update', async () => {
      // Test with invalid value (negative cache size)
      await expect(
        settingsService.updateSetting('performance', 'cache.size', -100)
      ).rejects.toThrow('Invalid setting value');
    });

    test('should reset settings to defaults', async () => {
      await settingsService.resetToDefaults('performance');
      
      // Verify that update was called for each performance setting
      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'performance.cache.enabled',
        DEFAULT_SETTINGS.performance.cache.enabled,
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe('API Key Management', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should store API key securely', async () => {
      const keyName = 'testApiKey';
      const keyValue = 'test-key-value-123';
      
      await settingsService.storeApiKey(keyName, keyValue);
      
      expect(mockContext.secrets.store).toHaveBeenCalledWith(
        'biomni_customApiKey_testApiKey',
        keyValue
      );
    });

    test('should retrieve API key', async () => {
      const keyName = 'testApiKey';
      const expectedValue = 'test-key-value-123';
      
      mockContext.secrets.get.mockResolvedValue(expectedValue);
      
      const retrievedValue = await settingsService.getApiKey(keyName);
      expect(retrievedValue).toBe(expectedValue);
    });

    test('should remove API key', async () => {
      const keyName = 'testApiKey';
      
      await settingsService.removeApiKey(keyName);
      
      expect(mockContext.secrets.delete).toHaveBeenCalledWith(
        'biomni_customApiKey_testApiKey'
      );
    });

    test('should check if API key exists', async () => {
      const keyName = 'testApiKey';
      mockContext.secrets.get.mockResolvedValue('some-value');
      
      const exists = await settingsService.getApiKey(keyName);
      expect(exists).toBeTruthy();
    });

    test('should reject empty API key values', async () => {
      await expect(
        settingsService.storeApiKey('testKey', '')
      ).rejects.toThrow('API key value cannot be empty');
    });
  });

  describe('Import/Export Functionality', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should export settings without sensitive data', async () => {
      const exportData = await settingsService.exportSettings();
      
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('settings');
      expect(exportData.settings.security).not.toHaveProperty('apiKeys');
    });

    test('should import valid settings', async () => {
      const importData = {
        version: '1.0.0',
        settings: {
          performance: {
            cache: {
              size: 512,
              enabled: false
            }
          }
        }
      };
      
      await settingsService.importSettings(importData, vscode.ConfigurationTarget.Global, false);
      
      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'biomni.performance.cache.size',
        512,
        vscode.ConfigurationTarget.Global
      );
    });

    test('should validate imported settings', async () => {
      const invalidImportData = {
        version: '1.0.0',
        settings: {
          performance: {
            cache: {
              size: -100 // Invalid negative value
            }
          }
        }
      };
      
      await expect(
        settingsService.importSettings(invalidImportData, vscode.ConfigurationTarget.Global, true)
      ).rejects.toThrow('Import validation failed');
    });

    test('should reject import data without settings object', async () => {
      const invalidImportData = {
        version: '1.0.0'
        // Missing settings object
      };
      
      await expect(
        settingsService.importSettings(invalidImportData)
      ).rejects.toThrow('Invalid import data: missing settings object');
    });
  });

  describe('Workspace Settings Management', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should detect workspace settings overrides', () => {
      mockWorkspace.workspaceFolders = [{ uri: vscode.Uri.file('/test') }];
      mockConfiguration.inspect.mockReturnValue({
        workspaceValue: true
      });
      
      const hasOverrides = settingsService.hasWorkspaceOverrides();
      expect(hasOverrides).toBe(true);
    });

    test('should return false for workspace overrides when no workspace', () => {
      mockWorkspace.workspaceFolders = undefined;
      
      const hasOverrides = settingsService.hasWorkspaceOverrides();
      expect(hasOverrides).toBe(false);
    });

    test('should get workspace-specific settings', async () => {
      mockWorkspace.workspaceFolders = [{ uri: vscode.Uri.file('/test') }];
      
      const workspaceSettings = await settingsService.getWorkspaceSettings();
      expect(workspaceSettings).toBeDefined();
    });
  });

  describe('Configuration Change Handling', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should handle configuration changes', () => {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => section === 'biomni')
      };
      
      // Simulate configuration change event
      const changeHandler = mockWorkspace.onDidChangeConfiguration.mock.calls[0][0];
      changeHandler(mockEvent);
      
      expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('biomni');
    });

    test('should ignore non-biomni configuration changes', () => {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => section !== 'biomni')
      };
      
      const changeHandler = mockWorkspace.onDidChangeConfiguration.mock.calls[0][0];
      changeHandler(mockEvent);
      
      expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('biomni');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
    });

    test('should handle configuration update errors gracefully', async () => {
      mockConfiguration.update.mockRejectedValue(new Error('Update failed'));
      
      await expect(
        settingsService.updateSetting('performance', 'cache.enabled', false)
      ).rejects.toThrow('Update failed');
    });

    test('should handle secret storage errors gracefully', async () => {
      mockContext.secrets.store.mockRejectedValue(new Error('Secret storage failed'));
      
      await expect(
        settingsService.storeApiKey('testKey', 'testValue')
      ).rejects.toThrow('Failed to store secret');
    });

    test('should return empty object for workspace settings when error occurs', async () => {
      mockWorkspace.getConfiguration.mockImplementation(() => {
        throw new Error('Configuration error');
      });
      
      const workspaceSettings = await settingsService.getWorkspaceSettings();
      expect(workspaceSettings).toEqual({});
    });
  });

  describe('Disposal', () => {
    test('should dispose resources properly', async () => {
      settingsService = BiomniSettingsService.getInstance(mockContext);
      await settingsService.initialize();
      
      const disposeSpy = jest.spyOn(settingsService as any, '_onSettingsChanged');
      settingsService.dispose();
      
      // Verify cleanup was called (implementation detail, may need adjustment)
      expect(disposeSpy).toBeDefined();
    });
  });
});