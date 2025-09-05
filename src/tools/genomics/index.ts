import * as vscode from 'vscode';
import { BlastTool } from './blast';
import { AnnotationTool } from './annotation';
import { SequenceAnalysisTool } from './analysis';
import { GenomicsResultsManager } from '../results/manager';

/**
 * Parameters for BLAST searches
 */
export interface BlastParams {
  sequence: string;
  database: 'nr' | 'nt' | 'refseq_protein' | 'refseq_genomic' | 'swissprot' | 'pdb';
  program: 'blastn' | 'blastp' | 'blastx' | 'tblastn' | 'tblastx';
  evalue?: number;
  maxTargetSeqs?: number;
  wordSize?: number;
  gapOpen?: number;
  gapExtend?: number;
  matrix?: string;
  reward?: number;
  penalty?: number;
}

/**
 * BLAST search results
 */
export interface BlastResults {
  querySequence: string;
  database: string;
  program: string;
  hits: BlastHit[];
  statistics: BlastStatistics;
  parameters: BlastParams;
  timestamp: Date;
}

/**
 * Individual BLAST hit
 */
export interface BlastHit {
  id: string;
  description: string;
  accession: string;
  length: number;
  evalue: number;
  bitScore: number;
  score: number;
  identity: number;
  positive: number;
  gaps: number;
  queryStart: number;
  queryEnd: number;
  subjectStart: number;
  subjectEnd: number;
  querySequence: string;
  subjectSequence: string;
  alignmentString: string;
}

/**
 * BLAST search statistics
 */
export interface BlastStatistics {
  searchSpace: number;
  effectiveLength: number;
  kappa: number;
  lambda: number;
  entropy: number;
}

/**
 * Gene annotation options
 */
export interface AnnotationOptions {
  findOrfs?: boolean;
  translateOrfs?: boolean;
  findDomains?: boolean;
  predictFunction?: boolean;
  annotateFeatures?: boolean;
  organism?: string;
  geneticCode?: number;
}

/**
 * Gene annotation results
 */
export interface AnnotationResults {
  sequence: string;
  orfs: ORF[];
  domains: Domain[];
  features: Feature[];
  predictions: FunctionPrediction[];
  timestamp: Date;
}

/**
 * Open Reading Frame
 */
export interface ORF {
  id: string;
  start: number;
  end: number;
  strand: '+' | '-';
  frame: number;
  length: number;
  sequence: string;
  translation: string;
}

/**
 * Protein domain
 */
export interface Domain {
  id: string;
  name: string;
  description: string;
  start: number;
  end: number;
  evalue: number;
  score: number;
  database: string;
}

/**
 * Genomic feature
 */
export interface Feature {
  id: string;
  type: 'gene' | 'CDS' | 'exon' | 'intron' | 'promoter' | 'enhancer' | 'other';
  start: number;
  end: number;
  strand: '+' | '-' | '.';
  name?: string;
  description?: string;
  attributes: Record<string, string>;
}

/**
 * Function prediction
 */
export interface FunctionPrediction {
  id: string;
  function: string;
  confidence: number;
  evidence: string;
  database: string;
}

/**
 * Sequence analysis results
 */
export interface SequenceAnalysis {
  sequence: string;
  length: number;
  composition: NucleotideComposition;
  gcContent: number;
  melting: MeltingTemperature;
  molecular: MolecularProperties;
  restrictions: RestrictionSite[];
  repeats: RepeatRegion[];
  timestamp: Date;
}

/**
 * Nucleotide composition
 */
export interface NucleotideComposition {
  A: number;
  T: number;
  G: number;
  C: number;
  N: number;
  other: number;
}

/**
 * Melting temperature calculation
 */
export interface MeltingTemperature {
  tm: number;
  method: string;
  saltConcentration: number;
}

/**
 * Molecular properties
 */
export interface MolecularProperties {
  molecularWeight: number;
  extinction: number;
  absorbance: number;
}

/**
 * Restriction enzyme site
 */
export interface RestrictionSite {
  enzyme: string;
  site: string;
  position: number;
  overhang: string;
  blunt: boolean;
}

/**
 * Repeat region
 */
export interface RepeatRegion {
  type: 'tandem' | 'inverted' | 'direct';
  start: number;
  end: number;
  sequence: string;
  copies: number;
}

/**
 * Main genomics tools class that coordinates all genomics functionality
 */
export class GenomicsTools {
  private blastTool: BlastTool;
  private annotationTool: AnnotationTool;
  private analysisTool: SequenceAnalysisTool;
  private resultsManager: GenomicsResultsManager;

  constructor(
    context: vscode.ExtensionContext,
    mcpProvider: any // Will be properly typed when MCP client is available
  ) {
    this.blastTool = new BlastTool(mcpProvider);
    this.annotationTool = new AnnotationTool(mcpProvider);
    this.analysisTool = new SequenceAnalysisTool(mcpProvider);
    this.resultsManager = new GenomicsResultsManager(context);
  }

  /**
   * Perform BLAST search with comprehensive parameter support
   */
  async performBlastSearch(params: BlastParams): Promise<BlastResults> {
    try {
      // Show progress indication
      const progress = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running BLAST search...',
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ increment: 0, message: 'Preparing search...' });

          // Validate parameters
          this.validateBlastParams(params);

          progress.report({ increment: 20, message: 'Submitting to server...' });

          // Execute BLAST search through MCP
          const results = await this.blastTool.search(params);

          progress.report({ increment: 80, message: 'Processing results...' });

          // Cache results
          await this.resultsManager.saveBlastResults(results);

          progress.report({ increment: 100, message: 'Complete!' });

          return results;
        }
      );

      return progress;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`BLAST search failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Annotate genes in a sequence with comprehensive feature detection
   */
  async annotateGenes(
    sequence: string,
    options: AnnotationOptions = {}
  ): Promise<AnnotationResults> {
    try {
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Annotating sequence...',
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ increment: 0, message: 'Analyzing sequence...' });

          // Validate sequence
          this.validateSequence(sequence);

          progress.report({ increment: 25, message: 'Finding ORFs...' });

          // Execute annotation through MCP
          const results = await this.annotationTool.annotate(sequence, options);

          progress.report({ increment: 75, message: 'Processing annotations...' });

          // Cache results
          await this.resultsManager.saveAnnotationResults(results);

          progress.report({ increment: 100, message: 'Complete!' });

          return results;
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Gene annotation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Perform comprehensive sequence analysis
   */
  async analyzeSequence(sequence: string): Promise<SequenceAnalysis> {
    try {
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing sequence...',
          cancellable: false,
        },
        async (progress, _token) => {
          progress.report({ increment: 0, message: 'Calculating composition...' });

          // Validate sequence
          this.validateSequence(sequence);

          progress.report({ increment: 30, message: 'Computing properties...' });

          // Execute analysis through MCP
          const results = await this.analysisTool.analyze(sequence);

          progress.report({ increment: 80, message: 'Finding restriction sites...' });

          // Cache results
          await this.resultsManager.saveAnalysisResults(results);

          progress.report({ increment: 100, message: 'Complete!' });

          return results;
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Sequence analysis failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get analysis history for current workspace
   */
  async getAnalysisHistory(): Promise<any[]> {
    return await this.resultsManager.getHistory();
  }

  /**
   * Clear analysis cache
   */
  async clearCache(): Promise<void> {
    await this.resultsManager.clearCache();
    vscode.window.showInformationMessage('Analysis cache cleared successfully');
  }

  /**
   * Export results in various formats
   */
  async exportResults(
    resultId: string,
    format: 'csv' | 'json' | 'fasta' | 'genbank'
  ): Promise<void> {
    try {
      const result = await this.resultsManager.getResult(resultId);
      if (!result) {
        throw new Error('Result not found');
      }

      const exportedData = await this.resultsManager.exportResult(result, format);

      // Save to file
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`biomni_result.${format}`),
        filters: this.getExportFilters(format),
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(exportedData, 'utf8'));
        vscode.window.showInformationMessage(`Results exported to ${uri.fsPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.resultsManager.dispose();
  }

  // Private helper methods

  /**
   * Validate BLAST parameters
   */
  private validateBlastParams(params: BlastParams): void {
    if (!params.sequence || params.sequence.trim().length === 0) {
      throw new Error('Sequence is required');
    }

    if (params.sequence.length > 100000) {
      throw new Error('Sequence too long (max 100,000 characters)');
    }

    if (params.evalue && (params.evalue < 0 || params.evalue > 1000)) {
      throw new Error('E-value must be between 0 and 1000');
    }

    if (params.maxTargetSeqs && (params.maxTargetSeqs < 1 || params.maxTargetSeqs > 5000)) {
      throw new Error('Max target sequences must be between 1 and 5000');
    }
  }

  /**
   * Validate DNA/RNA/protein sequence
   */
  private validateSequence(sequence: string): void {
    if (!sequence || sequence.trim().length === 0) {
      throw new Error('Sequence is required');
    }

    if (sequence.length > 1000000) {
      throw new Error('Sequence too long (max 1,000,000 characters)');
    }

    // Basic validation - check for valid nucleotide/amino acid characters
    const validChars = /^[ATCGURYSWKMBDHVNX-]+$/i;
    if (!validChars.test(sequence.replace(/\s/g, ''))) {
      throw new Error(
        'Invalid characters in sequence. Only valid nucleotide/amino acid codes are allowed.'
      );
    }
  }

  /**
   * Get file filters for export dialog
   */
  private getExportFilters(format: string): Record<string, string[]> {
    const filters: Record<string, Record<string, string[]>> = {
      csv: { 'CSV Files': ['csv'] },
      json: { 'JSON Files': ['json'] },
      fasta: { 'FASTA Files': ['fasta', 'fa', 'fas'] },
      genbank: { 'GenBank Files': ['gb', 'gbk'] },
    };

    return filters[format] || { 'All Files': ['*'] };
  }
}
