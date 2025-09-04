/**
 * Tests for SecretStorageManager
 */

import * as vscode from 'vscode';
import { SecretStorageManager } from '../../src/security/secrets';

// Mock VSCode Secret Storage
const mockSecretStorage = {
  store: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

const mockContext = {
  secrets: mockSecretStorage,
  extensionUri: vscode.Uri.file('/test'),
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
} as any;

describe('SecretStorageManager', () => {
  let secretManager: SecretStorageManager;

  beforeEach(() => {
    jest.clearAllMocks();
    secretManager = new SecretStorageManager(mockContext);
  });

  describe('storeSecret', () => {
    test('should store secret successfully', async () => {
      const keyName = 'testApiKey';
      const value = 'secret-value-123';
      
      mockSecretStorage.store.mockResolvedValue(undefined);
      mockSecretStorage.get.mockResolvedValue('{}');
      
      await secretManager.storeSecret(keyName, value);
      
      expect(mockSecretStorage.store).toHaveBeenCalledWith('biomni_testApiKey', value);
    });

    test('should store secret with description', async () => {
      const keyName = 'testApiKey';
      const value = 'secret-value-123';
      const description = 'Test API key for development';
      
      mockSecretStorage.store.mockResolvedValue(undefined);
      mockSecretStorage.get.mockResolvedValue('{}');
      
      await secretManager.storeSecret(keyName, value, description);
      
      expect(mockSecretStorage.store).toHaveBeenCalledWith('biomni_testApiKey', value);
      expect(mockSecretStorage.store).toHaveBeenCalledWith(
        'biomni_secret_metadata',
        expect.stringContaining(description)
      );
    });

    test('should reject empty key name', async () => {
      await expect(
        secretManager.storeSecret('', 'value')
      ).rejects.toThrow('Key name and value are required');
    });

    test('should reject empty value', async () => {
      await expect(
        secretManager.storeSecret('key', '')
      ).rejects.toThrow('Key name and value are required');
    });

    test('should reject invalid key name format', async () => {
      await expect(
        secretManager.storeSecret('invalid key!', 'value')
      ).rejects.toThrow('Invalid key name');
    });

    test('should handle storage errors', async () => {
      mockSecretStorage.store.mockRejectedValue(new Error('Storage failed'));
      
      await expect(
        secretManager.storeSecret('testKey', 'value')
      ).rejects.toThrow('Failed to store secret');
    });
  });

  describe('getSecret', () => {
    test('should retrieve secret successfully', async () => {
      const keyName = 'testApiKey';
      const expectedValue = 'secret-value-123';
      
      mockSecretStorage.get.mockResolvedValue(expectedValue);
      
      const result = await secretManager.getSecret(keyName);
      
      expect(result).toBe(expectedValue);
      expect(mockSecretStorage.get).toHaveBeenCalledWith('biomni_testApiKey');
    });

    test('should return undefined for non-existent secret', async () => {
      mockSecretStorage.get.mockResolvedValue(undefined);
      
      const result = await secretManager.getSecret('nonExistentKey');
      
      expect(result).toBeUndefined();
    });

    test('should handle retrieval errors gracefully', async () => {
      mockSecretStorage.get.mockRejectedValue(new Error('Retrieval failed'));
      
      const result = await secretManager.getSecret('testKey');
      
      expect(result).toBeUndefined();
    });

    test('should reject empty key name', async () => {
      await expect(
        secretManager.getSecret('')
      ).rejects.toThrow('Key name is required');
    });
  });

  describe('hasSecret', () => {
    test('should return true for existing secret', async () => {
      mockSecretStorage.get.mockResolvedValue('some-value');
      
      const result = await secretManager.hasSecret('testKey');
      
      expect(result).toBe(true);
    });

    test('should return false for non-existent secret', async () => {
      mockSecretStorage.get.mockResolvedValue(undefined);
      
      const result = await secretManager.hasSecret('testKey');
      
      expect(result).toBe(false);
    });

    test('should return false for empty secret value', async () => {
      mockSecretStorage.get.mockResolvedValue('');
      
      const result = await secretManager.hasSecret('testKey');
      
      expect(result).toBe(false);
    });
  });

  describe('deleteSecret', () => {
    test('should delete secret successfully', async () => {
      mockSecretStorage.delete.mockResolvedValue(undefined);
      mockSecretStorage.get.mockResolvedValue('{"testKey": {"keyName": "testKey"}}');
      
      await secretManager.deleteSecret('testKey');
      
      expect(mockSecretStorage.delete).toHaveBeenCalledWith('biomni_testKey');
    });

    test('should handle deletion errors', async () => {
      mockSecretStorage.delete.mockRejectedValue(new Error('Deletion failed'));
      
      await expect(
        secretManager.deleteSecret('testKey')
      ).rejects.toThrow('Failed to delete secret');
    });

    test('should reject empty key name', async () => {
      await expect(
        secretManager.deleteSecret('')
      ).rejects.toThrow('Key name is required');
    });
  });

  describe('listSecrets', () => {
    test('should list all secrets', async () => {
      const metadata = {
        'key1': { keyName: 'key1', createdAt: '2023-01-01' },
        'key2': { keyName: 'key2', createdAt: '2023-01-02' }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      
      const result = await secretManager.listSecrets();
      
      expect(result).toEqual(['key1', 'key2']);
    });

    test('should list secrets with prefix filter', async () => {
      const metadata = {
        'apiKey1': { keyName: 'apiKey1', createdAt: '2023-01-01' },
        'apiKey2': { keyName: 'apiKey2', createdAt: '2023-01-02' },
        'otherKey': { keyName: 'otherKey', createdAt: '2023-01-03' }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      
      const result = await secretManager.listSecrets('apiKey');
      
      expect(result).toEqual(['apiKey1', 'apiKey2']);
    });

    test('should return empty array when metadata is corrupted', async () => {
      mockSecretStorage.get.mockResolvedValue('invalid-json');
      
      const result = await secretManager.listSecrets();
      
      expect(result).toEqual([]);
    });

    test('should handle metadata retrieval errors', async () => {
      mockSecretStorage.get.mockRejectedValue(new Error('Metadata error'));
      
      const result = await secretManager.listSecrets();
      
      expect(result).toEqual([]);
    });
  });

  describe('getSecretMetadata', () => {
    test('should return metadata for existing secret', async () => {
      const metadata = {
        'testKey': {
          keyName: 'testKey',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          description: 'Test key'
        }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      
      const result = await secretManager.getSecretMetadata('testKey');
      
      expect(result).toEqual(metadata.testKey);
    });

    test('should return undefined for non-existent secret metadata', async () => {
      mockSecretStorage.get.mockResolvedValue('{}');
      
      const result = await secretManager.getSecretMetadata('nonExistentKey');
      
      expect(result).toBeUndefined();
    });
  });

  describe('updateSecretDescription', () => {
    test('should update description for existing secret', async () => {
      const keyName = 'testKey';
      const newDescription = 'Updated description';
      
      mockSecretStorage.get.mockImplementation((key) => {
        if (key === 'biomni_testKey') return Promise.resolve('existing-value');
        if (key === 'biomni_secret_metadata') return Promise.resolve('{"testKey": {"keyName": "testKey"}}');
        return Promise.resolve(undefined);
      });
      
      await secretManager.updateSecretDescription(keyName, newDescription);
      
      expect(mockSecretStorage.store).toHaveBeenCalledWith(
        'biomni_secret_metadata',
        expect.stringContaining(newDescription)
      );
    });

    test('should reject update for non-existent secret', async () => {
      mockSecretStorage.get.mockResolvedValue(undefined);
      
      await expect(
        secretManager.updateSecretDescription('nonExistentKey', 'description')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('exportMetadata', () => {
    test('should export metadata successfully', async () => {
      const metadata = {
        'key1': { keyName: 'key1', createdAt: '2023-01-01' },
        'key2': { keyName: 'key2', createdAt: '2023-01-02' }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      
      const result = await secretManager.exportMetadata();
      
      expect(result).toEqual(metadata);
    });

    test('should return empty object when no metadata exists', async () => {
      mockSecretStorage.get.mockResolvedValue(undefined);
      
      const result = await secretManager.exportMetadata();
      
      expect(result).toEqual({});
    });
  });

  describe('clearAllSecrets', () => {
    test('should clear all secrets successfully', async () => {
      const metadata = {
        'key1': { keyName: 'key1' },
        'key2': { keyName: 'key2' }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      mockSecretStorage.delete.mockResolvedValue(undefined);
      
      await secretManager.clearAllSecrets();
      
      expect(mockSecretStorage.delete).toHaveBeenCalledWith('biomni_key1');
      expect(mockSecretStorage.delete).toHaveBeenCalledWith('biomni_key2');
      expect(mockSecretStorage.delete).toHaveBeenCalledWith('biomni_secret_metadata');
    });

    test('should handle partial failures during clear operation', async () => {
      const metadata = {
        'key1': { keyName: 'key1' },
        'key2': { keyName: 'key2' }
      };
      
      mockSecretStorage.get.mockResolvedValue(JSON.stringify(metadata));
      mockSecretStorage.delete.mockImplementation((key) => {
        if (key === 'biomni_key1') return Promise.reject(new Error('Delete failed'));
        return Promise.resolve(undefined);
      });
      
      // Should not throw, just log warnings
      await expect(secretManager.clearAllSecrets()).resolves.not.toThrow();
    });
  });

  describe('validateApiKey', () => {
    test('should validate API key format', () => {
      // Valid key
      let result = secretManager.validateApiKey('valid-key-123456789');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Empty key
      result = secretManager.validateApiKey('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key cannot be empty');

      // Too short
      result = secretManager.validateApiKey('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key appears to be too short');

      // Contains spaces
      result = secretManager.validateApiKey('key with spaces');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key should not contain spaces');
    });

    test('should validate NCBI API key format', () => {
      // Valid NCBI key format (UUID-like)
      let result = secretManager.validateApiKey('550e8400-e29b-41d4-a716-446655440000', 'ncbi');
      expect(result.isValid).toBe(true);

      // Valid NCBI key format (alphanumeric)
      result = secretManager.validateApiKey('abcdefghijklmnopqrstuvwxyz123456', 'ncbi');
      expect(result.isValid).toBe(true);

      // Invalid NCBI format
      result = secretManager.validateApiKey('invalid-ncbi-key', 'ncbi');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NCBI API key format appears invalid');
    });

    test('should validate UniProt API key format', () => {
      // Valid UniProt key (32 alphanumeric characters)
      let result = secretManager.validateApiKey('abcdefghijklmnopqrstuvwxyz123456', 'uniprot');
      expect(result.isValid).toBe(true);

      // Invalid UniProt format
      result = secretManager.validateApiKey('too-short', 'uniprot');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('UniProt API key should be 32 alphanumeric characters');
    });
  });

  describe('generateTestKey', () => {
    test('should generate test key with default length', () => {
      const key = secretManager.generateTestKey();
      
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex characters
    });

    test('should generate test key with custom length', () => {
      const key = secretManager.generateTestKey(16);
      
      expect(typeof key).toBe('string');
      expect(key.length).toBe(32); // 16 bytes = 32 hex characters
    });

    test('should generate different keys on each call', () => {
      const key1 = secretManager.generateTestKey();
      const key2 = secretManager.generateTestKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle corrupt metadata gracefully', async () => {
      mockSecretStorage.get.mockResolvedValue('not-valid-json');
      
      const result = await secretManager.listSecrets();
      expect(result).toEqual([]);
    });

    test('should handle key names at boundary lengths', async () => {
      // Minimum length (2 characters)
      await expect(
        secretManager.storeSecret('ab', 'value')
      ).resolves.not.toThrow();

      // Maximum length (64 characters)
      const longKey = 'a'.repeat(64);
      await expect(
        secretManager.storeSecret(longKey, 'value')
      ).resolves.not.toThrow();

      // Too short (1 character)
      await expect(
        secretManager.storeSecret('a', 'value')
      ).rejects.toThrow('Invalid key name');

      // Too long (65 characters)
      const tooLongKey = 'a'.repeat(65);
      await expect(
        secretManager.storeSecret(tooLongKey, 'value')
      ).rejects.toThrow('Invalid key name');
    });

    test('should handle special characters in key names', async () => {
      // Valid characters
      await expect(
        secretManager.storeSecret('valid_key-123', 'value')
      ).resolves.not.toThrow();

      // Invalid characters
      await expect(
        secretManager.storeSecret('invalid key!', 'value')
      ).rejects.toThrow('Invalid key name');
    });
  });
});