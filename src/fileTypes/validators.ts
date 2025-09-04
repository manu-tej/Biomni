/**
 * File format validators for biological data formats
 */

import * as vscode from 'vscode';
import { FileValidationResult, ValidationError, ValidationWarning } from './types';

/**
 * Base validator class
 */
abstract class BaseValidator {
  protected errors: ValidationError[] = [];
  protected warnings: ValidationWarning[] = [];
  protected lineCount = 0;
  protected recordCount = 0;

  abstract validate(content: string): FileValidationResult;

  protected addError(line: number, message: string, code: string, column?: number): void {
    this.errors.push({
      line,
      ...(column !== undefined && { column }),
      message,
      code,
      severity: 'error',
    });
  }

  protected addWarning(line: number, message: string, code: string, column?: number): void {
    this.warnings.push({
      line,
      ...(column !== undefined && { column }),
      message,
      code,
    });
  }

  protected reset(): void {
    this.errors = [];
    this.warnings = [];
    this.lineCount = 0;
    this.recordCount = 0;
  }

  protected detectEncoding(content: string): string {
    if (content.includes('\0')) {
      return 'binary';
    }
    return 'utf-8';
  }
}

/**
 * FASTA format validator
 */
class FastaValidator extends BaseValidator {
  validate(content: string): FileValidationResult {
    this.reset();
    const lines = content.split('\n');
    this.lineCount = lines.length;

    let inSequence = false;
    let currentSequence = '';
    let headerCount = 0;
    let emptyLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();
      const lineNum = i + 1;

      if (line.length === 0) {
        emptyLines++;
        continue;
      }

      if (line.startsWith('>')) {
        // Header line
        if (inSequence && currentSequence.length === 0) {
          this.addWarning(
            Math.max(1, lineNum - 1),
            'Empty sequence before header',
            'EMPTY_SEQUENCE'
          );
        }

        headerCount++;
        inSequence = true;
        currentSequence = '';

        // Validate header format
        if (line.length === 1) {
          this.addError(lineNum, 'Empty FASTA header', 'EMPTY_HEADER');
        } else if (line.includes('|') && !this.isValidFastaHeader(line)) {
          this.addWarning(lineNum, 'Non-standard header format', 'NONSTANDARD_HEADER');
        }
      } else if (inSequence) {
        // Sequence line
        if (!this.isValidSequenceLine(line)) {
          this.addError(lineNum, 'Invalid characters in sequence', 'INVALID_SEQUENCE');
        } else {
          currentSequence += line;
        }
      } else {
        // No header seen yet
        this.addError(lineNum, 'Sequence data before header', 'SEQUENCE_BEFORE_HEADER');
      }
    }

    this.recordCount = headerCount;

    // Final validations
    if (headerCount === 0) {
      this.addError(1, 'No FASTA headers found', 'NO_HEADERS');
    }

    if (inSequence && currentSequence.length === 0) {
      this.addWarning(Math.max(1, lines.length), 'Last sequence is empty', 'EMPTY_LAST_SEQUENCE');
    }

    if (emptyLines > lines.length * 0.1) {
      this.addWarning(1, 'File contains many empty lines', 'MANY_EMPTY_LINES');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        lineCount: this.lineCount,
        recordCount: this.recordCount,
        encoding: this.detectEncoding(content),
      },
    };
  }

  private isValidFastaHeader(header: string): boolean {
    // Common patterns: >gi|123|ref|NM_123.1| or >lcl|sequence1
    return /^>[A-Za-z0-9|._\-:\s]+$/.test(header);
  }

  private isValidSequenceLine(line: string): boolean {
    // Allow standard nucleotide/protein characters plus common ambiguity codes
    return /^[ACGTUNWSMKRYBDHVacgtunwsmkrybdhv\-*.]+$/.test(line);
  }
}

/**
 * FASTQ format validator
 */
class FastqValidator extends BaseValidator {
  validate(content: string): FileValidationResult {
    this.reset();
    const lines = content.split('\n');
    this.lineCount = lines.length;

    let recordStart = 0;
    let recordsProcessed = 0;

    while (recordStart < lines.length) {
      const recordEnd = this.validateFastqRecord(lines, recordStart);
      if (recordEnd > recordStart) {
        recordsProcessed++;
        recordStart = recordEnd;
      } else {
        break;
      }
    }

    this.recordCount = recordsProcessed;

    if (recordsProcessed === 0) {
      this.addError(1, 'No valid FASTQ records found', 'NO_RECORDS');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        lineCount: this.lineCount,
        recordCount: this.recordCount,
        encoding: this.detectEncoding(content),
      },
    };
  }

  private validateFastqRecord(lines: string[], start: number): number {
    if (start + 3 >= lines.length) {
      this.addError(start + 1, 'Incomplete FASTQ record', 'INCOMPLETE_RECORD');
      return start + 1;
    }

    const header1 = lines[start]?.trim() || '';
    const sequence = lines[start + 1]?.trim() || '';
    const header2 = lines[start + 2]?.trim() || '';
    const quality = lines[start + 3]?.trim() || '';

    // Validate first header
    if (!header1.startsWith('@')) {
      this.addError(start + 1, 'FASTQ record must start with @', 'INVALID_HEADER1');
    } else if (header1.length === 1) {
      this.addError(start + 1, 'Empty FASTQ header', 'EMPTY_HEADER1');
    }

    // Validate sequence
    if (!this.isValidDnaSequence(sequence)) {
      this.addError(start + 2, 'Invalid characters in sequence', 'INVALID_SEQUENCE');
    }

    // Validate second header
    if (!header2.startsWith('+')) {
      this.addError(start + 3, 'Third line must start with +', 'INVALID_HEADER2');
    } else if (header2.length > 1 && header2.substring(1) !== header1.substring(1)) {
      this.addWarning(start + 3, 'Header names do not match', 'MISMATCHED_HEADERS');
    }

    // Validate quality
    if (sequence.length !== quality.length) {
      this.addError(start + 4, 'Sequence and quality lengths do not match', 'LENGTH_MISMATCH');
    }

    if (!this.isValidQualityString(quality)) {
      this.addError(start + 4, 'Invalid characters in quality string', 'INVALID_QUALITY');
    }

    return start + 4;
  }

  private isValidDnaSequence(sequence: string): boolean {
    return /^[ACGTNacgtn]+$/.test(sequence);
  }

  private isValidQualityString(quality: string): boolean {
    // ASCII 33-126 are valid quality characters
    return /^[!-~]+$/.test(quality);
  }
}

/**
 * VCF format validator
 */
class VcfValidator extends BaseValidator {
  validate(content: string): FileValidationResult {
    this.reset();
    const lines = content.split('\n');
    this.lineCount = lines.length;

    let hasFileFormat = false;
    let hasColumnHeader = false;
    let dataStarted = false;
    let metaLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();
      const lineNum = i + 1;

      if (line.length === 0) {
        continue;
      }

      if (line.startsWith('##')) {
        // Meta-information lines
        metaLineCount++;
        if (line.startsWith('##fileformat=VCF')) {
          hasFileFormat = true;
        }
        if (dataStarted) {
          this.addError(lineNum, 'Meta-information line after data lines', 'META_AFTER_DATA');
        }
      } else if (line.startsWith('#CHROM')) {
        // Column header line
        hasColumnHeader = true;
        if (!this.isValidVcfHeader(line)) {
          this.addError(lineNum, 'Invalid VCF column header', 'INVALID_COLUMN_HEADER');
        }
      } else if (line.startsWith('#')) {
        this.addWarning(lineNum, 'Unknown header line format', 'UNKNOWN_HEADER');
      } else {
        // Data line
        dataStarted = true;
        if (!hasColumnHeader) {
          this.addError(lineNum, 'Data line before column header', 'DATA_BEFORE_HEADER');
        }
        this.validateVcfDataLine(line, lineNum);
        this.recordCount++;
      }
    }

    // Required elements check
    if (!hasFileFormat) {
      this.addError(1, 'Missing ##fileformat=VCF header', 'MISSING_FILEFORMAT');
    }

    if (!hasColumnHeader) {
      this.addError(1, 'Missing #CHROM column header', 'MISSING_COLUMN_HEADER');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        lineCount: this.lineCount,
        recordCount: this.recordCount,
        encoding: this.detectEncoding(content),
      },
    };
  }

  private isValidVcfHeader(header: string): boolean {
    const requiredColumns = ['#CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO'];
    const columns = header.split('\t');

    for (let i = 0; i < requiredColumns.length; i++) {
      if (i >= columns.length || columns[i] !== requiredColumns[i]) {
        return false;
      }
    }
    return true;
  }

  private validateVcfDataLine(line: string, lineNum: number): void {
    const columns = line.split('\t');

    if (columns.length < 8) {
      this.addError(
        lineNum,
        'VCF data line has fewer than 8 required columns',
        'INSUFFICIENT_COLUMNS'
      );
      return;
    }

    // Validate POS column (should be integer)
    if (columns[1] && !/^\d+$/.test(columns[1])) {
      this.addError(lineNum, 'POS column must be a positive integer', 'INVALID_POS');
    }

    // Validate REF column (should be DNA sequence)
    if (columns[3] && !/^[ACGTN]+$/i.test(columns[3])) {
      this.addError(lineNum, 'REF column contains invalid characters', 'INVALID_REF');
    }

    // Validate ALT column
    const alt = columns[4] || '';
    if (alt !== '.' && !/^[ACGTN,<>[\]]+$/i.test(alt)) {
      this.addError(lineNum, 'ALT column contains invalid characters', 'INVALID_ALT');
    }

    // Validate QUAL column
    const qual = columns[5] || '';
    if (qual !== '.' && (!/^\d+(\.\d+)?$/.test(qual) || parseFloat(qual) < 0)) {
      this.addError(lineNum, 'QUAL column must be a non-negative number or "."', 'INVALID_QUAL');
    }
  }
}

/**
 * PDB format validator
 */
class PdbValidator extends BaseValidator {
  validate(content: string): FileValidationResult {
    this.reset();
    const lines = content.split('\n');
    this.lineCount = lines.length;

    let hasHeader = false;
    let atomCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }

      const lineNum = i + 1;
      const recordType = line.substring(0, 6).trim();

      switch (recordType) {
        case 'HEADER':
          hasHeader = true;
          if (line.length < 62) {
            this.addWarning(lineNum, 'HEADER record is shorter than expected', 'SHORT_HEADER');
          }
          break;

        case 'ATOM':
        case 'HETATM':
          atomCount++;
          this.validatePdbAtomLine(line, lineNum);
          break;

        case 'END':
          // Valid termination
          break;

        default:
          // Other record types are generally acceptable
          break;
      }
    }

    if (!hasHeader) {
      this.addWarning(1, 'PDB file missing HEADER record', 'MISSING_HEADER');
    }

    if (atomCount === 0) {
      this.addError(1, 'PDB file contains no ATOM records', 'NO_ATOMS');
    }

    this.recordCount = atomCount;

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        lineCount: this.lineCount,
        recordCount: this.recordCount,
        encoding: this.detectEncoding(content),
      },
    };
  }

  private validatePdbAtomLine(line: string, lineNum: number): void {
    if (line.length < 54) {
      this.addError(lineNum, 'ATOM/HETATM record is too short', 'SHORT_ATOM_RECORD');
      return;
    }

    // Validate serial number (columns 7-11)
    const serial = line.substring(6, 11)?.trim() || '';
    if (!/^\d+$/.test(serial)) {
      this.addError(lineNum, 'Invalid atom serial number', 'INVALID_SERIAL');
    }

    // Validate coordinates (columns 31-54)
    const x = line.substring(30, 38)?.trim() || '';
    const y = line.substring(38, 46)?.trim() || '';
    const z = line.substring(46, 54)?.trim() || '';

    if (!/^-?\d+\.\d+$/.test(x) || !/^-?\d+\.\d+$/.test(y) || !/^-?\d+\.\d+$/.test(z)) {
      this.addError(lineNum, 'Invalid coordinates format', 'INVALID_COORDINATES');
    }
  }
}

/**
 * Validator registry
 */
export class ValidatorRegistry {
  private static validators: Record<string, BaseValidator> = {
    validateFasta: new FastaValidator(),
    validateFastq: new FastqValidator(),
    validateVcf: new VcfValidator(),
    validatePdb: new PdbValidator(),
  };

  /**
   * Get validator by name
   */
  static getValidator(name: string): BaseValidator | undefined {
    return this.validators[name];
  }

  /**
   * Validate file content using specified validator
   */
  static async validateContent(
    validatorName: string,
    content: string
  ): Promise<FileValidationResult> {
    const validator = this.getValidator(validatorName);
    if (!validator) {
      throw new Error(`Unknown validator: ${validatorName}`);
    }

    return validator.validate(content);
  }

  /**
   * Validate file from URI
   */
  static async validateFile(uri: vscode.Uri, validatorName: string): Promise<FileValidationResult> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const textContent = new TextDecoder().decode(content);
      return this.validateContent(validatorName, textContent);
    } catch (error) {
      throw new Error(`Failed to read file for validation: ${error}`);
    }
  }

  /**
   * Register a new validator
   */
  static registerValidator(name: string, validator: BaseValidator): void {
    this.validators[name] = validator;
  }
}
