import * as vscode from 'vscode';

/**
 * Webview panel provider for the Biomni extension
 * Creates a modern tabbed interface for various Biomni features
 */
export class BiomniPanelProvider {
  public static readonly viewType = 'biomniPanel';

  private static instance: BiomniPanelProvider | undefined;
  private panel: vscode.WebviewPanel | undefined;

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): BiomniPanelProvider {
    if (!BiomniPanelProvider.instance) {
      BiomniPanelProvider.instance = new BiomniPanelProvider(context);
    }
    return BiomniPanelProvider.instance;
  }

  /**
   * Create or show the webview panel
   */
  public createOrShow(): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    this.panel = vscode.window.createWebviewPanel(
      BiomniPanelProvider.viewType,
      'Biomni Panel',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview'),
          vscode.Uri.joinPath(
            this.context.extensionUri,
            'node_modules',
            '@vscode',
            'webview-ui-toolkit'
          ),
        ],
      }
    );

    // Set the webview's icon
    this.panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'images', 'biomni-light.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'images', 'biomni-dark.svg'),
    };

    // Set the HTML content
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'navigate':
            this.handleNavigation(message.tab);
            return;
          case 'executeCommand':
            this.handleCommandExecution(message.command, message.args);
            return;
          case 'showInfo':
            vscode.window.showInformationMessage(message.text);
            return;
          case 'showError':
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * Handle tab navigation within the webview
   */
  private handleNavigation(tabId: string): void {
    console.log(`Navigating to tab: ${tabId}`);
    // Tab switching is handled by JavaScript in the webview
    // This could be used for analytics or state management
  }

  /**
   * Handle command execution requests from the webview
   */
  private async handleCommandExecution(command: string, args?: any): Promise<void> {
    try {
      await vscode.commands.executeCommand(command, args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Command execution failed: ${errorMessage}`);
    }
  }

  /**
   * Generate the HTML content for the webview
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Get URIs for resources
    const toolkitUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode',
        'webview-ui-toolkit',
        'dist',
        'toolkit.js'
      )
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview', 'style.css')
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview', 'main.js')
    );

    // Generate a nonce for Content Security Policy
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} https:;">
    
    <title>Biomni Panel</title>
    <link href="${styleUri}" rel="stylesheet">
    <script type="module" nonce="${nonce}" src="${toolkitUri}"></script>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>
                <vscode-icon name="beaker"></vscode-icon>
                Biomni Bioinformatics Suite
            </h1>
            <p class="subtitle">Advanced biological data analysis tools</p>
        </header>
        
        <!-- Tab Navigation -->
        <nav class="tab-nav" role="tablist" aria-label="Main navigation">
            <vscode-button 
                id="home-tab" 
                appearance="secondary" 
                class="tab-button active"
                role="tab"
                aria-controls="home-panel"
                aria-selected="true"
                tabindex="0">
                <vscode-icon name="home"></vscode-icon>
                Home
            </vscode-button>
            <vscode-button 
                id="database-tab" 
                appearance="secondary" 
                class="tab-button"
                role="tab"
                aria-controls="database-panel"
                aria-selected="false"
                tabindex="-1">
                <vscode-icon name="database"></vscode-icon>
                Database
            </vscode-button>
            <vscode-button 
                id="analysis-tab" 
                appearance="secondary" 
                class="tab-button"
                role="tab"
                aria-controls="analysis-panel"
                aria-selected="false"
                tabindex="-1">
                <vscode-icon name="graph"></vscode-icon>
                Analysis
            </vscode-button>
            <vscode-button 
                id="settings-tab" 
                appearance="secondary" 
                class="tab-button"
                role="tab"
                aria-controls="settings-panel"
                aria-selected="false"
                tabindex="-1">
                <vscode-icon name="gear"></vscode-icon>
                Settings
            </vscode-button>
        </nav>
        
        <!-- Tab Content -->
        <main class="tab-content">
            <!-- Home Tab -->
            <div id="home-panel" class="tab-panel active" role="tabpanel" aria-labelledby="home-tab">
                <div class="welcome-section">
                    <h2>Welcome to Biomni</h2>
                    <p>Your comprehensive bioinformatics toolkit integrated into VS Code.</p>
                    
                    <div class="quick-actions">
                        <h3>Quick Actions</h3>
                        <div class="action-grid">
                            <vscode-button class="action-button" data-command="biomni.genomics.blastSequence">
                                <vscode-icon name="search"></vscode-icon>
                                BLAST Search
                            </vscode-button>
                            <vscode-button class="action-button" data-command="biomni.database.queryUniprot">
                                <vscode-icon name="database"></vscode-icon>
                                Query UniProt
                            </vscode-button>
                            <vscode-button class="action-button" data-command="biomni.genomics.annotateGenes">
                                <vscode-icon name="gene"></vscode-icon>
                                Annotate Genes
                            </vscode-button>
                            <vscode-button class="action-button" data-command="biomni.pharmacology.runDiffDock">
                                <vscode-icon name="combine"></vscode-icon>
                                Molecular Docking
                            </vscode-button>
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h3>Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <vscode-icon name="file-text"></vscode-icon>
                                <span class="stat-number">24</span>
                                <span class="stat-label">Commands Available</span>
                            </div>
                            <div class="stat-card">
                                <vscode-icon name="database"></vscode-icon>
                                <span class="stat-number">4</span>
                                <span class="stat-label">Database Sources</span>
                            </div>
                            <div class="stat-card">
                                <vscode-icon name="tools"></vscode-icon>
                                <span class="stat-number">12</span>
                                <span class="stat-label">Analysis Tools</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Database Tab -->
            <div id="database-panel" class="tab-panel" role="tabpanel" aria-labelledby="database-tab">
                <h2>Database Operations</h2>
                <p>Query biological databases and retrieve sequence information.</p>
                
                <div class="database-section">
                    <h3>Available Databases</h3>
                    <div class="database-grid">
                        <vscode-button class="database-button" data-command="biomni.database.queryUniprot">
                            <vscode-icon name="database"></vscode-icon>
                            <div class="database-info">
                                <strong>UniProt</strong>
                                <small>Protein sequence and annotation database</small>
                            </div>
                        </vscode-button>
                        <vscode-button class="database-button" data-command="biomni.database.queryPDB">
                            <vscode-icon name="database"></vscode-icon>
                            <div class="database-info">
                                <strong>Protein Data Bank</strong>
                                <small>3D protein structure repository</small>
                            </div>
                        </vscode-button>
                        <vscode-button class="database-button" data-command="biomni.database.queryAlphaFold">
                            <vscode-icon name="database"></vscode-icon>
                            <div class="database-info">
                                <strong>AlphaFold DB</strong>
                                <small>AI-predicted protein structures</small>
                            </div>
                        </vscode-button>
                        <vscode-button class="database-button" data-command="biomni.database.queryInterPro">
                            <vscode-icon name="database"></vscode-icon>
                            <div class="database-info">
                                <strong>InterPro</strong>
                                <small>Protein domains and families</small>
                            </div>
                        </vscode-button>
                    </div>
                </div>
            </div>
            
            <!-- Analysis Tab -->
            <div id="analysis-panel" class="tab-panel" role="tabpanel" aria-labelledby="analysis-tab">
                <h2>Analysis Tools</h2>
                <p>Perform comprehensive biological sequence and structure analysis.</p>
                
                <div class="analysis-section">
                    <h3>Genomics Tools</h3>
                    <div class="tool-list">
                        <vscode-button class="tool-button" data-command="biomni.genomics.blastSequence">
                            <vscode-icon name="search"></vscode-icon>
                            BLAST Sequence Search
                        </vscode-button>
                        <vscode-button class="tool-button" data-command="biomni.genomics.annotateGenes">
                            <vscode-icon name="gene"></vscode-icon>
                            Gene Annotation
                        </vscode-button>
                        <vscode-button class="tool-button" data-command="biomni.genomics.analyzeSequence">
                            <vscode-icon name="graph"></vscode-icon>
                            Sequence Properties
                        </vscode-button>
                        <vscode-button class="tool-button" data-command="biomni.genomics.findORFs">
                            <vscode-icon name="bracket"></vscode-icon>
                            Find ORFs
                        </vscode-button>
                    </div>
                    
                    <h3>Pharmacology Tools</h3>
                    <div class="tool-list">
                        <vscode-button class="tool-button" data-command="biomni.pharmacology.runDiffDock">
                            <vscode-icon name="combine"></vscode-icon>
                            Molecular Docking
                        </vscode-button>
                        <vscode-button class="tool-button" data-command="biomni.pharmacology.predictADMET">
                            <vscode-icon name="beaker"></vscode-icon>
                            ADMET Prediction
                        </vscode-button>
                    </div>
                </div>
            </div>
            
            <!-- Settings Tab -->
            <div id="settings-panel" class="tab-panel" role="tabpanel" aria-labelledby="settings-tab">
                <h2>Settings</h2>
                <p>Configure Biomni extension settings and manage API keys.</p>
                
                <div class="settings-section">
                    <h3>Configuration</h3>
                    <div class="settings-group">
                        <vscode-button class="settings-button" data-command="biomni.settings.manageApiKeys">
                            <vscode-icon name="key"></vscode-icon>
                            Manage API Keys
                        </vscode-button>
                        <vscode-button class="settings-button" data-command="biomni.settings.validateConfiguration">
                            <vscode-icon name="verified"></vscode-icon>
                            Validate Configuration
                        </vscode-button>
                        <vscode-button class="settings-button" data-command="biomni.settings.openPanel">
                            <vscode-icon name="gear"></vscode-icon>
                            Open Settings Panel
                        </vscode-button>
                    </div>
                    
                    <h3>Data Management</h3>
                    <div class="settings-group">
                        <vscode-button class="settings-button" data-command="biomni.settings.export">
                            <vscode-icon name="export"></vscode-icon>
                            Export Settings
                        </vscode-button>
                        <vscode-button class="settings-button" data-command="biomni.settings.import">
                            <vscode-icon name="cloud-download"></vscode-icon>
                            Import Settings
                        </vscode-button>
                        <vscode-button class="settings-button" data-command="biomni.genomics.clearCache">
                            <vscode-icon name="trash"></vscode-icon>
                            Clear Cache
                        </vscode-button>
                        <vscode-button class="settings-button" data-command="biomni.settings.reset">
                            <vscode-icon name="discard"></vscode-icon>
                            Reset to Defaults
                        </vscode-button>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate a random nonce for Content Security Policy
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    BiomniPanelProvider.instance = undefined;

    if (this.panel) {
      this.panel.dispose();
    }
  }
}
