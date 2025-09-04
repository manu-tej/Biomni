/**
 * Settings Validator for Biomni VSCode Extension
 * Validates settings values against schema and provides helpful error messages
 */

import { BiomniSettings, SETTINGS_SCHEMA, DEFAULT_SETTINGS } from './schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

export class SettingsValidator {
  /**
   * Validate complete settings object
   */
  public validateSettings(settings: Partial<BiomniSettings>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate each category
      for (const [category, categorySettings] of Object.entries(settings)) {
        if (categorySettings && typeof categorySettings === 'object') {
          const categoryResult = this.validateCategory(category as keyof BiomniSettings, categorySettings);
          errors.push(...categoryResult.errors);
          warnings.push(...categoryResult.warnings);
        }
      }

      // Check for missing required categories
      const requiredCategories = ['extension'] as const;
      for (const requiredCategory of requiredCategories) {
        if (!settings[requiredCategory]) {
          warnings.push(`Missing configuration category: ${requiredCategory}`);
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a specific setting value
   */
  public validateSettingValue(
    category: keyof BiomniSettings, 
    key: string, 
    value: any
  ): FieldValidationResult {
    try {
      // Get the expected type and constraints from schema
      const categorySchema = (SETTINGS_SCHEMA.properties as any)[category];
      if (!categorySchema) {
        return {
          isValid: false,
          error: `Unknown settings category: ${category}`
        };
      }

      // Navigate to the specific field schema
      const fieldSchema = this.getFieldSchema(categorySchema, key);
      if (!fieldSchema) {
        return {
          isValid: false,
          error: `Unknown setting key: ${category}.${key}`
        };
      }

      // Perform type and constraint validation
      return this.validateAgainstSchema(value, fieldSchema, `${category}.${key}`);

    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate a category of settings
   */
  private validateCategory(category: keyof BiomniSettings, settings: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const categorySchema = (SETTINGS_SCHEMA.properties as any)[category];
    if (!categorySchema) {
      errors.push(`Unknown settings category: ${category}`);
      return { isValid: false, errors, warnings };
    }

    // Validate each setting in the category
    for (const [key, value] of Object.entries(settings)) {
      const result = this.validateSettingValue(category, key, value);
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a value against a schema definition
   */
  private validateAgainstSchema(value: any, schema: any, fieldPath: string): FieldValidationResult {
    // Type validation
    if (schema.type) {
      const typeResult = this.validateType(value, schema.type, fieldPath);
      if (!typeResult.isValid) {
        return typeResult;
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return {
        isValid: false,
        error: `${fieldPath} must be one of: ${schema.enum.join(', ')}`,
        suggestion: `Valid options: ${schema.enum.join(', ')}`
      };
    }

    // Numeric constraints
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        return {
          isValid: false,
          error: `${fieldPath} must be at least ${schema.minimum}`,
          suggestion: `Minimum value: ${schema.minimum}`
        };
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        return {
          isValid: false,
          error: `${fieldPath} must be at most ${schema.maximum}`,
          suggestion: `Maximum value: ${schema.maximum}`
        };
      }
    }

    // String constraints
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return {
          isValid: false,
          error: `${fieldPath} must be at least ${schema.minLength} characters long`
        };
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        return {
          isValid: false,
          error: `${fieldPath} must be at most ${schema.maxLength} characters long`
        };
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            error: `${fieldPath} does not match required pattern`
          };
        }
      }
    }

    // Array constraints
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        return {
          isValid: false,
          error: `${fieldPath} must have at least ${schema.minItems} items`
        };
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        return {
          isValid: false,
          error: `${fieldPath} must have at most ${schema.maxItems} items`
        };
      }
    }

    // Custom validations for specific fields
    const customResult = this.performCustomValidation(fieldPath, value);
    if (!customResult.isValid) {
      return customResult;
    }

    return { isValid: true };
  }

  /**
   * Validate value type
   */
  private validateType(value: any, expectedType: string, fieldPath: string): FieldValidationResult {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'array' && !Array.isArray(value)) {
      return {
        isValid: false,
        error: `${fieldPath} must be an array`
      };
    }

    if (expectedType !== 'array' && actualType !== expectedType) {
      return {
        isValid: false,
        error: `${fieldPath} must be of type ${expectedType}, got ${actualType}`
      };
    }

    return { isValid: true };
  }

  /**
   * Perform custom validation for specific field types
   */
  private performCustomValidation(fieldPath: string, value: any): FieldValidationResult {
    // URL validation
    if (fieldPath.includes('Url') || fieldPath.includes('url')) {
      if (typeof value === 'string' && value.length > 0) {
        try {
          new URL(value);
        } catch {
          return {
            isValid: false,
            error: `${fieldPath} must be a valid URL`,
            suggestion: 'Use format: http://example.com or https://example.com'
          };
        }
      }
    }

    // Email validation
    if (fieldPath.includes('email') || fieldPath.includes('Email')) {
      if (typeof value === 'string' && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            isValid: false,
            error: `${fieldPath} must be a valid email address`
          };
        }
      }
    }

    // Path validation
    if (fieldPath.includes('path') || fieldPath.includes('Path')) {
      if (typeof value === 'string' && value.length > 0) {
        // Basic path validation (could be enhanced)
        if (value.includes('..') || value.includes('//')) {
          return {
            isValid: false,
            error: `${fieldPath} contains invalid path characters`,
            warning: 'Avoid using ".." or "//" in paths'
          };
        }
      }
    }

    // Memory size validation (MB values)
    if (fieldPath.includes('size') || fieldPath.includes('Size') || fieldPath.includes('memory') || fieldPath.includes('Memory')) {
      if (typeof value === 'number') {
        if (value <= 0) {
          return {
            isValid: false,
            error: `${fieldPath} must be a positive number`
          };
        }
        if (value > 16384) { // 16GB
          return {
            isValid: true,
            warning: `${fieldPath} is set to a very high value (${value}MB), which may cause performance issues`
          };
        }
      }
    }

    // Timeout validation (seconds)
    if (fieldPath.includes('timeout') || fieldPath.includes('Timeout')) {
      if (typeof value === 'number') {
        if (value <= 0) {
          return {
            isValid: false,
            error: `${fieldPath} must be a positive number`
          };
        }
        if (value > 3600) { // 1 hour
          return {
            isValid: true,
            warning: `${fieldPath} is set to a very high value (${value} seconds)`
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Get field schema by navigating the nested schema structure
   */
  private getFieldSchema(categorySchema: any, key: string): any {
    const keyParts = key.split('.');
    let schema = categorySchema.properties;

    for (const part of keyParts) {
      if (schema && schema[part]) {
        schema = schema[part];
        if (schema.properties) {
          schema = schema.properties;
        }
      } else {
        return undefined;
      }
    }

    return schema;
  }

  /**
   * Get helpful suggestions for invalid values
   */
  public getSuggestions(category: keyof BiomniSettings, key: string): string[] {
    const suggestions: string[] = [];
    
    // Get default value
    const defaultValue = this.getDefaultValue(category, key);
    if (defaultValue !== undefined) {
      suggestions.push(`Default value: ${JSON.stringify(defaultValue)}`);
    }

    // Get enum options if available
    const categorySchema = (SETTINGS_SCHEMA.properties as any)[category];
    const fieldSchema = this.getFieldSchema(categorySchema, key);
    
    if (fieldSchema?.enum) {
      suggestions.push(`Valid options: ${fieldSchema.enum.join(', ')}`);
    }

    if (fieldSchema?.minimum !== undefined || fieldSchema?.maximum !== undefined) {
      const min = fieldSchema.minimum ?? 'no limit';
      const max = fieldSchema.maximum ?? 'no limit';
      suggestions.push(`Range: ${min} to ${max}`);
    }

    return suggestions;
  }

  /**
   * Get default value for a setting
   */
  private getDefaultValue(category: keyof BiomniSettings, key: string): any {
    const keyParts = key.split('.');
    let value: any = DEFAULT_SETTINGS[category];

    for (const part of keyParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}