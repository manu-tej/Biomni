import * as vscode from 'vscode';
import { BiomniMcpClient } from '../biomni/mcpClient';
import { BiomniSettingsService } from '../settings';

/**
 * Command execution result interface
 */
interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Progress indicator interface for long-running operations
 */
interface ProgressOptions {
  title: string;
  location: vscode.ProgressLocation;
  cancellable: boolean;
}

/**
 * Command handler class that integrates with MCP client
 */
export class BiomniCommandHandlers {
  private mcpClient: BiomniMcpClient | undefined;
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext | undefined;

  constructor(mcpClient?: BiomniMcpClient, context?: vscode.ExtensionContext) {
    console.log('BiomniCommandHandlers constructor called');
    this.mcpClient = mcpClient;
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Biomni');
    // Ensure the output channel is visible in the Output dropdown
    // by writing an initialization line at construction time.
    try {
      this.outputChannel.appendLine('Biomni output initialized');
      console.log(
        'BiomniCommandHandlers initialized with methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(m => m.startsWith('handle'))
          .length,
        'handlers'
      );
    } catch {
      // noop
    }
  }

  /**
   * Update MCP client reference
   */
  updateMcpClient(mcpClient: BiomniMcpClient): void {
    this.mcpClient = mcpClient;
  }

  /**
   * Execute a command with progress indication and error handling
   */
  private async executeWithProgress<T>(
    progressOptions: ProgressOptions,
    operation: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(progressOptions, operation);
  }

  /**
   * Log command execution to output channel
   */
  private logCommand(command: string, args?: any, result?: CommandResult): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] Command: ${command}`);

    if (args) {
      this.outputChannel.appendLine(`  Args: ${JSON.stringify(args, null, 2)}`);
    }

    if (result) {
      this.outputChannel.appendLine(`  Result: ${result.success ? 'SUCCESS' : 'ERROR'}`);
      if (result.message) {
        this.outputChannel.appendLine(`  Message: ${result.message}`);
      }
      if (result.error) {
        this.outputChannel.appendLine(`  Error: ${result.error}`);
      }
    }

    this.outputChannel.appendLine(''); // Add spacing
  }

  /**
   * Get current file context for commands
   */
  private getCurrentFileContext(): { path?: string; extension?: string; content?: string } {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return {};
    }

    const document = activeEditor.document;
    const path = document.fileName;
    const extension = path.split('.').pop()?.toLowerCase();
    const content = document.getText();

    const result: { path?: string; extension?: string; content?: string } = {};

    if (path) {
      result.path = path;
    }
    if (extension) {
      result.extension = extension;
    }
    if (content) {
      result.content = content;
    }

    return result;
  }

  /**
   * Validate MCP client availability
   */
  private validateMcpClient(): boolean {
    if (!this.mcpClient) {
      void vscode.window.showErrorMessage(
        'Biomni MCP client is not initialized. Please activate the extension first.'
      );
      return false;
    }
    return true;
  }

  // === DATABASE QUERY HANDLERS ===

  /**
   * Handle UniProt database queries
   */
  async handleQueryUniprot(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Enter your UniProt query (e.g., "Find information about human insulin")',
        placeHolder: 'human insulin protein',
        validateInput: value => (value.trim() ? null : 'Query cannot be empty'),
      });

      if (!prompt) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Querying UniProt Database',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Searching UniProt...' });

          const response = await this.mcpClient!.callTool('query_uniprot', {
            prompt,
            max_results: 5,
          });

          return response;
        }
      );

      this.logCommand('handleQueryUniprot', { prompt }, { success: true, data: result });

      if (result.result) {
        // Display results in a new document
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('UniProt query completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleQueryUniprot', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`UniProt query failed: ${errorMsg}`);
    }
  }

  /**
   * Handle PDB database queries
   */
  async handleQueryPDB(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Enter your PDB query (e.g., "Find structures of HIV protease")',
        placeHolder: 'HIV protease structures',
        validateInput: value => (value.trim() ? null : 'Query cannot be empty'),
      });

      if (!prompt) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Querying Protein Data Bank',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Searching PDB...' });

          const response = await this.mcpClient!.callTool('query_pdb', {
            prompt,
            max_results: 3,
          });

          return response;
        }
      );

      this.logCommand('handleQueryPDB', { prompt }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('PDB query completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleQueryPDB', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`PDB query failed: ${errorMsg}`);
    }
  }

  /**
   * Handle AlphaFold database queries
   */
  async handleQueryAlphaFold(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const uniprotId = await vscode.window.showInputBox({
        prompt: 'Enter UniProt accession ID (e.g., P12345)',
        placeHolder: 'P12345',
        validateInput: value => {
          const trimmed = value.trim();
          if (!trimmed) {
            return 'UniProt ID cannot be empty';
          }
          if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
            return 'Invalid UniProt ID format';
          }
          return null;
        },
      });

      if (!uniprotId) {
        return;
      }

      const downloadStructure = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Download structure file?',
      });

      const result = await this.executeWithProgress(
        {
          title: 'Querying AlphaFold Database',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Fetching AlphaFold prediction...' });

          const response = await this.mcpClient!.callTool('query_alphafold', {
            uniprot_id: uniprotId.trim(),
            download: downloadStructure === 'Yes',
            file_format: 'pdb',
            model_version: 'v4',
          });

          return response;
        }
      );

      this.logCommand('handleQueryAlphaFold', { uniprotId }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('AlphaFold query completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleQueryAlphaFold', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`AlphaFold query failed: ${errorMsg}`);
    }
  }

  /**
   * Handle InterPro database queries
   */
  async handleQueryInterPro(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Enter your InterPro query (e.g., "zinc finger domains")',
        placeHolder: 'zinc finger domains',
        validateInput: value => (value.trim() ? null : 'Query cannot be empty'),
      });

      if (!prompt) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Querying InterPro Database',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Searching InterPro...' });

          const response = await this.mcpClient!.callTool('query_interpro', {
            prompt,
            max_results: 3,
          });

          return response;
        }
      );

      this.logCommand('handleQueryInterPro', { prompt }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('InterPro query completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleQueryInterPro', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`InterPro query failed: ${errorMsg}`);
    }
  }

  // === GENOMICS HANDLERS ===

  /**
   * Handle BLAST sequence search
   */
  async handleBlastSequence(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const { content } = this.getCurrentFileContext();

      let sequence = '';
      if (content) {
        // Try to extract sequence from FASTA content
        const lines = content.split('\n').filter(line => !line.startsWith('>'));
        sequence = lines.join('').replace(/\s+/g, '');
      }

      if (!sequence) {
        sequence =
          (await vscode.window.showInputBox({
            prompt: 'Enter sequence for BLAST search',
            placeHolder: 'ATCGATCGATCG...',
            validateInput: value => {
              const trimmed = value.trim();
              if (!trimmed) {
                return 'Sequence cannot be empty';
              }
              if (trimmed.length < 10) {
                return 'Sequence too short for BLAST';
              }
              return null;
            },
          })) || '';
      }

      if (!sequence) {
        return;
      }

      const database = await vscode.window.showQuickPick(
        ['nt', 'nr', 'refseq_genomic', 'refseq_protein', 'swissprot'],
        { placeHolder: 'Select BLAST database' }
      );

      if (!database) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Running BLAST Search',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Submitting BLAST job...' });

          // Note: This would call the actual BLAST tool through MCP
          const response = await this.mcpClient!.callTool('blast_sequence', {
            sequence,
            database,
            max_target_sequences: 10,
            e_value: 0.01,
          });

          return response;
        }
      );

      this.logCommand(
        'handleBlastSequence',
        { sequence: sequence.substring(0, 50) + '...', database },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('BLAST search completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleBlastSequence', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`BLAST search failed: ${errorMsg}`);
    }
  }

  /**
   * Handle scRNA-seq annotation
   */
  async handleAnnotateScRNA(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const { path } = this.getCurrentFileContext();

      let filePath = path;
      if (!filePath) {
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'Single Cell Data': ['h5', 'h5ad', 'csv', 'xlsx'],
          },
        });

        if (fileUri && fileUri.length > 0 && fileUri[0]) {
          filePath = fileUri[0].fsPath;
        }
      }

      if (!filePath) {
        void vscode.window.showWarningMessage('Please select a single cell data file');
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Annotating Single Cell Data',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Loading and processing data...' });

          const response = await this.mcpClient!.callTool('annotate_celltype_scRNA', {
            adata_filename: filePath,
          });

          return response;
        }
      );

      this.logCommand('handleAnnotateScRNA', { filePath }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('scRNA-seq annotation completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleAnnotateScRNA', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`scRNA-seq annotation failed: ${errorMsg}`);
    }
  }

  /**
   * Handle coordinate liftover
   */
  async handleLiftoverCoordinates(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const chromosome = await vscode.window.showInputBox({
        prompt: 'Enter chromosome (e.g., chr1, 1)',
        placeHolder: 'chr1',
      });

      if (!chromosome) {
        return;
      }

      const positionStr = await vscode.window.showInputBox({
        prompt: 'Enter position',
        placeHolder: '100000',
        validateInput: value => {
          const num = parseInt(value);
          if (isNaN(num) || num <= 0) {
            return 'Please enter a valid positive number';
          }
          return null;
        },
      });

      if (!positionStr) {
        return;
      }
      const position = parseInt(positionStr);

      const inputFormat = await vscode.window.showQuickPick(['hg19', 'hg38', 'mm9', 'mm10'], {
        placeHolder: 'Select input genome build',
      });

      if (!inputFormat) {
        return;
      }

      const outputFormat = await vscode.window.showQuickPick(
        ['hg19', 'hg38', 'mm9', 'mm10'].filter(format => format !== inputFormat),
        { placeHolder: 'Select output genome build' }
      );

      if (!outputFormat) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Performing Coordinate Liftover',
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
        },
        async (progress, _token) => {
          progress.report({ message: 'Converting coordinates...' });

          const response = await this.mcpClient!.callTool('liftover_coordinates', {
            chromosome,
            position,
            input_format: inputFormat,
            output_format: outputFormat,
          });

          return response;
        }
      );

      this.logCommand(
        'handleLiftoverCoordinates',
        { chromosome, position, inputFormat, outputFormat },
        { success: true, data: result }
      );

      if (result.result) {
        void vscode.window.showInformationMessage(
          `Liftover result: ${JSON.stringify(result.result)}`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleLiftoverCoordinates', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Coordinate liftover failed: ${errorMsg}`);
    }
  }

  // === PHARMACOLOGY HANDLERS ===

  /**
   * Handle molecular docking with DiffDock
   */
  async handleRunDiffDock(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const pdbFile = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'PDB Files': ['pdb'],
        },
      });

      if (!pdbFile || pdbFile.length === 0) {
        void vscode.window.showWarningMessage('Please select a PDB file');
        return;
      }

      const smiles = await vscode.window.showInputBox({
        prompt: 'Enter SMILES string for the ligand',
        placeHolder: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',
        validateInput: value => (value.trim() ? null : 'SMILES string cannot be empty'),
      });

      if (!smiles) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Running DiffDock Molecular Docking',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Setting up docking simulation...' });

          const response = await this.mcpClient!.callTool('run_diffdock_with_smiles', {
            pdb_path: pdbFile[0]?.fsPath || '',
            smiles_string: smiles,
            use_gpu: true,
          });

          return response;
        }
      );

      this.logCommand(
        'handleRunDiffDock',
        { pdb_path: pdbFile[0]?.fsPath || '', smiles },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('DiffDock docking completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleRunDiffDock', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`DiffDock failed: ${errorMsg}`);
    }
  }

  /**
   * Handle ADMET prediction
   */
  async handlePredictADMET(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const smiles = await vscode.window.showInputBox({
        prompt: 'Enter SMILES string for ADMET prediction',
        placeHolder: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',
        validateInput: value => (value.trim() ? null : 'SMILES string cannot be empty'),
      });

      if (!smiles) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Predicting ADMET Properties',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Calculating molecular properties...' });

          // Note: This would use a general query tool to predict ADMET properties
          const response = await this.mcpClient!.callTool('run_python_repl', {
            command: `
from biomni.agent import A1
agent = A1()
result = agent.go(f"Predict ADMET properties for compound: ${smiles}")
print(result)
`,
          });

          return response;
        }
      );

      this.logCommand('handlePredictADMET', { smiles }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('ADMET prediction completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handlePredictADMET', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`ADMET prediction failed: ${errorMsg}`);
    }
  }

  // === SYSTEMS BIOLOGY HANDLERS ===

  /**
   * Handle flux balance analysis
   */
  async handleFluxBalanceAnalysis(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const modelFile = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Model Files': ['xml', 'sbml', 'json', 'mat'],
        },
      });

      if (!modelFile || modelFile.length === 0) {
        void vscode.window.showWarningMessage('Please select a metabolic model file');
        return;
      }

      const objectiveReaction = await vscode.window.showInputBox({
        prompt: 'Enter objective reaction ID (optional)',
        placeHolder: 'BIOMASS_Ecoli_core_w_GAM',
      });

      const result = await this.executeWithProgress(
        {
          title: 'Running Flux Balance Analysis',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Loading metabolic model...' });

          const response = await this.mcpClient!.callTool('perform_flux_balance_analysis', {
            model_file: modelFile[0]?.fsPath || '',
            objective_reaction: objectiveReaction || undefined,
          });

          return response;
        }
      );

      this.logCommand(
        'handleFluxBalanceAnalysis',
        { model_file: modelFile[0]?.fsPath || '', objectiveReaction },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('Flux balance analysis completed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleFluxBalanceAnalysis', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Flux balance analysis failed: ${errorMsg}`);
    }
  }

  // === ANALYSIS HANDLERS ===

  /**
   * Handle protein disorder prediction
   */
  async handleProteinDisorderRegions(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const { content } = this.getCurrentFileContext();

      let sequence = '';
      if (content) {
        // Try to extract sequence from FASTA content
        const lines = content.split('\n').filter(line => !line.startsWith('>'));
        sequence = lines.join('').replace(/\s+/g, '');
      }

      if (!sequence) {
        sequence =
          (await vscode.window.showInputBox({
            prompt: 'Enter protein sequence',
            placeHolder:
              'MKWVTFISLLLLFSSAYSRGVFRRDTHKSEIAHRFKDLGEEHFKGLVLIAFSQYLQQCPFDEHVKLVNELTEFAKTCVADESHAGCEKSLHTLFGDELCKVASLRETYGDMADCCEKQEPERNECFLSHKDDSPDLPKLKPDPNTLCDEFKADEKKFWGKYLYEIARRHPYFYAPELLYYANKYNGVFQECCQAEDKGACLLPKIETMREKVLASSARQRLRCASIQKFGERALKAWSVARLSQKFPKAEFVEVTKLVTDLTKVHKECCHGDLLECADDRADLAKYICDNQDTISSKLKECCDKPVNGFNPKMVQYAKTDYGNPSSACGKCQRRGKNTHHRSGNRYHSIDVHVPDHNDCFNKLLSEDIKE',
            validateInput: value => {
              const trimmed = value.trim();
              if (!trimmed) {
                return 'Sequence cannot be empty';
              }
              if (!/^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(trimmed)) {
                return 'Invalid protein sequence';
              }
              return null;
            },
          })) || '';
      }

      if (!sequence) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Predicting Protein Disorder Regions',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Analyzing sequence...' });

          const response = await this.mcpClient!.callTool('predict_protein_disorder_regions', {
            protein_sequence: sequence,
            threshold: 0.5,
          });

          return response;
        }
      );

      this.logCommand(
        'handleProteinDisorderRegions',
        { sequence: sequence.substring(0, 50) + '...' },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage(
        'Protein disorder prediction completed successfully'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleProteinDisorderRegions', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Protein disorder prediction failed: ${errorMsg}`);
    }
  }

  async handleValidateFormat(): Promise<void> {
    try {
      // Get the active file
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        void vscode.window.showWarningMessage('Please open a biological file to validate');
        return;
      }

      const document = activeEditor.document;
      const fileName = document.fileName;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const content = document.getText();

      // Validate based on file type
      let isValid = false;
      let errors: string[] = [];
      let fileType = '';

      switch (fileExtension) {
        case 'fasta':
        case 'fa':
        case 'fas':
        case 'fna':
          fileType = 'FASTA';
          const fastaValidation = this.validateFastaFormat(content);
          isValid = fastaValidation.isValid;
          errors = fastaValidation.errors;
          break;

        case 'fastq':
        case 'fq':
          fileType = 'FASTQ';
          const fastqValidation = this.validateFastqFormat(content);
          isValid = fastqValidation.isValid;
          errors = fastqValidation.errors;
          break;

        case 'vcf':
          fileType = 'VCF';
          const vcfValidation = this.validateVcfFormat(content);
          isValid = vcfValidation.isValid;
          errors = vcfValidation.errors;
          break;

        case 'pdb':
          fileType = 'PDB';
          const pdbValidation = this.validatePdbFormat(content);
          isValid = pdbValidation.isValid;
          errors = pdbValidation.errors;
          break;

        default:
          void vscode.window.showWarningMessage(
            `File type .${fileExtension} is not currently supported for validation`
          );
          return;
      }

      // Show validation results
      if (isValid) {
        void vscode.window.showInformationMessage(`✅ ${fileType} file is valid!`);
      } else {
        // Show detailed error in output channel
        const outputChannel = vscode.window.createOutputChannel('Biomni File Validation');
        outputChannel.clear();
        outputChannel.appendLine(`File: ${fileName}`);
        outputChannel.appendLine(`Type: ${fileType}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('Validation Errors:');
        errors.forEach(error => outputChannel.appendLine(`  - ${error}`));
        outputChannel.show();

        void vscode.window.showErrorMessage(
          `${fileType} validation failed. See Output panel for details.`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`File validation failed: ${errorMsg}`);
    }
  }

  private validateFastaFormat(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');
    let lineNum = 0;
    let hasSequence = false;

    for (const line of lines) {
      lineNum++;
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine.length === 0) {
        continue;
      }

      // Check header line
      if (trimmedLine.startsWith('>')) {
        if (trimmedLine.length === 1) {
          errors.push(`Line ${lineNum}: Empty header (missing description)`);
        }
        hasSequence = false;
      } else {
        // Check sequence line
        hasSequence = true;

        // Remove spaces for validation (spaces are allowed in FASTA for readability)
        const sequenceNoSpaces = trimmedLine.replace(/\s/g, '');

        // Validate sequence characters (allow standard nucleotides and amino acids)
        // Extended set includes: standard amino acids, nucleotides, ambiguity codes, gaps, and stop
        const validChars = /^[ACDEFGHIKLMNPQRSTVWYBZXU*-]+$/i;
        if (!validChars.test(sequenceNoSpaces)) {
          // Find the invalid character for better error message
          const invalidChar = sequenceNoSpaces.split('').find(char => !validChars.test(char));
          errors.push(`Line ${lineNum}: Invalid character '${invalidChar}' in sequence`);
        }
      }
    }

    if (!hasSequence) {
      errors.push('File contains no sequences');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateFastqFormat(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    if (lines.length % 4 !== 0) {
      errors.push(`FASTQ file should have lines in groups of 4, found ${lines.length} lines`);
    }

    for (let i = 0; i < lines.length; i += 4) {
      const recordNum = Math.floor(i / 4) + 1;

      // Check header
      const header = lines[i];
      if (header && !header.startsWith('@')) {
        errors.push(`Record ${recordNum}: Header should start with @`);
      }

      // Check separator
      const separator = lines[i + 2];
      if (separator && !separator.startsWith('+')) {
        errors.push(`Record ${recordNum}: Third line should start with +`);
      }

      // Check sequence and quality length
      const sequence = lines[i + 1];
      const quality = lines[i + 3];
      if (sequence && quality) {
        const seqLength = sequence.length;
        const qualLength = quality.length;
        if (seqLength !== qualLength) {
          errors.push(
            `Record ${recordNum}: Sequence and quality lengths don't match (${seqLength} vs ${qualLength})`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateVcfFormat(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');
    let hasHeader = false;
    let hasColumnHeader = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        continue;
      }

      // Check meta-information lines
      if (trimmedLine.startsWith('##')) {
        hasHeader = true;
        continue;
      }

      // Check column header
      if (trimmedLine.startsWith('#CHROM')) {
        hasColumnHeader = true;
        const columns = trimmedLine.split('\t');
        if (columns.length < 8) {
          errors.push('Column header should have at least 8 columns');
        }
        continue;
      }

      // Check data lines
      const columns = trimmedLine.split('\t');
      if (columns.length < 8) {
        errors.push(`Data line has ${columns.length} columns, expected at least 8`);
      }
    }

    if (!hasHeader) {
      errors.push('Missing VCF header (## lines)');
    }
    if (!hasColumnHeader) {
      errors.push('Missing column header (#CHROM line)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validatePdbFormat(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');
    let hasHeader = false;
    let hasAtom = false;
    let hasEnd = false;

    for (const line of lines) {
      if (line.startsWith('HEADER')) {
        hasHeader = true;
      } else if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        hasAtom = true;
        // Check line length (PDB format has fixed column widths)
        if (line.length < 54) {
          errors.push('ATOM/HETATM line too short (should be at least 54 characters)');
        }
      } else if (line.startsWith('END')) {
        hasEnd = true;
      }
    }

    if (!hasHeader) {
      errors.push('Missing HEADER record');
    }
    if (!hasAtom) {
      errors.push('No ATOM or HETATM records found');
    }
    if (!hasEnd) {
      errors.push('Missing END record');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async handleShowInfo(): Promise<void> {
    try {
      // Get the active file
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        void vscode.window.showWarningMessage('Please open a file to show information');
        return;
      }

      const document = activeEditor.document;
      const fileName = document.fileName;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const content = document.getText();
      const lines = content.split('\n');

      // Get file stats
      const filePath = document.uri.fsPath;
      const stats = await vscode.workspace.fs.stat(document.uri);

      // Analyze based on file type
      let fileInfo: any = {
        'File Name': fileName.split('/').pop(),
        'File Path': filePath,
        'File Size': `${(stats.size / 1024).toFixed(2)} KB`,
        'Total Lines': lines.length,
        'File Type': fileExtension?.toUpperCase() || 'Unknown',
      };

      // Add specific info based on file type
      switch (fileExtension) {
        case 'fasta':
        case 'fa':
        case 'fas':
        case 'fna':
        case 'faa':
          const fastaInfo = this.analyzeFastaFile(content);
          fileInfo = { ...fileInfo, ...fastaInfo };
          break;

        case 'fastq':
        case 'fq':
          const fastqInfo = this.analyzeFastqFile(content);
          fileInfo = { ...fileInfo, ...fastqInfo };
          break;

        case 'vcf':
          const vcfInfo = this.analyzeVcfFile(content);
          fileInfo = { ...fileInfo, ...vcfInfo };
          break;

        case 'pdb':
          const pdbInfo = this.analyzePdbFile(content);
          fileInfo = { ...fileInfo, ...pdbInfo };
          break;
      }

      // Create formatted output
      const outputChannel = vscode.window.createOutputChannel('Biomni File Information');
      outputChannel.clear();
      outputChannel.appendLine('═══════════════════════════════════════');
      outputChannel.appendLine('         BIOMNI FILE INFORMATION       ');
      outputChannel.appendLine('═══════════════════════════════════════');
      outputChannel.appendLine('');

      for (const [key, value] of Object.entries(fileInfo)) {
        outputChannel.appendLine(`${key.padEnd(20)}: ${value}`);
      }

      outputChannel.appendLine('');
      outputChannel.appendLine('═══════════════════════════════════════');
      outputChannel.show();

      void vscode.window.showInformationMessage('File information displayed in Output panel');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Failed to show file info: ${errorMsg}`);
    }
  }

  private analyzeFastaFile(content: string): any {
    const lines = content.split('\n');
    let sequenceCount = 0;
    let totalSequenceLength = 0;
    let currentSequenceLength = 0;
    let sequenceLengths: number[] = [];
    let sequenceHeaders: string[] = [];
    let sequenceTypes = new Set<string>();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('>')) {
        if (currentSequenceLength > 0) {
          sequenceLengths.push(currentSequenceLength);
          totalSequenceLength += currentSequenceLength;
          currentSequenceLength = 0;
        }
        sequenceCount++;
        sequenceHeaders.push(trimmedLine.substring(1).trim());
      } else if (trimmedLine.length > 0) {
        currentSequenceLength += trimmedLine.replace(/\s/g, '').length;

        // Detect sequence type
        const seqNoSpace = trimmedLine.replace(/\s/g, '').toUpperCase();
        if (/^[ACGTU]+$/.test(seqNoSpace)) {
          sequenceTypes.add('Nucleotide');
        } else if (/^[ACDEFGHIKLMNPQRSTVWY*]+$/.test(seqNoSpace)) {
          sequenceTypes.add('Protein');
        }
      }
    }

    // Add last sequence
    if (currentSequenceLength > 0) {
      sequenceLengths.push(currentSequenceLength);
      totalSequenceLength += currentSequenceLength;
    }

    const avgLength = sequenceCount > 0 ? Math.round(totalSequenceLength / sequenceCount) : 0;
    const minLength = sequenceLengths.length > 0 ? Math.min(...sequenceLengths) : 0;
    const maxLength = sequenceLengths.length > 0 ? Math.max(...sequenceLengths) : 0;

    return {
      Format: 'FASTA',
      Sequences: sequenceCount,
      'Total Residues': totalSequenceLength,
      'Avg Sequence Length': avgLength,
      'Min Sequence Length': minLength,
      'Max Sequence Length': maxLength,
      'Sequence Type': Array.from(sequenceTypes).join(', ') || 'Mixed/Unknown',
      'First Sequence ID': sequenceHeaders[0] || 'N/A',
    };
  }

  private analyzeFastqFile(content: string): any {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const recordCount = Math.floor(lines.length / 4);
    let totalSequenceLength = 0;
    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    for (let i = 1; i < lines.length; i += 4) {
      const sequence = lines[i];
      if (sequence) {
        totalSequenceLength += sequence.length;
      }
      const qualityLine = lines[i + 2];
      if (qualityLine) {
        // Analyze quality scores (ASCII to Phred)
        for (const char of qualityLine) {
          const phredScore = char.charCodeAt(0) - 33; // Assuming Phred+33
          totalQualityScore += phredScore;
          qualityScoreCount++;
        }
      }
    }

    const avgQuality =
      qualityScoreCount > 0 ? (totalQualityScore / qualityScoreCount).toFixed(1) : 'N/A';
    const avgReadLength = recordCount > 0 ? Math.round(totalSequenceLength / recordCount) : 0;

    return {
      Format: 'FASTQ',
      'Total Reads': recordCount,
      'Total Bases': totalSequenceLength,
      'Avg Read Length': avgReadLength,
      'Avg Quality Score': avgQuality,
      'Quality Encoding': 'Phred+33 (assumed)',
    };
  }

  private analyzeVcfFile(content: string): any {
    const lines = content.split('\n');
    let variantCount = 0;
    let samples: string[] = [];
    let chromosomes = new Set<string>();
    let variantTypes = new Set<string>();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#CHROM')) {
        const columns = trimmedLine.split('\t');
        samples = columns.slice(9); // Samples start from column 10
      } else if (!trimmedLine.startsWith('#') && trimmedLine.length > 0) {
        variantCount++;
        const columns = trimmedLine.split('\t');
        if (columns[0]) {
          chromosomes.add(columns[0]);
        }

        // Detect variant type
        if (columns[3] && columns[4]) {
          const ref = columns[3];
          const alt = columns[4];
          if (ref.length === 1 && alt.length === 1) {
            variantTypes.add('SNP');
          } else if (ref.length > alt.length) {
            variantTypes.add('Deletion');
          } else if (ref.length < alt.length) {
            variantTypes.add('Insertion');
          }
        }
      }
    }

    return {
      Format: 'VCF',
      'Total Variants': variantCount,
      Samples: samples.length > 0 ? samples.join(', ') : 'No samples',
      Chromosomes: Array.from(chromosomes).join(', ') || 'None',
      'Variant Types': Array.from(variantTypes).join(', ') || 'Unknown',
    };
  }

  private analyzePdbFile(content: string): any {
    const lines = content.split('\n');
    let atomCount = 0;
    let hetatomCount = 0;
    let chains = new Set<string>();
    let residues = new Set<string>();
    let title = '';
    let resolution = 'N/A';

    for (const line of lines) {
      if (line.startsWith('TITLE')) {
        title += line.substring(10).trim() + ' ';
      } else if (line.startsWith('REMARK   2 RESOLUTION')) {
        const match = line.match(/(\d+\.\d+)/);
        if (match) {
          resolution = match[1] + ' Å';
        }
      } else if (line.startsWith('ATOM')) {
        atomCount++;
        if (line.length > 21 && line[21]) {
          chains.add(line[21]);
        }
        if (line.length > 19) {
          residues.add(line.substring(17, 20).trim());
        }
      } else if (line.startsWith('HETATM')) {
        hetatomCount++;
      }
    }

    return {
      Format: 'PDB',
      Title: title.trim() || 'N/A',
      Resolution: resolution,
      'Total Atoms': atomCount,
      'Total Heteroatoms': hetatomCount,
      Chains:
        Array.from(chains)
          .filter(c => c.trim())
          .join(', ') || 'N/A',
      'Unique Residues': residues.size,
    };
  }

  async handleRunPython(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const code = await vscode.window.showInputBox({
        prompt: 'Enter Python code to execute',
        placeHolder: 'print("Hello, Biomni!")',
        validateInput: value => (value.trim() ? null : 'Code cannot be empty'),
      });

      if (!code) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Executing Python Code',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Running code...' });

          const response = await this.mcpClient!.callTool('run_python_repl', {
            command: code,
          });

          return response;
        }
      );

      this.logCommand('handleRunPython', { code }, { success: true, data: result });

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content:
            typeof result.result === 'string'
              ? result.result
              : JSON.stringify(result.result, null, 2),
          language: 'python',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('Python code executed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleRunPython', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Python execution failed: ${errorMsg}`);
    }
  }

  async handleRefreshTools(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const result = await this.executeWithProgress(
        {
          title: 'Refreshing MCP Tools',
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
        },
        async (progress, _token) => {
          progress.report({ message: 'Discovering tools...' });

          const capabilities = await this.mcpClient!.getCapabilities();
          return capabilities;
        }
      );

      this.logCommand('handleRefreshTools', {}, { success: true, data: result });

      const toolCount = result.tools?.length || 0;
      void vscode.window.showInformationMessage(
        `✅ Tool discovery refreshed! Found ${toolCount} tools.`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleRefreshTools', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Tool refresh failed: ${errorMsg}`);
    }
  }

  // === GENOMICS HANDLERS ===

  /**
   * Handle gene annotation
   */
  async handleAnnotateGenes(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      const options = await this.showAnnotationOptionsDialog();

      const result = await this.executeWithProgress(
        {
          title: 'Annotating gene sequence',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Finding ORFs and features...' });

          const response = await this.mcpClient!.callTool('biomni.annotate_genes', {
            sequence: sequence,
            find_orfs: options.findOrfs,
            translate_orfs: options.translateOrfs,
            find_domains: options.findDomains,
            predict_function: options.predictFunction,
            annotate_features: options.annotateFeatures,
          });

          return response;
        }
      );

      this.logCommand(
        'handleAnnotateGenes',
        { sequence: sequence.substring(0, 50) + '...', options },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);

        const orfs = result.result.orfs || [];
        const domains = result.result.domains || [];
        void vscode.window.showInformationMessage(
          `Gene annotation completed: ${orfs.length} ORFs, ${domains.length} domains found`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleAnnotateGenes', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Gene annotation failed: ${errorMsg}`);
    }
  }

  /**
   * Handle sequence analysis
   */
  async handleAnalyzeSequence(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Analyzing sequence properties',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Calculating composition and properties...' });

          const response = await this.mcpClient!.callTool('biomni.analyze_sequence', {
            sequence: sequence,
            include_composition: true,
            include_gc_content: true,
            include_melting_temp: true,
            include_molecular_props: true,
            include_restriction_sites: true,
          });

          return response;
        }
      );

      this.logCommand(
        'handleAnalyzeSequence',
        { sequence: sequence.substring(0, 50) + '...' },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);

        const length = sequence.length;
        const gcContent = result.result.gc_content || 0;
        void vscode.window.showInformationMessage(
          `Sequence analysis completed: ${length} bp, ${gcContent.toFixed(1)}% GC`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleAnalyzeSequence', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Sequence analysis failed: ${errorMsg}`);
    }
  }

  /**
   * Handle find ORFs
   */
  async handleFindORFs(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      const minLength = await vscode.window.showInputBox({
        prompt: 'Enter minimum ORF length (base pairs)',
        value: '100',
        validateInput: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 30) {
            return 'Please enter a number greater than 30';
          }
          return undefined;
        },
      });

      if (!minLength) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Finding ORFs',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Searching for open reading frames...' });

          const response = await this.mcpClient!.callTool('biomni.find_orfs', {
            sequence: sequence,
            min_length: parseInt(minLength),
            find_all_frames: true,
          });

          return response;
        }
      );

      this.logCommand(
        'handleFindORFs',
        { sequence: sequence.substring(0, 50) + '...', minLength },
        { success: true, data: result }
      );

      if (result.result) {
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result.result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);

        const orfs = result.result.orfs || [];
        void vscode.window.showInformationMessage(`Found ${orfs.length} ORFs`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleFindORFs', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`ORF finding failed: ${errorMsg}`);
    }
  }

  /**
   * Handle translate sequence
   */
  async handleTranslateSequence(): Promise<void> {
    if (!this.validateMcpClient()) {
      return;
    }

    try {
      const sequence = await this.getSequenceInput();
      if (!sequence) {
        return;
      }

      const geneticCode = await vscode.window.showQuickPick(
        [
          { label: 'Standard (1)', description: 'Universal genetic code', value: 1 },
          {
            label: 'Vertebrate Mitochondrial (2)',
            description: 'Vertebrate mitochondrial code',
            value: 2,
          },
          {
            label: 'Bacterial/Archaeal (11)',
            description: 'Bacterial and archaeal code',
            value: 11,
          },
        ],
        { placeHolder: 'Select genetic code table' }
      );

      if (!geneticCode) {
        return;
      }

      const result = await this.executeWithProgress(
        {
          title: 'Translating sequence',
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        async (progress, _token) => {
          progress.report({ message: 'Translating in all reading frames...' });

          const response = await this.mcpClient!.callTool('biomni.translate_sequence', {
            sequence: sequence,
            genetic_code: geneticCode.value,
            all_frames: true,
          });

          return response;
        }
      );

      this.logCommand(
        'handleTranslateSequence',
        { sequence: sequence.substring(0, 50) + '...', geneticCode: geneticCode.value },
        { success: true, data: result }
      );

      if (result.result) {
        let content = `Translation Results\n${'='.repeat(50)}\n\n`;
        content += `Original sequence (${sequence.length} bp):\n${sequence}\n\n`;

        if (result.result.translations) {
          content += 'Translations:\n';
          result.result.translations.forEach((translation: string, index: number) => {
            const frame = index < 3 ? index + 1 : -(index - 2);
            content += `\nFrame ${frame > 0 ? '+' : ''}${frame}:\n${translation}\n`;
          });
        }

        const doc = await vscode.workspace.openTextDocument({
          content,
          language: 'plaintext',
        });
        await vscode.window.showTextDocument(doc);
      }

      void vscode.window.showInformationMessage('Translation completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logCommand('handleTranslateSequence', {}, { success: false, error: errorMsg });
      void vscode.window.showErrorMessage(`Translation failed: ${errorMsg}`);
    }
  }

  /**
   * Handle show results
   */
  async handleShowResults(): Promise<void> {
    void vscode.window.showInformationMessage('Results viewer functionality not yet implemented');
  }

  /**
   * Handle export results
   */
  async handleExportResults(): Promise<void> {
    void vscode.window.showInformationMessage('Export results functionality not yet implemented');
  }

  /**
   * Handle clear cache
   */
  async handleClearCache(): Promise<void> {
    void vscode.window.showInformationMessage('Clear cache functionality not yet implemented');
  }

  // === PRIVATE HELPER METHODS FOR GENOMICS ===

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
   * Show annotation options dialog
   */
  private async showAnnotationOptionsDialog(): Promise<any> {
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
      default:
        return {};
    }
  }

  /**
   * Handle manage API keys command
   */
  async handleManageApiKeys(): Promise<void> {
    let settingsService: BiomniSettingsService;
    try {
      settingsService = BiomniSettingsService.getInstance(
        await this.getExtensionContext(),
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Settings service not available. Please reload the extension.'
      );
      return;
    }

    try {
      const action = await vscode.window.showQuickPick(
        ['Add/Update API Key', 'Remove API Key', 'List API Keys'],
        { placeHolder: 'Select API key action' }
      );

      if (action === 'Add/Update API Key') {
        const keyName = await vscode.window.showInputBox({
          prompt: 'Enter API key name (e.g., ncbiApiKey, uniprotApiKey)',
          placeHolder: 'ncbiApiKey',
        });

        if (keyName) {
          const keyValue = await vscode.window.showInputBox({
            prompt: `Enter the value for ${keyName}`,
            password: true,
          });

          if (keyValue) {
            await settingsService.storeApiKey(keyName, keyValue);
            void vscode.window.showInformationMessage(`API key '${keyName}' stored securely`);
          }
        }
      } else if (action === 'Remove API Key') {
        const keyName = await vscode.window.showInputBox({
          prompt: 'Enter API key name to remove',
          placeHolder: 'ncbiApiKey',
        });

        if (keyName) {
          await settingsService.removeApiKey(keyName);
          void vscode.window.showInformationMessage(`API key '${keyName}' removed`);
        }
      } else if (action === 'List API Keys') {
        const apiKeys = await settingsService.getAllApiKeys();
        const apiKeyStatus: string[] = [];

        if (apiKeys && Object.keys(apiKeys).length > 0) {
          Object.keys(apiKeys).forEach(key => {
            apiKeyStatus.push(`✓ ${key}: [configured]`);
          });
        } else {
          apiKeyStatus.push('No API keys configured');
        }

        void vscode.window.showInformationMessage(`API Keys Status:\n${apiKeyStatus.join('\n')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`API key management failed: ${errorMessage}`);
    }
  }

  /**
   * Handle validate configuration command
   */
  async handleValidateConfiguration(): Promise<void> {
    let settingsService: BiomniSettingsService;
    try {
      settingsService = BiomniSettingsService.getInstance(
        await this.getExtensionContext(),
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Settings service not available. Please reload the extension.'
      );
      return;
    }

    try {
      await settingsService.getAllSettings();
      void vscode.window.showInformationMessage('Configuration validation completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
    }
  }

  /**
   * Handle export settings command
   */
  async handleExportSettings(): Promise<void> {
    let settingsService: BiomniSettingsService;
    try {
      settingsService = BiomniSettingsService.getInstance(
        await this.getExtensionContext(),
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Settings service not available. Please reload the extension.'
      );
      return;
    }

    try {
      const settings = await settingsService.getAllSettings();
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('biomni-settings.json'),
        filters: {
          'JSON files': ['json'],
          'All files': ['*'],
        },
      });

      if (uri) {
        const content = JSON.stringify(settings, null, 2);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
        void vscode.window.showInformationMessage(`Settings exported to ${uri.fsPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Handle import settings command
   */
  async handleImportSettings(): Promise<void> {
    let settingsService: BiomniSettingsService;
    try {
      settingsService = BiomniSettingsService.getInstance(
        await this.getExtensionContext(),
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Settings service not available. Please reload the extension.'
      );
      return;
    }

    try {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON files': ['json'],
          'All files': ['*'],
        },
      });

      if (uri && uri[0]) {
        const content = await vscode.workspace.fs.readFile(uri[0]);
        const settings = JSON.parse(content.toString());

        // Import settings by category
        for (const [category, categorySettings] of Object.entries(settings)) {
          if (categorySettings && typeof categorySettings === 'object') {
            for (const [key, value] of Object.entries(categorySettings)) {
              await settingsService.updateSetting(category as any, key, value);
            }
          }
        }

        void vscode.window.showInformationMessage('Settings imported successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Import failed: ${errorMessage}`);
    }
  }

  /**
   * Handle reset settings command
   */
  async handleResetSettings(): Promise<void> {
    let settingsService: BiomniSettingsService;
    try {
      settingsService = BiomniSettingsService.getInstance(
        await this.getExtensionContext(),
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Settings service not available. Please reload the extension.'
      );
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to reset all settings to defaults?',
      'Yes',
      'No'
    );

    if (confirm === 'Yes') {
      try {
        await settingsService.resetToDefaults();
        void vscode.window.showInformationMessage('Settings reset to defaults');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Reset failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Get extension context for settings service
   */
  private async getExtensionContext(): Promise<vscode.ExtensionContext> {
    if (this.context) {
      return this.context;
    }

    // Fallback: try to get from extension
    const extension = vscode.extensions.getExtension('biomni.biomni-mcp-integration');
    if (!extension) {
      throw new Error('Extension context not available');
    }
    if (!extension.isActive) {
      await extension.activate();
    }
    return extension.exports?.context || ({} as vscode.ExtensionContext);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
