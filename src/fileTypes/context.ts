/**
 * Context menu integration and smart suggestions for biological file formats
 */

import * as vscode from 'vscode';
import { BioFileFormat, SmartSuggestion } from './types';
import { FileDetector } from './detector';

/**
 * Context menu provider for biological files
 */
export class BioFileContextProvider {
  private detector: FileDetector;
  private statusBar: vscode.StatusBarItem;

  constructor() {
    this.detector = FileDetector.getInstance();
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  }

  /**
   * Register context providers and commands
   */
  public register(context: vscode.ExtensionContext): void {
    // Register file system watcher
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    context.subscriptions.push(watcher);

    // Register context menu commands
    this.registerContextCommands(context);

    // Register editor change listener for smart suggestions
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(editor =>
      this.handleActiveEditorChange(editor)
    );
    context.subscriptions.push(activeEditorListener);

    // Register status bar
    context.subscriptions.push(this.statusBar);

    // Initial check for active editor
    if (vscode.window.activeTextEditor) {
      this.handleActiveEditorChange(vscode.window.activeTextEditor);
    }
  }

  /**
   * Register context menu commands
   */
  private registerContextCommands(context: vscode.ExtensionContext): void {
    const commands = [
      // FASTA tools
      vscode.commands.registerCommand('biomni.fasta.blast', (uri: vscode.Uri) =>
        this.executeTool(uri, 'blast')
      ),
      vscode.commands.registerCommand('biomni.fasta.align', (uri: vscode.Uri) =>
        this.executeTool(uri, 'align')
      ),
      vscode.commands.registerCommand('biomni.fasta.translate', (uri: vscode.Uri) =>
        this.executeTool(uri, 'translate')
      ),
      vscode.commands.registerCommand('biomni.fasta.reverseComplement', (uri: vscode.Uri) =>
        this.executeTool(uri, 'reverse-complement')
      ),

      // FASTQ tools
      vscode.commands.registerCommand('biomni.fastq.qualityControl', (uri: vscode.Uri) =>
        this.executeTool(uri, 'quality-control')
      ),
      vscode.commands.registerCommand('biomni.fastq.trim', (uri: vscode.Uri) =>
        this.executeTool(uri, 'trim')
      ),
      vscode.commands.registerCommand('biomni.fastq.filter', (uri: vscode.Uri) =>
        this.executeTool(uri, 'filter')
      ),

      // VCF tools
      vscode.commands.registerCommand('biomni.vcf.annotate', (uri: vscode.Uri) =>
        this.executeTool(uri, 'annotate')
      ),
      vscode.commands.registerCommand('biomni.vcf.filter', (uri: vscode.Uri) =>
        this.executeTool(uri, 'filter')
      ),
      vscode.commands.registerCommand('biomni.vcf.stats', (uri: vscode.Uri) =>
        this.executeTool(uri, 'stats')
      ),

      // PDB tools
      vscode.commands.registerCommand('biomni.pdb.visualize', (uri: vscode.Uri) =>
        this.executeTool(uri, 'visualize')
      ),
      vscode.commands.registerCommand('biomni.pdb.analyzeStructure', (uri: vscode.Uri) =>
        this.executeTool(uri, 'analyze-structure')
      ),

      // GFF/GTF tools
      vscode.commands.registerCommand('biomni.gff.annotate', (uri: vscode.Uri) =>
        this.executeTool(uri, 'annotate')
      ),
      vscode.commands.registerCommand('biomni.gff.convert', (uri: vscode.Uri) =>
        this.executeTool(uri, 'convert')
      ),

      // SAM/BAM tools
      vscode.commands.registerCommand('biomni.sam.convertToBam', (uri: vscode.Uri) =>
        this.executeTool(uri, 'convert-to-bam')
      ),
      vscode.commands.registerCommand('biomni.sam.sort', (uri: vscode.Uri) =>
        this.executeTool(uri, 'sort')
      ),
      vscode.commands.registerCommand('biomni.sam.index', (uri: vscode.Uri) =>
        this.executeTool(uri, 'index')
      ),
      vscode.commands.registerCommand('biomni.bam.view', (uri: vscode.Uri) =>
        this.executeTool(uri, 'view')
      ),

      // BED tools
      vscode.commands.registerCommand('biomni.bed.sort', (uri: vscode.Uri) =>
        this.executeTool(uri, 'sort')
      ),
      vscode.commands.registerCommand('biomni.bed.merge', (uri: vscode.Uri) =>
        this.executeTool(uri, 'merge')
      ),
      vscode.commands.registerCommand('biomni.bed.intersect', (uri: vscode.Uri) =>
        this.executeTool(uri, 'intersect')
      ),

      // Generic tools (support invocation from Command Palette without URI)
      vscode.commands.registerCommand('biomni.file.validate', (uri?: vscode.Uri) => {
        const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!targetUri) {
          void vscode.window.showWarningMessage('No file selected. Open a file or right-click a file to validate.');
          return;
        }
        void this.validateFile(targetUri);
      }),
      vscode.commands.registerCommand('biomni.file.showInfo', (uri?: vscode.Uri) => {
        const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!targetUri) {
          void vscode.window.showWarningMessage('No file selected. Open a file or right-click a file to show info.');
          return;
        }
        void this.showFileInfo(targetUri);
      }),
      vscode.commands.registerCommand('biomni.file.suggestTools', (uri?: vscode.Uri) => {
        const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!targetUri) {
          void vscode.window.showWarningMessage('No file selected. Open a file or right-click a file for suggestions.');
          return;
        }
        void this.showSmartSuggestions(targetUri);
      }),
    ];

    commands.forEach(command => context.subscriptions.push(command));
  }

  /**
   * Handle active editor change
   */
  private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) {
      this.statusBar.hide();
      return;
    }

    const uri = editor.document.uri;
    if (uri.scheme !== 'file') {
      this.statusBar.hide();
      return;
    }

    // Detect file type
    const detection = await this.detector.detectFile(uri);

    if (detection) {
      // Update status bar
      this.statusBar.text = `$(file-code) ${detection.format.name}`;
      this.statusBar.tooltip = `${detection.format.description} (${Math.round(detection.confidence * 100)}% confidence)`;
      this.statusBar.command = 'biomni.file.showInfo';
      this.statusBar.show();

      // Show smart suggestions for new files
      if (editor.document.lineCount <= 1) {
        setTimeout(() => this.maybeShowSmartSuggestions(uri, detection.format), 1000);
      }
    } else {
      this.statusBar.hide();
    }
  }

  /**
   * Show smart suggestions if appropriate
   */
  private async maybeShowSmartSuggestions(uri: vscode.Uri, format: BioFileFormat): Promise<void> {
    const config = vscode.workspace.getConfiguration('biomni');
    const showSuggestions = config.get<boolean>('showSmartSuggestions', true);

    if (!showSuggestions) {
      return;
    }

    const suggestions = this.generateSmartSuggestions(format);
    if (suggestions.length > 0) {
      const items = suggestions.map(s => ({
        label: s.title,
        description: s.description,
        detail: `Command: ${s.command}`,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Suggested tools for ${format.name} files`,
        title: 'Smart File Suggestions',
      });

      if (selected) {
        const suggestion = suggestions.find(s => s.title === selected.label);
        if (suggestion) {
          await vscode.commands.executeCommand(suggestion.command, uri, ...(suggestion.args || []));
        }
      }
    }
  }

  /**
   * Generate smart suggestions for a format
   */
  private generateSmartSuggestions(format: BioFileFormat): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [
      {
        title: 'Validate File',
        description: `Check if this ${format.name} file is properly formatted`,
        command: 'biomni.file.validate',
        icon: '$(check)',
        priority: 100,
      },
    ];

    // Add format-specific suggestions
    format.tools.forEach((tool, index) => {
      const suggestion = this.createToolSuggestion(format, tool, 90 - index);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create tool suggestion
   */
  private createToolSuggestion(
    format: BioFileFormat,
    tool: string,
    priority: number
  ): SmartSuggestion | null {
    const formatKey = format.name.toLowerCase();
    const toolCommand = `biomni.${formatKey}.${this.camelCase(tool)}`;

    const toolDescriptions: Record<string, string> = {
      blast: 'Run BLAST search against databases',
      align: 'Align sequences using multiple alignment tools',
      translate: 'Translate DNA/RNA sequences to proteins',
      'reverse-complement': 'Generate reverse complement of sequences',
      'quality-control': 'Analyze sequence quality metrics',
      trim: 'Trim low-quality bases and adapters',
      filter: 'Filter sequences based on criteria',
      annotate: 'Add functional annotations',
      stats: 'Generate statistical summaries',
      visualize: 'Open in 3D structure viewer',
      'analyze-structure': 'Analyze protein structure properties',
      convert: 'Convert between file formats',
      sort: 'Sort entries by genomic coordinates',
      merge: 'Merge overlapping regions',
      intersect: 'Find intersections with other files',
      index: 'Create index for fast access',
    };

    return {
      title: this.capitalizeFirst(tool.replace('-', ' ')),
      description: toolDescriptions[tool] || `Run ${tool} on this file`,
      command: toolCommand,
      icon: '$(tools)',
      priority,
    };
  }

  /**
   * Execute a tool on a file
   */
  private async executeTool(uri: vscode.Uri, tool: string): Promise<void> {
    try {
      vscode.window.showInformationMessage(`Executing ${tool} on ${uri.fsPath}`);

      // TODO: Integrate with actual Biomni tools
      // For now, show a placeholder message
      const result = await vscode.window.showInformationMessage(
        `Would you like to run ${tool} on this file?`,
        'Yes',
        'No'
      );

      if (result === 'Yes') {
        vscode.window.showInformationMessage(`Running ${tool}...`);
        // TODO: Call actual Biomni MCP server
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute ${tool}: ${error}`);
    }
  }

  /**
   * Validate file format
   */
  private async validateFile(uri: vscode.Uri): Promise<void> {
    try {
      const detection = await this.detector.detectFile(uri);
      if (!detection) {
        vscode.window.showWarningMessage('Could not detect file format for validation');
        return;
      }

      vscode.window.showInformationMessage(`Validating ${detection.format.name} file...`);

      // TODO: Implement actual validation
      // For now, show detection info
      vscode.window.showInformationMessage(
        `File detected as ${detection.format.name} with ${Math.round(detection.confidence * 100)}% confidence`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Validation failed: ${error}`);
    }
  }

  /**
   * Show file information
   */
  private async showFileInfo(uri: vscode.Uri): Promise<void> {
    try {
      const detection = await this.detector.detectFile(uri);
      if (!detection) {
        vscode.window.showInformationMessage('File format not recognized');
        return;
      }

      const info = [
        `Format: ${detection.format.name}`,
        `Description: ${detection.format.description}`,
        `Confidence: ${Math.round(detection.confidence * 100)}%`,
        `Detection Method: ${detection.detectionMethod}`,
        `Extensions: ${detection.format.extensions.join(', ')}`,
        `Available Tools: ${detection.format.tools.join(', ')}`,
      ];

      if (detection.stats) {
        info.push(`File Size: ${this.formatFileSize(detection.stats.size)}`);
        if (detection.stats.lineCount) {
          info.push(`Lines: ${detection.stats.lineCount.toLocaleString()}`);
        }
        if (detection.stats.encoding) {
          info.push(`Encoding: ${detection.stats.encoding}`);
        }
      }

      const panel = vscode.window.createWebviewPanel(
        'bioFileInfo',
        `${detection.format.name} File Info`,
        vscode.ViewColumn.Beside,
        {}
      );

      panel.webview.html = this.generateInfoHtml(detection.format.name, info);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to show file info: ${error}`);
    }
  }

  /**
   * Show smart suggestions
   */
  private async showSmartSuggestions(uri: vscode.Uri): Promise<void> {
    const detection = await this.detector.detectFile(uri);
    if (detection) {
      await this.maybeShowSmartSuggestions(uri, detection.format);
    } else {
      vscode.window.showInformationMessage('No suggestions available for this file type');
    }
  }

  /**
   * Generate HTML for info panel
   */
  private generateInfoHtml(title: string, info: string[]): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} Info</title>
        <style>
          body { 
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }
          h1 { color: var(--vscode-textLink-foreground); }
          .info-item { 
            margin: 10px 0;
            padding: 8px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
          }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${title} File Information</h1>
        ${info
          .map(item => {
            const [label, ...valueParts] = item.split(': ');
            const value = valueParts.join(': ');
            return `<div class="info-item"><span class="label">${label}:</span> ${value}</div>`;
          })
          .join('')}
      </body>
      </html>
    `;
  }

  /**
   * Utility functions
   */
  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, g => g[1]?.toUpperCase() || '');
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.statusBar.dispose();
  }
}
