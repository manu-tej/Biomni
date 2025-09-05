import * as vscode from 'vscode';
import * as path from 'path';
import { BlastResults, AnnotationResults, SequenceAnalysis } from '../genomics/index';

/**
 * Result types for storage and retrieval
 */
export type AnalysisResult = BlastResults | AnnotationResults | SequenceAnalysis;

/**
 * Result metadata for history tracking
 */
export interface ResultMetadata {
  id: string;
  type: 'blast' | 'annotation' | 'analysis';
  timestamp: Date;
  sequence: string;
  parameters: any;
  size: number;
}

/**
 * Manages genomics analysis results including caching, history, and export
 */
export class GenomicsResultsManager {
  private results: Map<string, AnalysisResult> = new Map();
  private readonly maxCacheSize = 100; // Maximum number of results to cache
  private readonly cachePath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.cachePath = path.join(
      context.globalStorageUri?.fsPath || context.extensionPath,
      'results'
    );
    this.initializeCache();
  }

  /**
   * Save BLAST results to cache
   */
  async saveBlastResults(results: BlastResults): Promise<string> {
    const id = this.generateResultId('blast', results.querySequence);
    this.results.set(id, results);

    await this.persistResult(id, results);
    await this.updateHistory(id, 'blast', results);

    this.enforceCacheLimits();
    return id;
  }

  /**
   * Save annotation results to cache
   */
  async saveAnnotationResults(results: AnnotationResults): Promise<string> {
    const id = this.generateResultId('annotation', results.sequence);
    this.results.set(id, results);

    await this.persistResult(id, results);
    await this.updateHistory(id, 'annotation', results);

    this.enforceCacheLimits();
    return id;
  }

  /**
   * Save sequence analysis results to cache
   */
  async saveAnalysisResults(results: SequenceAnalysis): Promise<string> {
    const id = this.generateResultId('analysis', results.sequence);
    this.results.set(id, results);

    await this.persistResult(id, results);
    await this.updateHistory(id, 'analysis', results);

    this.enforceCacheLimits();
    return id;
  }

  /**
   * Retrieve result by ID
   */
  async getResult(id: string): Promise<AnalysisResult | null> {
    // Check in-memory cache first
    if (this.results.has(id)) {
      return this.results.get(id)!;
    }

    // Try to load from persistent storage
    try {
      const result = await this.loadPersistedResult(id);
      if (result) {
        this.results.set(id, result);
        return result;
      }
    } catch (error) {
      console.warn(`Failed to load persisted result ${id}:`, error);
    }

    return null;
  }

  /**
   * Get analysis history for current workspace
   */
  async getHistory(): Promise<ResultMetadata[]> {
    try {
      const historyData = this.context.workspaceState.get<ResultMetadata[]>(
        'biomni.resultsHistory',
        []
      );
      return historyData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.warn('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Clear all cached results
   */
  async clearCache(): Promise<void> {
    this.results.clear();
    await this.context.workspaceState.update('biomni.resultsHistory', []);

    try {
      // Clear persistent storage
      await vscode.workspace.fs.delete(vscode.Uri.file(this.cachePath), { recursive: true });
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  /**
   * Remove specific result from cache
   */
  async removeResult(id: string): Promise<void> {
    this.results.delete(id);

    // Remove from history
    const history = await this.getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    await this.context.workspaceState.update('biomni.resultsHistory', updatedHistory);

    // Remove from persistent storage
    try {
      const resultPath = path.join(this.cachePath, `${id}.json`);
      await vscode.workspace.fs.delete(vscode.Uri.file(resultPath));
    } catch (error) {
      console.warn(`Failed to delete persisted result ${id}:`, error);
    }
  }

  /**
   * Export result to various formats
   */
  async exportResult(
    result: AnalysisResult,
    format: 'csv' | 'json' | 'fasta' | 'genbank'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'csv':
        return this.exportToCSV(result);
      case 'fasta':
        return this.exportToFASTA(result);
      case 'genbank':
        return this.exportToGenBank(result);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Search results by sequence or parameters
   */
  async searchResults(
    query: string,
    type?: 'blast' | 'annotation' | 'analysis'
  ): Promise<ResultMetadata[]> {
    const history = await this.getHistory();

    return history.filter(item => {
      if (type && item.type !== type) {
        return false;
      }

      const searchText = `${item.sequence} ${JSON.stringify(item.parameters)}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalResults: number; memoryUsage: string; oldestResult?: Date } {
    const history = this.context.workspaceState.get<ResultMetadata[]>('biomni.resultsHistory', []);
    const memoryUsage = this.estimateMemoryUsage();
    const oldestResult =
      history.length > 0
        ? new Date(Math.min(...history.map(h => h.timestamp.getTime())))
        : undefined;

    const stats: { totalResults: number; memoryUsage: string; oldestResult?: Date } = {
      totalResults: history.length,
      memoryUsage: this.formatBytes(memoryUsage),
    };

    if (oldestResult !== undefined) {
      stats.oldestResult = oldestResult;
    }

    return stats;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.results.clear();
  }

  // Private helper methods

  /**
   * Initialize cache directory
   */
  private async initializeCache(): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.cachePath));
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Generate unique result ID
   */
  private generateResultId(type: string, sequence: string): string {
    const timestamp = Date.now();
    const sequenceHash = this.simpleHash(sequence.substring(0, 100)); // Use first 100 chars for hash
    return `${type}_${timestamp}_${sequenceHash}`;
  }

  /**
   * Simple hash function for sequence identification
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) {
      return hash.toString();
    }
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Persist result to storage
   */
  private async persistResult(id: string, result: AnalysisResult): Promise<void> {
    try {
      const resultPath = path.join(this.cachePath, `${id}.json`);
      const resultData = JSON.stringify(result);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(resultPath),
        Buffer.from(resultData, 'utf8')
      );
    } catch (error) {
      console.warn(`Failed to persist result ${id}:`, error);
    }
  }

  /**
   * Load persisted result from storage
   */
  private async loadPersistedResult(id: string): Promise<AnalysisResult | null> {
    try {
      const resultPath = path.join(this.cachePath, `${id}.json`);
      const resultData = await vscode.workspace.fs.readFile(vscode.Uri.file(resultPath));
      return JSON.parse(new TextDecoder().decode(resultData));
    } catch (error) {
      return null;
    }
  }

  /**
   * Update history with new result metadata
   */
  private async updateHistory(
    id: string,
    type: 'blast' | 'annotation' | 'analysis',
    result: AnalysisResult
  ): Promise<void> {
    const history = await this.getHistory();

    const metadata: ResultMetadata = {
      id,
      type,
      timestamp: new Date(),
      sequence: this.extractSequence(result),
      parameters: this.extractParameters(result),
      size: JSON.stringify(result).length,
    };

    history.unshift(metadata);

    // Keep only the most recent results
    const trimmedHistory = history.slice(0, this.maxCacheSize);
    await this.context.workspaceState.update('biomni.resultsHistory', trimmedHistory);
  }

  /**
   * Extract sequence from result for metadata
   */
  private extractSequence(result: AnalysisResult): string {
    if ('querySequence' in result) {
      return result.querySequence.substring(0, 50); // First 50 chars
    }
    if ('sequence' in result) {
      return result.sequence.substring(0, 50); // First 50 chars
    }
    return '';
  }

  /**
   * Extract parameters from result for metadata
   */
  private extractParameters(result: AnalysisResult): any {
    if ('parameters' in result) {
      return result.parameters;
    }
    if ('database' in result && 'program' in result) {
      return { database: result.database, program: result.program };
    }
    return {};
  }

  /**
   * Enforce cache size limits
   */
  private enforceCacheLimits(): void {
    if (this.results.size > this.maxCacheSize) {
      // Remove oldest entries from in-memory cache
      const entries = Array.from(this.results.entries());
      entries.slice(this.maxCacheSize).forEach(([id]) => {
        this.results.delete(id);
      });
    }
  }

  /**
   * Export result to CSV format
   */
  private exportToCSV(result: AnalysisResult): string {
    if ('hits' in result) {
      // BLAST results
      const headers = [
        'Hit_ID',
        'Description',
        'E_value',
        'Bit_Score',
        'Identity',
        'Query_Start',
        'Query_End',
        'Subject_Start',
        'Subject_End',
      ];
      const rows = result.hits.map(hit => [
        hit.id,
        hit.description,
        hit.evalue,
        hit.bitScore,
        hit.identity,
        hit.queryStart,
        hit.queryEnd,
        hit.subjectStart,
        hit.subjectEnd,
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    } else if ('orfs' in result) {
      // Annotation results
      const headers = ['ORF_ID', 'Start', 'End', 'Strand', 'Frame', 'Length', 'Translation'];
      const rows = result.orfs.map(orf => [
        orf.id,
        orf.start,
        orf.end,
        orf.strand,
        orf.frame,
        orf.length,
        orf.translation,
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    } else if ('composition' in result) {
      // Analysis results
      const headers = ['Property', 'Value'];
      const rows = [
        ['Length', result.length],
        ['GC_Content', result.gcContent],
        ['A_Count', result.composition.A],
        ['T_Count', result.composition.T],
        ['G_Count', result.composition.G],
        ['C_Count', result.composition.C],
        ['Melting_Temperature', result.melting.tm],
        ['Molecular_Weight', result.molecular.molecularWeight],
      ];

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    throw new Error('Unsupported result type for CSV export');
  }

  /**
   * Export result to FASTA format
   */
  private exportToFASTA(result: AnalysisResult): string {
    const lines: string[] = [];

    if ('hits' in result) {
      // BLAST results - export query and top hits
      lines.push(`>Query_Sequence`);
      lines.push(result.querySequence);

      result.hits.slice(0, 10).forEach((hit, index) => {
        lines.push(`>Hit_${index + 1}_${hit.id}_E${hit.evalue}`);
        lines.push(hit.subjectSequence || 'Sequence not available');
      });
    } else if ('orfs' in result) {
      // Annotation results - export ORF sequences
      lines.push(`>Original_Sequence`);
      lines.push(result.sequence);

      result.orfs.forEach(orf => {
        lines.push(`>${orf.id}_frame${orf.frame}_${orf.start}-${orf.end}`);
        lines.push(orf.sequence);
        if (orf.translation) {
          lines.push(`>${orf.id}_protein`);
          lines.push(orf.translation);
        }
      });
    } else if ('sequence' in result) {
      // Analysis results - export original sequence
      lines.push(`>Analyzed_Sequence_${result.timestamp.toISOString()}`);
      lines.push(result.sequence);
    }

    return lines.join('\n');
  }

  /**
   * Export result to GenBank format (simplified)
   */
  private exportToGenBank(result: AnalysisResult): string {
    const lines: string[] = [];
    const date = new Date()
      .toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase();

    if ('orfs' in result) {
      // Annotation results in GenBank format
      lines.push('LOCUS       BIOMNI_ANNOTATION                    DNA     linear   UNK ' + date);
      lines.push('DEFINITION  Sequence analysis by Biomni');
      lines.push('ACCESSION   BIOMNI_ANNOTATION');
      lines.push('VERSION     BIOMNI_ANNOTATION.1');
      lines.push('KEYWORDS    .');
      lines.push('SOURCE      .');
      lines.push('  ORGANISM  .');
      lines.push('FEATURES             Location/Qualifiers');
      lines.push('     source          1..' + result.sequence.length);
      lines.push('                     /organism="unknown"');

      result.orfs.forEach(orf => {
        const location =
          orf.strand === '+' ? `${orf.start}..${orf.end}` : `complement(${orf.start}..${orf.end})`;
        lines.push(`     CDS             ${location}`);
        lines.push(`                     /note="ORF ${orf.id}"`);
        lines.push(`                     /translation="${orf.translation}"`);
      });

      result.features.forEach(feature => {
        const location =
          feature.strand === '+'
            ? `${feature.start}..${feature.end}`
            : feature.strand === '-'
              ? `complement(${feature.start}..${feature.end})`
              : `${feature.start}..${feature.end}`;
        lines.push(`     ${feature.type.padEnd(15)} ${location}`);
        if (feature.name) {
          lines.push(`                     /name="${feature.name}"`);
        }
        if (feature.description) {
          lines.push(`                     /note="${feature.description}"`);
        }
      });

      lines.push('ORIGIN      ');
      const sequence = result.sequence;
      for (let i = 0; i < sequence.length; i += 60) {
        const seqLine = sequence.substring(i, i + 60);
        const lineNum = (i + 1).toString().padStart(9);
        lines.push(
          `${lineNum} ${
            seqLine
              .toLowerCase()
              .match(/.{1,10}/g)
              ?.join(' ') || seqLine.toLowerCase()
          }`
        );
      }
      lines.push('//');
    } else {
      throw new Error('GenBank export only supported for annotation results');
    }

    return lines.join('\n');
  }

  /**
   * Estimate memory usage of cached results
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const result of this.results.values()) {
      totalSize += JSON.stringify(result).length * 2; // Rough estimate (UTF-16)
    }
    return totalSize;
  }

  /**
   * Format bytes into human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
