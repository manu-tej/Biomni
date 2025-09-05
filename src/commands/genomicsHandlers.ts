import * as vscode from 'vscode';
import { GenomicsTools, BlastParams, AnnotationOptions } from '../tools/genomics/index';
import { GenomicsResultsPanel } from '../views/results/webview';
import { GenomicsResultsManager } from '../tools/results/manager';

/**
 * Specialized command handlers for genomics operations
 */
export class GenomicsCommandHandlers {
  private genomicsTools: GenomicsTools;
  private resultsManager: GenomicsResultsManager;

  constructor(
    private context: vscode.ExtensionContext,
    mcpProvider: any
  ) {
    this.resultsManager = new GenomicsResultsManager(context);
    this.genomicsTools = new GenomicsTools(context, mcpProvider);
  }

  /**
   * Handle BLAST sequence search command
   */
  async handleBlastSequence(): Promise<void> {
    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      // Show BLAST parameters dialog
      const params = await this.showBlastParametersDialog(sequence);
      if (!params) {
        return;
      }

      // Perform BLAST search
      const results = await this.genomicsTools.performBlastSearch(params);

      // Show results in interactive panel
      GenomicsResultsPanel.createOrShow(this.context, this.resultsManager, results);

      vscode.window.showInformationMessage(
        `BLAST search completed with ${results.hits.length} hits`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`BLAST search failed: ${errorMessage}`);
    }
  }

  /**
   * Handle gene annotation command
   */
  async handleAnnotateGenes(): Promise<void> {
    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      // Show annotation options dialog
      const options = await this.showAnnotationOptionsDialog();

      // Perform gene annotation
      const results = await this.genomicsTools.annotateGenes(sequence, options);

      // Show results in interactive panel
      GenomicsResultsPanel.createOrShow(this.context, this.resultsManager, results);

      const summary = `Found ${results.orfs.length} ORFs, ${results.domains.length} domains, ${results.features.length} features`;
      vscode.window.showInformationMessage(`Gene annotation completed: ${summary}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Gene annotation failed: ${errorMessage}`);
    }
  }

  /**
   * Handle sequence analysis command
   */
  async handleAnalyzeSequence(): Promise<void> {
    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      // Perform sequence analysis
      const results = await this.genomicsTools.analyzeSequence(sequence);

      // Show results in interactive panel
      GenomicsResultsPanel.createOrShow(this.context, this.resultsManager, results);

      const summary = `Analyzed ${results.length} bp sequence (${results.gcContent.toFixed(1)}% GC, ${results.restrictions.length} restriction sites)`;
      vscode.window.showInformationMessage(`Sequence analysis completed: ${summary}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Sequence analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Handle find ORFs command
   */
  async handleFindORFs(): Promise<void> {
    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      // Show ORF options dialog
      const minLength = await this.showORFOptionsDialog();
      if (minLength === undefined) {
        return;
      }

      // Perform annotation focusing on ORFs
      const options: AnnotationOptions = {
        findOrfs: true,
        translateOrfs: true,
        findDomains: false,
        predictFunction: false,
        annotateFeatures: false,
      };

      const results = await this.genomicsTools.annotateGenes(sequence, options);

      // Show results in interactive panel
      GenomicsResultsPanel.createOrShow(this.context, this.resultsManager, results);

      vscode.window.showInformationMessage(`Found ${results.orfs.length} ORFs`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`ORF finding failed: ${errorMessage}`);
    }
  }

  /**
   * Handle translate sequence command
   */
  async handleTranslateSequence(): Promise<void> {
    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      // Show translation options
      const options = await this.showTranslationOptionsDialog();
      if (!options) {
        return;
      }

      // Create a new document with translations
      await this.showTranslationResults(sequence, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Handle show results command
   */
  async handleShowResults(): Promise<void> {
    try {
      GenomicsResultsPanel.createOrShow(this.context, this.resultsManager);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to show results: ${errorMessage}`);
    }
  }

  /**
   * Handle export results command
   */
  async handleExportResults(): Promise<void> {
    try {
      // Get analysis history
      const history = await this.resultsManager.getHistory();

      if (history.length === 0) {
        vscode.window.showInformationMessage('No results available to export');
        return;
      }

      // Show results picker
      const selectedResult = await this.showResultsPicker(history);
      if (!selectedResult) {
        return;
      }

      // Show format picker
      const format = await this.showFormatPicker();
      if (!format) {
        return;
      }

      // Export the result
      await this.genomicsTools.exportResults(selectedResult.id, format);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Handle clear cache command
   */
  async handleClearCache(): Promise<void> {
    try {
      const confirmed = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all cached analysis results?',
        { modal: true },
        'Clear Cache'
      );

      if (confirmed === 'Clear Cache') {
        await this.genomicsTools.clearCache();
        vscode.window.showInformationMessage('Analysis cache cleared successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to clear cache: ${errorMessage}`);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.genomicsTools.dispose();
    this.resultsManager.dispose();
  }

  // Private helper methods

  /**
   * Get sequence input from user or active editor
   */
  private async getSequenceInput(): Promise<string | undefined> {
    const activeEditor = vscode.window.activeTextEditor;

    // Try to get sequence from selection or active file
    if (activeEditor) {
      const selection = activeEditor.selection;
      if (!selection.isEmpty) {
        return activeEditor.document.getText(selection).replace(/\s/g, '');
      }

      // Check if it's a biological file
      const fileExtension = activeEditor.document.uri.fsPath.split('.').pop()?.toLowerCase();
      const bioExtensions = ['fasta', 'fa', 'fas', 'seq', 'fna', 'ffn', 'frn'];

      if (bioExtensions.includes(fileExtension || '')) {
        const content = activeEditor.document.getText();
        const sequence = this.parseFastaSequence(content);
        if (sequence) {
          return sequence;
        }
      }
    }

    // If no sequence found, ask user to input
    return await vscode.window.showInputBox({
      prompt: 'Enter DNA/RNA/protein sequence',
      placeHolder: 'ATCGATCGATCG...',
      validateInput: value => {
        if (!value || value.trim().length < 10) {
          return 'Please enter a sequence of at least 10 characters';
        }
        if (!/^[ATCGURYSWKMBDHVNX\-\s]+$/i.test(value)) {
          return 'Invalid characters in sequence. Only nucleotides and amino acids are allowed.';
        }
        return undefined;
      },
    });
  }

  /**
   * Parse FASTA format to extract sequence
   */
  private parseFastaSequence(content: string): string | undefined {
    const lines = content.split('\n');
    const sequenceLines: string[] = [];

    for (const line of lines) {
      if (!line.startsWith('>') && line.trim()) {
        sequenceLines.push(line.trim());
      }
    }

    const sequence = sequenceLines.join('').replace(/\s/g, '');
    return sequence.length > 0 ? sequence : undefined;
  }

  /**
   * Show BLAST parameters dialog
   */
  private async showBlastParametersDialog(sequence: string): Promise<BlastParams | undefined> {
    // Determine likely sequence type
    const cleanSeq = sequence.replace(/\s/g, '').toUpperCase();
    const nucleotideChars = (cleanSeq.match(/[ATCGUN]/g) || []).length;
    const isNucleotide = nucleotideChars / cleanSeq.length > 0.8;

    const program = await vscode.window.showQuickPick(
      [
        { label: 'blastn', description: 'Nucleotide-nucleotide BLAST' },
        { label: 'blastp', description: 'Protein-protein BLAST' },
        { label: 'blastx', description: 'Translated nucleotide vs protein' },
        { label: 'tblastn', description: 'Protein vs translated nucleotide' },
        { label: 'tblastx', description: 'Translated nucleotide vs translated nucleotide' },
      ],
      {
        placeHolder: `Select BLAST program (detected: ${isNucleotide ? 'nucleotide' : 'protein'} sequence)`,
      }
    );

    if (!program) {
      return undefined;
    }

    const database = await vscode.window.showQuickPick(
      [
        { label: 'nr', description: 'Non-redundant protein sequences' },
        { label: 'nt', description: 'Non-redundant nucleotide sequences' },
        { label: 'refseq_protein', description: 'RefSeq protein sequences' },
        { label: 'refseq_genomic', description: 'RefSeq genomic sequences' },
        { label: 'swissprot', description: 'Swiss-Prot protein sequences' },
        { label: 'pdb', description: 'Protein Data Bank sequences' },
      ],
      { placeHolder: 'Select BLAST database' }
    );

    if (!database) {
      return undefined;
    }

    return {
      sequence,
      program: program.label as any,
      database: database.label as any,
      evalue: 10.0,
      maxTargetSeqs: 100,
    };
  }

  /**
   * Show annotation options dialog
   */
  private async showAnnotationOptionsDialog(): Promise<AnnotationOptions> {
    const options = await vscode.window.showQuickPick(
      [
        {
          label: 'Complete Analysis',
          description: 'Find ORFs, domains, features, and predict functions',
          picked: true,
        },
        { label: 'ORFs Only', description: 'Only find open reading frames' },
        { label: 'Domains Only', description: 'Only find protein domains' },
        { label: 'Features Only', description: 'Only annotate genomic features' },
        { label: 'Custom', description: 'Choose specific analysis steps' },
      ],
      { placeHolder: 'Select annotation scope' }
    );

    if (!options) {
      return {};
    }

    switch (options.label) {
      case 'Complete Analysis':
        return {
          findOrfs: true,
          translateOrfs: true,
          findDomains: true,
          predictFunction: true,
          annotateFeatures: true,
        };
      case 'ORFs Only':
        return { findOrfs: true, translateOrfs: true };
      case 'Domains Only':
        return { findDomains: true };
      case 'Features Only':
        return { annotateFeatures: true };
      case 'Custom':
        // TODO: Implement custom options dialog
        return {
          findOrfs: true,
          translateOrfs: true,
          findDomains: true,
          predictFunction: true,
          annotateFeatures: true,
        };
      default:
        return {};
    }
  }

  /**
   * Show ORF finding options dialog
   */
  private async showORFOptionsDialog(): Promise<number | undefined> {
    const minLength = await vscode.window.showInputBox({
      prompt: 'Enter minimum ORF length (in base pairs)',
      value: '100',
      validateInput: value => {
        const num = parseInt(value);
        if (isNaN(num) || num < 30) {
          return 'Please enter a number greater than 30';
        }
        return undefined;
      },
    });

    return minLength ? parseInt(minLength) : undefined;
  }

  /**
   * Show translation options dialog
   */
  private async showTranslationOptionsDialog(): Promise<
    { frames: number[]; geneticCode: number } | undefined
  > {
    const frameOption = await vscode.window.showQuickPick(
      [
        {
          label: 'All 6 frames',
          description: 'Translate in all reading frames (+1, +2, +3, -1, -2, -3)',
          frames: [1, 2, 3, -1, -2, -3],
        },
        {
          label: 'Forward frames only',
          description: 'Translate in forward frames (+1, +2, +3)',
          frames: [1, 2, 3],
        },
        { label: 'Frame +1', description: 'Translate in reading frame +1', frames: [1] },
        { label: 'Frame +2', description: 'Translate in reading frame +2', frames: [2] },
        { label: 'Frame +3', description: 'Translate in reading frame +3', frames: [3] },
      ],
      { placeHolder: 'Select reading frames to translate' }
    );

    if (!frameOption) {
      return undefined;
    }

    const geneticCode = await vscode.window.showQuickPick(
      [
        { label: 'Standard (1)', description: 'Universal genetic code', value: 1 },
        {
          label: 'Vertebrate Mitochondrial (2)',
          description: 'Vertebrate mitochondrial code',
          value: 2,
        },
        { label: 'Bacterial/Archaeal (11)', description: 'Bacterial and archaeal code', value: 11 },
      ],
      { placeHolder: 'Select genetic code table' }
    );

    return {
      frames: frameOption.frames,
      geneticCode: geneticCode?.value || 1,
    };
  }

  /**
   * Show translation results in new document
   */
  private async showTranslationResults(
    sequence: string,
    options: { frames: number[]; geneticCode: number }
  ): Promise<void> {
    let content = `Translation Results\n${'='.repeat(50)}\n\n`;
    content += `Original sequence (${sequence.length} bp):\n${sequence}\n\n`;

    // TODO: Implement actual translation logic
    // For now, show placeholder
    content += 'Translation Results:\n';
    options.frames.forEach(frame => {
      content += `\nFrame ${frame > 0 ? '+' : ''}${frame}:\n`;
      content += `[Translation would be shown here]\n`;
    });

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'plaintext',
    });

    await vscode.window.showTextDocument(doc);
  }

  /**
   * Show results picker for export
   */
  private async showResultsPicker(history: any[]): Promise<any | undefined> {
    const items = history.map(item => ({
      label: `${item.type.toUpperCase()} - ${new Date(item.timestamp).toLocaleString()}`,
      description: `${item.sequence.substring(0, 50)}...`,
      item,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select result to export',
    });

    return selected?.item;
  }

  /**
   * Show export format picker
   */
  private async showFormatPicker(): Promise<'csv' | 'json' | 'fasta' | 'genbank' | undefined> {
    const format = await vscode.window.showQuickPick(
      [
        { label: 'CSV', description: 'Comma-separated values format', value: 'csv' as const },
        { label: 'JSON', description: 'JavaScript Object Notation format', value: 'json' as const },
        { label: 'FASTA', description: 'FASTA sequence format', value: 'fasta' as const },
        { label: 'GenBank', description: 'GenBank flat file format', value: 'genbank' as const },
      ],
      { placeHolder: 'Select export format' }
    );

    return format?.value;
  }
}
