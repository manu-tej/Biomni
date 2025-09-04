/**
 * Tests for SettingsValidator
 */

import { SettingsValidator } from '../../src/settings/validator';
import { BiomniSettings } from '../../src/settings/schema';

describe('SettingsValidator', () => {
  let validator: SettingsValidator;

  beforeEach(() => {
    validator = new SettingsValidator();
  });

  describe('validateSettings', () => {
    test('should validate valid settings object', () => {
      const validSettings: Partial<BiomniSettings> = {
        tools: {
          blast: {
            database: 'nt',
            eValue: 0.01,
            maxTargetSequences: 500,
            wordSize: 11,
            customOptions: ''
          },
          alignment: {
            algorithm: 'muscle',
            format: 'clustal',
            gapOpenPenalty: -10,
            gapExtensionPenalty: -1
          },
          annotation: {
            defaultDatabases: ['uniprot', 'go'],
            includeGeneOntology: true,
            includePathways: true,
            customAnnotationSources: []
          }
        },
        performance: {
          cache: {
            enabled: true,
            size: 256,
            ttl: 3600,
            maxFiles: 1000
          },
          processing: {
            maxConcurrentJobs: 4,
            timeoutDuration: 300,
            enableParallelProcessing: true,
            chunkSize: 1000
          },
          memory: {
            maxMemoryUsage: 512,
            enableGarbageCollection: true,
            gcThreshold: 256
          }
        }
      };

      const result = validator.validateSettings(validSettings);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid enum values', () => {
      const invalidSettings: Partial<BiomniSettings> = {
        tools: {
          blast: {
            database: 'invalid_db' as any, // Invalid enum value
            eValue: 0.01,
            maxTargetSequences: 500,
            wordSize: 11,
            customOptions: ''
          },
          alignment: {
            algorithm: 'invalid_algorithm' as any, // Invalid enum value
            format: 'clustal',
            gapOpenPenalty: -10,
            gapExtensionPenalty: -1
          },
          annotation: {
            defaultDatabases: [],
            includeGeneOntology: true,
            includePathways: true,
            customAnnotationSources: []
          }
        }
      };

      const result = validator.validateSettings(invalidSettings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('must be one of'))).toBe(true);
    });

    test('should detect out-of-range numeric values', () => {
      const invalidSettings: Partial<BiomniSettings> = {
        performance: {
          cache: {
            enabled: true,
            size: -100, // Invalid negative value
            ttl: 100, // Below minimum
            maxFiles: 1000000 // Above maximum
          },
          processing: {
            maxConcurrentJobs: 0, // Below minimum
            timeoutDuration: 10, // Below minimum
            enableParallelProcessing: true,
            chunkSize: 50 // Below minimum
          },
          memory: {
            maxMemoryUsage: 10, // Below minimum
            enableGarbageCollection: true,
            gcThreshold: 10 // Below minimum
          }
        }
      };

      const result = validator.validateSettings(invalidSettings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('must be at least'))).toBe(true);
      expect(result.errors.some(error => error.includes('must be at most'))).toBe(true);
    });

    test('should detect invalid data types', () => {
      const invalidSettings: any = {
        performance: {
          cache: {
            enabled: 'true', // Should be boolean
            size: '256', // Should be number
            ttl: 'forever', // Should be number
            maxFiles: true // Should be number
          }
        },
        display: {
          ui: {
            fontSize: 'large' // Should be number
          }
        }
      };

      const result = validator.validateSettings(invalidSettings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('must be of type'))).toBe(true);
    });
  });

  describe('validateSettingValue', () => {
    test('should validate individual setting values', () => {
      const result = validator.validateSettingValue('tools', 'blast.database', 'nr');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject unknown setting categories', () => {
      const result = validator.validateSettingValue('unknownCategory' as any, 'test', 'value');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown settings category');
    });

    test('should reject unknown setting keys', () => {
      const result = validator.validateSettingValue('tools', 'unknownKey', 'value');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown setting key');
    });

    test('should validate numeric constraints', () => {
      // Valid range
      let result = validator.validateSettingValue('performance', 'cache.size', 512);
      expect(result.isValid).toBe(true);

      // Below minimum
      result = validator.validateSettingValue('performance', 'cache.size', 5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be at least');

      // Above maximum
      result = validator.validateSettingValue('performance', 'cache.size', 20000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be at most');
    });

    test('should validate boolean values', () => {
      // Valid boolean
      let result = validator.validateSettingValue('performance', 'cache.enabled', true);
      expect(result.isValid).toBe(true);

      // Invalid type
      result = validator.validateSettingValue('performance', 'cache.enabled', 'yes');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be of type boolean');
    });

    test('should validate enum constraints', () => {
      // Valid enum value
      let result = validator.validateSettingValue('tools', 'blast.database', 'nt');
      expect(result.isValid).toBe(true);

      // Invalid enum value
      result = validator.validateSettingValue('tools', 'blast.database', 'invalid_db');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be one of');
      expect(result.suggestion).toContain('Valid options:');
    });
  });

  describe('Custom validation', () => {
    test('should validate URL format', () => {
      // Valid URL
      let result = validator.validateSettingValue('extension', 'core.mcpServerUrl', 'http://localhost:8080');
      expect(result.isValid).toBe(true);

      // Invalid URL
      result = validator.validateSettingValue('extension', 'core.mcpServerUrl', 'not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a valid URL');
    });

    test('should warn about high memory values', () => {
      const result = validator.validateSettingValue('performance', 'memory.maxMemoryUsage', 20000);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('very high value');
    });

    test('should warn about high timeout values', () => {
      const result = validator.validateSettingValue('performance', 'processing.timeoutDuration', 5000);
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('very high value');
    });

    test('should validate positive numbers for memory/size settings', () => {
      const result = validator.validateSettingValue('performance', 'cache.size', -10);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a positive number');
    });

    test('should detect invalid path characters', () => {
      const result = validator.validateSettingValue('security', 'external.proxyUrl', 'http://example.com/../malicious');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid path characters');
    });
  });

  describe('getSuggestions', () => {
    test('should provide default value suggestions', () => {
      const suggestions = validator.getSuggestions('performance', 'cache.size');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Default value:'))).toBe(true);
    });

    test('should provide enum options as suggestions', () => {
      const suggestions = validator.getSuggestions('tools', 'blast.database');
      
      expect(suggestions.some(s => s.includes('Valid options:'))).toBe(true);
    });

    test('should provide range information for numeric settings', () => {
      const suggestions = validator.getSuggestions('performance', 'cache.size');
      
      expect(suggestions.some(s => s.includes('Range:'))).toBe(true);
    });

    test('should return empty array for unknown settings', () => {
      const suggestions = validator.getSuggestions('unknown' as any, 'unknown.key');
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    test('should handle null and undefined values', () => {
      let result = validator.validateSettingValue('performance', 'cache.enabled', null);
      expect(result.isValid).toBe(false);

      result = validator.validateSettingValue('performance', 'cache.enabled', undefined);
      expect(result.isValid).toBe(false);
    });

    test('should handle empty strings', () => {
      const result = validator.validateSettingValue('tools', 'blast.customOptions', '');
      expect(result.isValid).toBe(true); // Empty string is valid for custom options
    });

    test('should handle arrays', () => {
      // Valid array
      let result = validator.validateSettingValue('tools', 'annotation.defaultDatabases', ['uniprot', 'go']);
      expect(result.isValid).toBe(true);

      // Invalid array (wrong type)
      result = validator.validateSettingValue('tools', 'annotation.defaultDatabases', 'not-array');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be an array');
    });

    test('should handle nested object validation', () => {
      const nestedSettings = {
        performance: {
          cache: {
            enabled: 'not-a-boolean', // Invalid type
            size: 256
          }
        }
      };

      const result = validator.validateSettings(nestedSettings);
      expect(result.isValid).toBe(false);
    });

    test('should handle validation errors gracefully', () => {
      // Test with malformed data that might cause validation errors
      const malformedSettings = {
        performance: {
          cache: {
            // Intentionally malformed nested structure
            size: {
              nested: 'invalid'
            }
          }
        }
      };

      const result = validator.validateSettings(malformedSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});