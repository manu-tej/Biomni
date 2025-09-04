/**
 * Secure Storage Manager for Biomni VSCode Extension
 * Uses VSCode's SecretStorage API for secure API key management
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';

export interface SecretMetadata {
  keyName: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export class SecretStorageManager {
  private readonly secretStorage: vscode.SecretStorage;
  private readonly metadataKey = 'biomni_secret_metadata';

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * Store a secret securely
   */
  public async storeSecret(keyName: string, value: string, description?: string): Promise<void> {
    if (!keyName || !value) {
      throw new Error('Key name and value are required');
    }

    // Validate key name format
    if (!this.isValidKeyName(keyName)) {
      throw new Error('Invalid key name. Must contain only alphanumeric characters, underscores, and hyphens.');
    }

    try {
      // Store the secret
      await this.secretStorage.store(this.getSecretKey(keyName), value);

      // Update metadata
      await this.updateSecretMetadata(keyName, description);

      console.log(`Secret stored successfully: ${keyName}`);
    } catch (error) {
      console.error(`Failed to store secret ${keyName}:`, error);
      throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a secret
   */
  public async getSecret(keyName: string): Promise<string | undefined> {
    if (!keyName) {
      throw new Error('Key name is required');
    }

    try {
      const secretKey = this.getSecretKey(keyName);
      return await this.secretStorage.get(secretKey);
    } catch (error) {
      console.error(`Failed to retrieve secret ${keyName}:`, error);
      return undefined;
    }
  }

  /**
   * Check if a secret exists
   */
  public async hasSecret(keyName: string): Promise<boolean> {
    const value = await this.getSecret(keyName);
    return value !== undefined && value.length > 0;
  }

  /**
   * Delete a secret
   */
  public async deleteSecret(keyName: string): Promise<void> {
    if (!keyName) {
      throw new Error('Key name is required');
    }

    try {
      const secretKey = this.getSecretKey(keyName);
      await this.secretStorage.delete(secretKey);

      // Remove from metadata
      await this.removeSecretMetadata(keyName);

      console.log(`Secret deleted successfully: ${keyName}`);
    } catch (error) {
      console.error(`Failed to delete secret ${keyName}:`, error);
      throw new Error(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all stored secrets (returns key names only)
   */
  public async listSecrets(prefix?: string): Promise<string[]> {
    try {
      const metadata = await this.getSecretsMetadata();
      const keyNames = Object.keys(metadata);
      
      if (prefix) {
        return keyNames.filter(name => name.startsWith(prefix));
      }
      
      return keyNames;
    } catch (error) {
      console.error('Failed to list secrets:', error);
      return [];
    }
  }

  /**
   * Get metadata for a specific secret
   */
  public async getSecretMetadata(keyName: string): Promise<SecretMetadata | undefined> {
    try {
      const allMetadata = await this.getSecretsMetadata();
      return allMetadata[keyName];
    } catch (error) {
      console.error(`Failed to get metadata for secret ${keyName}:`, error);
      return undefined;
    }
  }

  /**
   * Update secret without changing the value (useful for updating description)
   */
  public async updateSecretDescription(keyName: string, description: string): Promise<void> {
    const exists = await this.hasSecret(keyName);
    if (!exists) {
      throw new Error(`Secret ${keyName} does not exist`);
    }

    await this.updateSecretMetadata(keyName, description, false);
  }

  /**
   * Export secrets metadata for backup (does not include actual secret values)
   */
  public async exportMetadata(): Promise<Record<string, SecretMetadata>> {
    return await this.getSecretsMetadata();
  }

  /**
   * Clear all secrets (use with caution)
   */
  public async clearAllSecrets(): Promise<void> {
    const secretNames = await this.listSecrets();
    
    for (const secretName of secretNames) {
      try {
        await this.deleteSecret(secretName);
      } catch (error) {
        console.warn(`Failed to delete secret ${secretName} during clear operation:`, error);
      }
    }

    // Clear metadata
    try {
      await this.secretStorage.delete(this.metadataKey);
    } catch (error) {
      console.warn('Failed to clear secrets metadata:', error);
    }

    console.log('All secrets cleared');
  }

  /**
   * Validate API key format (basic validation)
   */
  public validateApiKey(keyValue: string, keyType?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!keyValue || keyValue.trim().length === 0) {
      errors.push('API key cannot be empty');
    }

    if (keyValue.length < 8) {
      errors.push('API key appears to be too short');
    }

    if (keyValue.includes(' ')) {
      errors.push('API key should not contain spaces');
    }

    // Type-specific validation
    if (keyType) {
      switch (keyType.toLowerCase()) {
        case 'ncbi':
          if (!/^[a-fA-F0-9]{36}$/.test(keyValue) && !/^[a-zA-Z0-9_-]{20,}$/.test(keyValue)) {
            errors.push('NCBI API key format appears invalid');
          }
          break;
        case 'uniprot':
          if (!/^[a-zA-Z0-9]{32}$/.test(keyValue)) {
            errors.push('UniProt API key should be 32 alphanumeric characters');
          }
          break;
        // Add more type-specific validations as needed
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure random key for testing purposes
   */
  public generateTestKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get the internal secret key used for storage
   */
  private getSecretKey(keyName: string): string {
    return `biomni_${keyName}`;
  }

  /**
   * Validate key name format
   */
  private isValidKeyName(keyName: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(keyName) && keyName.length >= 2 && keyName.length <= 64;
  }

  /**
   * Get all secrets metadata
   */
  private async getSecretsMetadata(): Promise<Record<string, SecretMetadata>> {
    try {
      const metadataJson = await this.secretStorage.get(this.metadataKey);
      return metadataJson ? JSON.parse(metadataJson) : {};
    } catch (error) {
      console.warn('Failed to parse secrets metadata, returning empty object:', error);
      return {};
    }
  }

  /**
   * Update metadata for a secret
   */
  private async updateSecretMetadata(keyName: string, description?: string, isNew: boolean = true): Promise<void> {
    try {
      const metadata = await this.getSecretsMetadata();
      const now = new Date().toISOString();
      
      if (isNew || !metadata[keyName]) {
        const newMetadata: SecretMetadata = {
          keyName,
          createdAt: now,
          updatedAt: now
        };
        if (description !== undefined) {
          newMetadata.description = description;
        }
        metadata[keyName] = newMetadata;
      } else {
        metadata[keyName] = {
          ...metadata[keyName],
          updatedAt: now,
          ...(description !== undefined && { description })
        };
      }

      await this.secretStorage.store(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn(`Failed to update metadata for secret ${keyName}:`, error);
      // Don't throw here as the secret itself was stored successfully
    }
  }

  /**
   * Remove metadata for a secret
   */
  private async removeSecretMetadata(keyName: string): Promise<void> {
    try {
      const metadata = await this.getSecretsMetadata();
      delete metadata[keyName];
      await this.secretStorage.store(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn(`Failed to remove metadata for secret ${keyName}:`, error);
    }
  }

  /**
   * Dispose of the secret storage manager
   */
  public dispose(): void {
    // VSCode's SecretStorage doesn't need explicit disposal
    // This method is here for consistency with other services
  }
}