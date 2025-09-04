/**
 * File type detection pipeline with streaming support for large files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BioFileFormat, FileDetectionResult } from './types';
import { getFormatsByExtension, getAllFormats } from './registry';

/**
 * Detection cache to avoid redundant processing
 */
const detectionCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 1000;
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  result: FileDetectionResult;
  timestamp: number;
  fileSize: number;
  lastModified: number;
}

/**
 * Main file detection class
 */
export class FileDetector {
  private static instance: FileDetector;

  public static getInstance(): FileDetector {
    if (!FileDetector.instance) {
      FileDetector.instance = new FileDetector();
    }
    return FileDetector.instance;
  }

  /**
   * Detect file type from URI
   */
  async detectFile(uri: vscode.Uri): Promise<FileDetectionResult | null> {
    try {
      const cacheKey = uri.fsPath;

      // Check cache first
      const cached = this.getCachedResult(cacheKey, uri);
      if (cached) {
        return cached;
      }

      // Get file stats
      const stats = await vscode.workspace.fs.stat(uri);
      const filename = path.basename(uri.fsPath);
      const extension = path.extname(filename).toLowerCase();

      // Try extension-based detection first
      const extensionFormats = getFormatsByExtension(extension);

      if (extensionFormats.length === 1) {
        // Single format match, high confidence
        const format = extensionFormats[0];
        if (format) {
          const result: FileDetectionResult = {
            format,
            confidence: 0.9,
            detectionMethod: 'extension',
            stats: {
              size: stats.size,
            },
          };
          this.setCacheResult(cacheKey, result, stats.size, stats.mtime);
          return result;
        }
      }

      if (extensionFormats.length > 1) {
        // Multiple matches, need content analysis
        const contentResult = await this.detectByContent(uri, extensionFormats);
        if (contentResult) {
          contentResult.detectionMethod = 'hybrid';
          this.setCacheResult(cacheKey, contentResult, stats.size, stats.mtime);
          return contentResult;
        }
      }

      // No extension match, try content-only detection
      if (stats.size > 0 && stats.size < 10 * 1024 * 1024) {
        // Limit to 10MB for content detection
        const contentResult = await this.detectByContent(uri);
        if (contentResult) {
          contentResult.detectionMethod = 'content';
          this.setCacheResult(cacheKey, contentResult, stats.size, stats.mtime);
          return contentResult;
        }
      }

      return null;
    } catch (error) {
      console.error('File detection error:', error);
      return null;
    }
  }

  /**
   * Detect file type by content analysis
   */
  private async detectByContent(
    uri: vscode.Uri,
    candidateFormats?: BioFileFormat[]
  ): Promise<FileDetectionResult | null> {
    try {
      const formats = candidateFormats || getAllFormats();
      const stats = await vscode.workspace.fs.stat(uri);

      // Determine sample size based on file size and format hints
      const maxSampleSize = Math.max(...formats.map(f => f.optimizationHints.sampleSize));
      const sampleSize = Math.min(stats.size, maxSampleSize * 4); // 4x buffer for safety

      // Read sample content
      const content = await this.readFileSample(uri, sampleSize);
      if (!content) {
        return null;
      }

      // Test each format's content patterns
      const matches: { format: BioFileFormat; confidence: number }[] = [];

      for (const format of formats) {
        const confidence = this.calculateContentConfidence(content, format);
        if (confidence > 0.5) {
          matches.push({ format, confidence });
        }
      }

      // Return best match
      if (matches.length > 0) {
        matches.sort((a, b) => b.confidence - a.confidence);
        const bestMatch = matches[0];

        if (bestMatch) {
          return {
            format: bestMatch.format,
            confidence: bestMatch.confidence,
            detectionMethod: 'content',
            stats: {
              size: stats.size,
              encoding: this.detectEncoding(content),
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Content detection error:', error);
      return null;
    }
  }

  /**
   * Read file sample for content analysis
   */
  private async readFileSample(uri: vscode.Uri, sampleSize: number): Promise<string | null> {
    try {
      const buffer = new Uint8Array(sampleSize);
      const fd = await vscode.workspace.fs.readFile(uri);

      if (fd.length === 0) {
        return null;
      }

      const bytesToRead = Math.min(sampleSize, fd.length);
      buffer.set(fd.subarray(0, bytesToRead));

      // Convert to string, handling potential binary data
      return new TextDecoder('utf-8', { fatal: false }).decode(buffer.subarray(0, bytesToRead));
    } catch (error) {
      console.error('Error reading file sample:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score for content patterns
   */
  private calculateContentConfidence(content: string, format: BioFileFormat): number {
    if (!format.contentPatterns || format.contentPatterns.length === 0) {
      return 0;
    }

    let matchCount = 0;
    let totalPatterns = format.contentPatterns.length;

    // Test each pattern
    for (const pattern of format.contentPatterns) {
      if (pattern.test(content)) {
        matchCount++;
      }
    }

    // Base confidence from pattern matches
    let confidence = matchCount / totalPatterns;

    // Bonus points for format-specific characteristics
    confidence += this.getFormatSpecificBonus(content, format);

    // Penalty for suspicious patterns that might indicate wrong format
    confidence -= this.getSuspiciousPatternPenalty(content, format);

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get format-specific confidence bonus
   */
  private getFormatSpecificBonus(content: string, format: BioFileFormat): number {
    let bonus = 0;

    switch (format.name.toLowerCase()) {
      case 'fasta':
        // Check for proper FASTA structure
        const fastaLines = content.split('\n').slice(0, 10);
        let hasHeaders = 0;
        let hasSequence = 0;

        for (const line of fastaLines) {
          if (line.startsWith('>')) {
            hasHeaders++;
          } else if (/^[ACGTN]+$/i.test(line.trim())) {
            hasSequence++;
          }
        }

        if (hasHeaders > 0 && hasSequence > 0) {
          bonus += 0.2;
        }
        break;

      case 'fastq':
        // Check for FASTQ 4-line structure
        const fastqLines = content.split('\n');
        if (fastqLines.length >= 4) {
          let validBlocks = 0;
          for (let i = 0; i < Math.min(fastqLines.length - 3, 20); i += 4) {
            const line1 = fastqLines[i] || '';
            const line2 = fastqLines[i + 1] || '';
            const line3 = fastqLines[i + 2] || '';

            if (line1.startsWith('@') && /^[ACGTN]+$/i.test(line2) && line3.startsWith('+')) {
              validBlocks++;
            }
          }
          if (validBlocks > 0) {
            bonus += 0.3;
          }
        }
        break;

      case 'vcf':
        // Check for VCF header structure
        if (content.includes('##fileformat=VCF') && content.includes('#CHROM')) {
          bonus += 0.3;
        }
        break;
    }

    return bonus;
  }

  /**
   * Get penalty for suspicious patterns
   */
  private getSuspiciousPatternPenalty(content: string, format: BioFileFormat): number {
    let penalty = 0;

    // Check for binary content
    if (this.containsBinaryData(content)) {
      penalty += format.name === 'BAM' ? 0 : 0.5; // BAM is binary, others are text
    }

    // Check for HTML/XML content
    if (content.includes('<html') || content.includes('<?xml')) {
      penalty += 0.8;
    }

    return penalty;
  }

  /**
   * Detect text encoding
   */
  private detectEncoding(content: string): string {
    // Simple heuristic - could be enhanced with proper encoding detection
    if (content.includes('\ufffd')) {
      return 'binary';
    }
    return 'utf-8';
  }

  /**
   * Check if content contains binary data
   */
  private containsBinaryData(content: string): boolean {
    // Check for null bytes or other binary indicators
    return content.includes('\0') || /[\x00-\x08\x0E-\x1F\x7F]/.test(content);
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(key: string, _uri: vscode.Uri): FileDetectionResult | null {
    const cached = detectionCache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Check cache age
    if (age > CACHE_MAX_AGE) {
      detectionCache.delete(key);
      return null;
    }

    // TODO: Check file modification time when available
    // For now, assume cache is valid

    return cached.result;
  }

  /**
   * Set cache result
   */
  private setCacheResult(
    key: string,
    result: FileDetectionResult,
    fileSize: number,
    lastModified: number
  ): void {
    // Clean cache if too large
    if (detectionCache.size >= CACHE_MAX_SIZE) {
      const oldestKey = detectionCache.keys().next().value;
      if (oldestKey) {
        detectionCache.delete(oldestKey);
      }
    }

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      fileSize,
      lastModified,
    };

    detectionCache.set(key, entry);
  }

  /**
   * Clear detection cache
   */
  public clearCache(): void {
    detectionCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    // TODO: Implement hit rate tracking
    return {
      size: detectionCache.size,
      maxSize: CACHE_MAX_SIZE,
      hitRate: 0, // Placeholder
    };
  }
}
