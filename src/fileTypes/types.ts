/**
 * Type definitions for biological file format detection and handling
 */

export interface BioFileFormat {
  /** Human-readable name of the format */
  name: string;
  /** File extensions associated with this format */
  extensions: string[];
  /** Regular expressions to match file content */
  contentPatterns: RegExp[];
  /** MIME type if available */
  mimeType?: string;
  /** Description of the format */
  description: string;
  /** Associated tools/commands for this format */
  tools: string[];
  /** Validation function name */
  validator?: string;
  /** Syntax highlighter identifier */
  highlighter?: string;
  /** Whether this format supports compression */
  supportsCompression: boolean;
  /** Typical file size range */
  sizeRange: 'small' | 'medium' | 'large' | 'variable';
  /** Performance optimization hints */
  optimizationHints: {
    /** Use streaming for large files */
    useStreaming: boolean;
    /** Sample size for content detection */
    sampleSize: number;
    /** Cache detection results */
    cacheable: boolean;
  };
}

export interface FileDetectionResult {
  /** Detected format */
  format: BioFileFormat;
  /** Confidence level (0-1) */
  confidence: number;
  /** Detection method used */
  detectionMethod: 'extension' | 'content' | 'hybrid';
  /** Any validation errors found */
  validationErrors?: string[];
  /** File statistics */
  stats?: {
    size: number;
    lineCount?: number;
    encoding?: string;
  };
}

export interface FileValidationResult {
  /** Whether the file is valid */
  isValid: boolean;
  /** List of errors found */
  errors: ValidationError[];
  /** List of warnings */
  warnings: ValidationWarning[];
  /** File statistics */
  stats: {
    lineCount: number;
    recordCount?: number;
    encoding: string;
  };
}

export interface ValidationError {
  /** Line number where error occurred */
  line: number;
  /** Column number if applicable */
  column?: number;
  /** Error message */
  message: string;
  /** Error code for categorization */
  code: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  /** Line number where warning occurred */
  line: number;
  /** Column number if applicable */
  column?: number;
  /** Warning message */
  message: string;
  /** Warning code for categorization */
  code: string;
}

export interface SmartSuggestion {
  /** Suggestion title */
  title: string;
  /** Detailed description */
  description: string;
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: any[];
  /** Icon to display */
  icon?: string;
  /** Priority for ordering */
  priority: number;
}

export interface ContextMenuContribution {
  /** Menu item title */
  title: string;
  /** Command to execute */
  command: string;
  /** File formats this applies to */
  formats: string[];
  /** Group for menu organization */
  group: string;
  /** Conditional when clause */
  when?: string;
}
