import * as vscode from 'vscode';
import * as fs from 'fs';

export interface ResultItem {
  id: string;
  timestamp: Date;
  type: 'database' | 'analysis' | 'workflow';
  source: string; // e.g., 'uniprot', 'blast', 'sequence_analysis'
  query?: string;
  data: any;
  metadata?: {
    duration?: number;
    parameters?: any;
    error?: string;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'tsv' | 'fasta' | 'genbank' | 'html';
  includeMetadata?: boolean;
  prettify?: boolean;
}

export class ResultsManager {
  private results: Map<string, ResultItem> = new Map();
  private resultHistory: ResultItem[] = [];
  private context: vscode.ExtensionContext;
  private maxHistorySize = 100;
  private storageKey = 'biomni.results.history';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadHistory();
  }

  /**
   * Generate unique ID for result
   */
  private generateId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a new result
   */
  storeResult(
    type: ResultItem['type'],
    source: string,
    data: any,
    query?: string,
    metadata?: ResultItem['metadata']
  ): string {
    const id = this.generateId();
    const result: ResultItem = {
      id,
      timestamp: new Date(),
      type,
      source,
      data,
      ...(query !== undefined && { query }),
      ...(metadata !== undefined && { metadata }),
    };

    this.results.set(id, result);
    this.addToHistory(result);

    return id;
  }

  /**
   * Get result by ID
   */
  getResult(id: string): ResultItem | undefined {
    return this.results.get(id);
  }

  /**
   * Get all results of a specific type
   */
  getResultsByType(type: ResultItem['type']): ResultItem[] {
    return Array.from(this.results.values()).filter(r => r.type === type);
  }

  /**
   * Get results by source (e.g., 'uniprot', 'blast')
   */
  getResultsBySource(source: string): ResultItem[] {
    return Array.from(this.results.values()).filter(r => r.source === source);
  }

  /**
   * Get recent results
   */
  getRecentResults(limit: number = 10): ResultItem[] {
    return this.resultHistory.slice(0, limit);
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear();
    this.resultHistory = [];
    this.saveHistory();
  }

  /**
   * Clear results older than specified days
   */
  clearOldResults(days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const initialSize = this.results.size;

    this.results.forEach((result, id) => {
      if (result.timestamp < cutoffDate) {
        this.results.delete(id);
      }
    });

    this.resultHistory = this.resultHistory.filter(r => r.timestamp >= cutoffDate);
    this.saveHistory();

    return initialSize - this.results.size;
  }

  /**
   * Export result to file
   */
  async exportResult(resultId: string, options: ExportOptions): Promise<string | undefined> {
    const result = this.getResult(resultId);
    if (!result) {
      vscode.window.showErrorMessage('Result not found');
      return undefined;
    }

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(this.getDefaultFileName(result, options.format)),
      filters: this.getFileFilters(options.format),
    });

    if (!saveUri) {
      return undefined;
    }

    try {
      const content = this.formatResultForExport(result, options);
      await fs.promises.writeFile(saveUri.fsPath, content);
      vscode.window.showInformationMessage(`Result exported to ${saveUri.fsPath}`);
      return saveUri.fsPath;
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Export multiple results
   */
  async exportMultipleResults(
    resultIds: string[],
    options: ExportOptions
  ): Promise<string | undefined> {
    const results = resultIds
      .map(id => this.getResult(id))
      .filter(r => r !== undefined) as ResultItem[];

    if (results.length === 0) {
      vscode.window.showErrorMessage('No valid results to export');
      return undefined;
    }

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`biomni_results_${Date.now()}.${options.format}`),
      filters: this.getFileFilters(options.format),
    });

    if (!saveUri) {
      return undefined;
    }

    try {
      const content = this.formatMultipleResultsForExport(results, options);
      await fs.promises.writeFile(saveUri.fsPath, content);
      vscode.window.showInformationMessage(
        `${results.length} results exported to ${saveUri.fsPath}`
      );
      return saveUri.fsPath;
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Format single result for export
   */
  private formatResultForExport(result: ResultItem, options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        const jsonData = options.includeMetadata ? result : result.data;
        return options.prettify ? JSON.stringify(jsonData, null, 2) : JSON.stringify(jsonData);

      case 'csv':
      case 'tsv':
        return this.formatAsDelimited(result.data, options.format === 'tsv' ? '\t' : ',');

      case 'fasta':
        return this.formatAsFasta(result);

      case 'genbank':
        return this.formatAsGenBank(result);

      case 'html':
        return this.formatAsHtml(result, options.includeMetadata);

      default:
        return JSON.stringify(result.data, null, 2);
    }
  }

  /**
   * Format multiple results for export
   */
  private formatMultipleResultsForExport(results: ResultItem[], options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        const jsonData = options.includeMetadata ? results : results.map(r => r.data);
        return options.prettify ? JSON.stringify(jsonData, null, 2) : JSON.stringify(jsonData);

      case 'csv':
      case 'tsv':
        const delimiter = options.format === 'tsv' ? '\t' : ',';
        return results.map(r => this.formatAsDelimited(r.data, delimiter)).join('\n');

      case 'fasta':
        return results.map(r => this.formatAsFasta(r)).join('\n');

      case 'html':
        return this.formatMultipleAsHtml(results, options.includeMetadata);

      default:
        return JSON.stringify(
          results.map(r => r.data),
          null,
          2
        );
    }
  }

  /**
   * Format as delimited (CSV/TSV)
   */
  private formatAsDelimited(data: any, delimiter: string): string {
    if (Array.isArray(data)) {
      // Get all unique keys from all objects
      const keys = new Set<string>();
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => keys.add(key));
        }
      });

      const headers = Array.from(keys);
      const rows = [headers.join(delimiter)];

      data.forEach(item => {
        const row = headers.map(key => {
          const value = item[key];
          // Escape values containing delimiter or quotes
          if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        rows.push(row.join(delimiter));
      });

      return rows.join('\n');
    } else if (typeof data === 'object' && data !== null) {
      const headers = Object.keys(data);
      const values = headers.map(key => data[key]);
      return headers.join(delimiter) + '\n' + values.join(delimiter);
    }

    return String(data);
  }

  /**
   * Format as FASTA
   */
  private formatAsFasta(result: ResultItem): string {
    const data = result.data;

    if (data.sequence) {
      const header = `>${data.accession || data.id || 'sequence'} ${data.description || ''}`.trim();
      const sequence = this.formatSequence(data.sequence);
      return `${header}\n${sequence}`;
    }

    // Handle BLAST results
    if (Array.isArray(data) && data[0]?.sequence) {
      return data
        .map((item, index) => {
          const header =
            `>${item.accession || `seq_${index + 1}`} ${item.description || ''}`.trim();
          const sequence = this.formatSequence(item.sequence);
          return `${header}\n${sequence}`;
        })
        .join('\n');
    }

    return '>sequence\nNO_SEQUENCE_DATA';
  }

  /**
   * Format sequence with line breaks
   */
  private formatSequence(sequence: string, lineLength: number = 80): string {
    const cleaned = sequence.replace(/\s/g, '').toUpperCase();
    const lines = [];
    for (let i = 0; i < cleaned.length; i += lineLength) {
      lines.push(cleaned.substr(i, lineLength));
    }
    return lines.join('\n');
  }

  /**
   * Format as GenBank (simplified)
   */
  private formatAsGenBank(result: ResultItem): string {
    const data = result.data;
    const lines = [];

    lines.push(`LOCUS       ${data.accession || 'unknown'}    ${data.length || 0} bp`);
    lines.push(`DEFINITION  ${data.description || 'No description'}`);
    lines.push(`ACCESSION   ${data.accession || 'unknown'}`);
    lines.push(`VERSION     ${data.version || '1.0'}`);
    lines.push(`SOURCE      ${data.organism || 'Unknown organism'}`);

    if (data.features) {
      lines.push('FEATURES             Location/Qualifiers');
      data.features.forEach((feature: any) => {
        lines.push(`     ${feature.type}          ${feature.start}..${feature.end}`);
        if (feature.name) {
          lines.push(`                     /label="${feature.name}"`);
        }
      });
    }

    if (data.sequence) {
      lines.push('ORIGIN');
      const sequence = this.formatSequence(data.sequence, 60);
      sequence.split('\n').forEach((line, index) => {
        const position = (index * 60 + 1).toString().padStart(9, ' ');
        lines.push(`${position} ${line}`);
      });
    }

    lines.push('//');
    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  private formatAsHtml(result: ResultItem, includeMetadata: boolean = false): string {
    const html = [];
    html.push('<!DOCTYPE html>');
    html.push('<html><head>');
    html.push('<title>Biomni Result Export</title>');
    html.push('<style>');
    html.push('body { font-family: Arial, sans-serif; margin: 20px; }');
    html.push('h1 { color: #2c3e50; }');
    html.push('h2 { color: #34495e; border-bottom: 1px solid #ecf0f1; }');
    html.push('pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }');
    html.push('table { border-collapse: collapse; width: 100%; }');
    html.push('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    html.push('th { background-color: #f2f2f2; }');
    html.push(
      '.metadata { background: #e8f4fd; padding: 10px; border-radius: 4px; margin-bottom: 20px; }'
    );
    html.push('</style>');
    html.push('</head><body>');

    html.push(`<h1>Biomni Result - ${result.source}</h1>`);

    if (includeMetadata) {
      html.push('<div class="metadata">');
      html.push(`<p><strong>ID:</strong> ${result.id}</p>`);
      html.push(`<p><strong>Timestamp:</strong> ${result.timestamp.toLocaleString()}</p>`);
      html.push(`<p><strong>Type:</strong> ${result.type}</p>`);
      html.push(`<p><strong>Source:</strong> ${result.source}</p>`);
      if (result.query) {
        html.push(`<p><strong>Query:</strong> ${result.query}</p>`);
      }
      html.push('</div>');
    }

    html.push('<h2>Data</h2>');
    html.push('<pre>');
    html.push(JSON.stringify(result.data, null, 2));
    html.push('</pre>');

    html.push('</body></html>');
    return html.join('\n');
  }

  /**
   * Format multiple results as HTML
   */
  private formatMultipleAsHtml(results: ResultItem[], includeMetadata: boolean = false): string {
    const html = [];
    html.push('<!DOCTYPE html>');
    html.push('<html><head>');
    html.push('<title>Biomni Results Export</title>');
    html.push('<style>');
    html.push('body { font-family: Arial, sans-serif; margin: 20px; }');
    html.push('h1 { color: #2c3e50; }');
    html.push('h2 { color: #34495e; border-bottom: 1px solid #ecf0f1; }');
    html.push(
      '.result { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 4px; }'
    );
    html.push('pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }');
    html.push('</style>');
    html.push('</head><body>');

    html.push(`<h1>Biomni Results Export (${results.length} results)</h1>`);

    results.forEach((result, index) => {
      html.push(`<div class="result">`);
      html.push(`<h2>Result ${index + 1} - ${result.source}</h2>`);

      if (includeMetadata) {
        html.push(`<p><strong>Timestamp:</strong> ${result.timestamp.toLocaleString()}</p>`);
        if (result.query) {
          html.push(`<p><strong>Query:</strong> ${result.query}</p>`);
        }
      }

      html.push('<pre>');
      html.push(JSON.stringify(result.data, null, 2));
      html.push('</pre>');
      html.push('</div>');
    });

    html.push('</body></html>');
    return html.join('\n');
  }

  /**
   * Get default file name based on result
   */
  private getDefaultFileName(result: ResultItem, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${result.source}_${timestamp}.${format}`;
  }

  /**
   * Get file filters for save dialog
   */
  private getFileFilters(format: string): { [name: string]: string[] } {
    switch (format) {
      case 'json':
        return { JSON: ['json'], All: ['*'] };
      case 'csv':
        return { CSV: ['csv'], All: ['*'] };
      case 'tsv':
        return { TSV: ['tsv', 'txt'], All: ['*'] };
      case 'fasta':
        return { FASTA: ['fasta', 'fa', 'fna'], All: ['*'] };
      case 'genbank':
        return { GenBank: ['gb', 'gbk'], All: ['*'] };
      case 'html':
        return { HTML: ['html', 'htm'], All: ['*'] };
      default:
        return { All: ['*'] };
    }
  }

  /**
   * Add result to history
   */
  private addToHistory(result: ResultItem): void {
    this.resultHistory.unshift(result);

    // Trim history if too large
    if (this.resultHistory.length > this.maxHistorySize) {
      this.resultHistory = this.resultHistory.slice(0, this.maxHistorySize);
    }

    this.saveHistory();
  }

  /**
   * Save history to extension storage
   */
  private saveHistory(): void {
    // Save only essential data to avoid storage bloat
    const historyData = this.resultHistory.slice(0, 20).map(r => ({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      type: r.type,
      source: r.source,
      query: r.query,
    }));

    this.context.globalState.update(this.storageKey, historyData);
  }

  /**
   * Load history from extension storage
   */
  private loadHistory(): void {
    const historyData = this.context.globalState.get<any[]>(this.storageKey, []);

    // Note: We only restore metadata, not full results
    // Full results would need to be re-fetched or stored separately
    this.resultHistory = historyData.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp),
      data: null, // Data not persisted in simple storage
    }));
  }

  /**
   * Get storage statistics
   */
  getStatistics(): {
    totalResults: number;
    resultsByType: Record<string, number>;
    resultsBySource: Record<string, number>;
    oldestResult?: Date;
    newestResult?: Date;
  } {
    const stats: any = {
      totalResults: this.results.size,
      resultsByType: {},
      resultsBySource: {},
    };

    let oldest: Date | undefined;
    let newest: Date | undefined;

    this.results.forEach(result => {
      // Count by type
      stats.resultsByType[result.type] = (stats.resultsByType[result.type] || 0) + 1;

      // Count by source
      stats.resultsBySource[result.source] = (stats.resultsBySource[result.source] || 0) + 1;

      // Track oldest/newest
      if (!oldest || result.timestamp < oldest) {
        oldest = result.timestamp;
      }
      if (!newest || result.timestamp > newest) {
        newest = result.timestamp;
      }
    });

    stats.oldestResult = oldest;
    stats.newestResult = newest;

    return stats;
  }
}
