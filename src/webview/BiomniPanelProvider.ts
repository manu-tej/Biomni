import * as vscode from 'vscode';
import { MessageHandler } from './MessageHandler';
import { BiomniCommandHandlers } from '../commands/handlers';

/**
 * Webview panel provider for the Biomni extension
 * Creates a modern tabbed interface for various Biomni features
 */
export class BiomniPanelProvider {
  public static readonly viewType = 'biomniPanel';

  private static instance: BiomniPanelProvider | undefined;
  private panel: vscode.WebviewPanel | undefined;
  private messageHandler: MessageHandler | undefined;

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

    // Create message handler
    // Note: We pass undefined for mcpClient for now since webview doesn't need direct MCP access
    const commandHandlers = new BiomniCommandHandlers(undefined, this.context);
    this.messageHandler = new MessageHandler(this.context, this.panel.webview, commandHandlers);

    // Handle messages from the webview using the MessageHandler
    this.panel.webview.onDidReceiveMessage(
      async message => {
        if (this.messageHandler) {
          await this.messageHandler.handleMessage(message);
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        if (this.messageHandler) {
          this.messageHandler.dispose();
          this.messageHandler = undefined;
        }
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );
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

    // Read the actual files for inlining
    const fs = require('fs');
    const path = require('path');
    
    const stylePath = path.join(this.context.extensionPath, 'out', 'webview', 'style.css');
    const scriptPath = path.join(this.context.extensionPath, 'out', 'webview', 'webview-client.js');
    
    let styleContent = '';
    let scriptContent = '';
    
    try {
      styleContent = fs.readFileSync(stylePath, 'utf8');
    } catch (e) {
      console.error('Failed to read style.css:', e);
    }
    
    try {
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    } catch (e) {
      console.error('Failed to read webview-client.js:', e);
    }

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
                   script-src ${webview.cspSource} 'nonce-${nonce}';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} https:;">
    
    <title>Biomni Panel</title>
    <style nonce="${nonce}">
        ${styleContent}
    </style>
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
                    <h3>Database Query</h3>
                    <form id="database-query-form" class="query-form">
                        <div class="form-group">
                            <label for="database-select">Select Database:</label>
                            <vscode-dropdown id="database-select">
                                <vscode-option value="uniprot">UniProt - Protein sequences</vscode-option>
                                <vscode-option value="pdb">PDB - 3D structures</vscode-option>
                                <vscode-option value="alphafold">AlphaFold - AI predictions</vscode-option>
                                <vscode-option value="interpro">InterPro - Protein families</vscode-option>
                            </vscode-dropdown>
                        </div>
                        
                        <div class="form-group">
                            <label for="query-input">Query:</label>
                            <vscode-text-field id="query-input" placeholder="e.g., human insulin, P12345, zinc finger">
                                <span slot="start" class="codicon codicon-search"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div class="form-group">
                            <label for="limit-input">Max Results:</label>
                            <vscode-text-field id="limit-input" type="number" value="10" min="1" max="100">
                                <span slot="start" class="codicon codicon-list-ordered"></span>
                            </vscode-text-field>
                        </div>
                        
                        <vscode-button id="query-submit" type="submit">
                            <vscode-icon name="search"></vscode-icon>
                            Search Database
                        </vscode-button>
                    </form>
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Quick Access</h3>
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
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Query Results</h3>
                    <div id="database-results" class="results-container">
                        <vscode-progress-ring id="query-progress" style="display:none;"></vscode-progress-ring>
                        <div id="results-content">
                            <p class="placeholder-text">No results yet. Submit a query above to search databases.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Analysis Tab -->
            <div id="analysis-panel" class="tab-panel" role="tabpanel" aria-labelledby="analysis-tab">
                <h2>Analysis Tools</h2>
                <p>Perform comprehensive biological sequence and structure analysis.</p>
                
                <div class="analysis-section">
                    <h3>File Analysis</h3>
                    <form id="analysis-form" class="analysis-form">
                        <div class="form-group">
                            <label for="analysis-type">Analysis Type:</label>
                            <vscode-dropdown id="analysis-type">
                                <vscode-option value="validate">Validate File Format</vscode-option>
                                <vscode-option value="blast">BLAST Sequence Search</vscode-option>
                                <vscode-option value="properties">Sequence Properties</vscode-option>
                                <vscode-option value="orfs">Find ORFs</vscode-option>
                                <vscode-option value="annotation">Gene Annotation</vscode-option>
                                <vscode-option value="docking">Molecular Docking</vscode-option>
                                <vscode-option value="admet">ADMET Prediction</vscode-option>
                            </vscode-dropdown>
                        </div>
                        
                        <div class="form-group">
                            <label for="file-path">File Path (or leave empty for active file):</label>
                            <vscode-text-field id="file-path" placeholder="/path/to/file.fasta">
                                <span slot="start" class="codicon codicon-file"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div id="analysis-options" class="analysis-options">
                            <!-- Dynamic options based on analysis type -->
                        </div>
                        
                        <vscode-button id="analysis-submit" type="submit">
                            <vscode-icon name="play"></vscode-icon>
                            Run Analysis
                        </vscode-button>
                    </form>
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Quick Tools</h3>
                    <div class="tool-grid">
                        <div class="tool-category">
                            <h4>Genomics</h4>
                            <div class="tool-list">
                                <vscode-button class="tool-button" data-command="biomni.genomics.blastSequence">
                                    <vscode-icon name="search"></vscode-icon>
                                    BLAST Search
                                </vscode-button>
                                <vscode-button class="tool-button" data-command="biomni.genomics.annotateGenes">
                                    <vscode-icon name="tag"></vscode-icon>
                                    Annotate Genes
                                </vscode-button>
                                <vscode-button class="tool-button" data-command="biomni.genomics.analyzeSequence">
                                    <vscode-icon name="graph"></vscode-icon>
                                    Analyze Sequence
                                </vscode-button>
                                <vscode-button class="tool-button" data-command="biomni.genomics.findORFs">
                                    <vscode-icon name="bracket"></vscode-icon>
                                    Find ORFs
                                </vscode-button>
                            </div>
                        </div>
                        
                        <div class="tool-category">
                            <h4>Pharmacology</h4>
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
                        
                        <div class="tool-category">
                            <h4>File Operations</h4>
                            <div class="tool-list">
                                <vscode-button class="tool-button" data-command="biomni.validateFormat">
                                    <vscode-icon name="verified"></vscode-icon>
                                    Validate Format
                                </vscode-button>
                                <vscode-button class="tool-button" data-command="biomni.showInfo">
                                    <vscode-icon name="info"></vscode-icon>
                                    Show File Info
                                </vscode-button>
                                <vscode-button class="tool-button" data-command="biomni.formatFile">
                                    <vscode-icon name="edit"></vscode-icon>
                                    Format File
                                </vscode-button>
                            </div>
                        </div>
                    </div>
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Analysis Results</h3>
                    <div id="analysis-results" class="results-container">
                        <vscode-progress-ring id="analysis-progress" style="display:none;"></vscode-progress-ring>
                        <div id="analysis-content">
                            <p class="placeholder-text">No analysis running. Select a tool above to begin.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Settings Tab -->
            <div id="settings-panel" class="tab-panel" role="tabpanel" aria-labelledby="settings-tab">
                <h2>Settings</h2>
                <p>Configure Biomni extension settings and manage API keys.</p>
                
                <div class="settings-section">
                    <h3>API Configuration</h3>
                    <form id="settings-form" class="settings-form">
                        <div class="form-group">
                            <label for="uniprot-key">UniProt API Key:</label>
                            <vscode-text-field id="uniprot-key" type="password" placeholder="Enter UniProt API key">
                                <span slot="start" class="codicon codicon-key"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div class="form-group">
                            <label for="pdb-key">PDB API Key:</label>
                            <vscode-text-field id="pdb-key" type="password" placeholder="Enter PDB API key">
                                <span slot="start" class="codicon codicon-key"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div class="form-group">
                            <label for="alphafold-key">AlphaFold API Key:</label>
                            <vscode-text-field id="alphafold-key" type="password" placeholder="Enter AlphaFold API key">
                                <span slot="start" class="codicon codicon-key"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div class="form-group">
                            <label for="interpro-key">InterPro API Key:</label>
                            <vscode-text-field id="interpro-key" type="password" placeholder="Enter InterPro API key">
                                <span slot="start" class="codicon codicon-key"></span>
                            </vscode-text-field>
                        </div>
                        
                        <vscode-divider></vscode-divider>
                        
                        <h4>Preferences</h4>
                        
                        <div class="form-group">
                            <label for="default-database">Default Database:</label>
                            <vscode-dropdown id="default-database">
                                <vscode-option value="uniprot">UniProt</vscode-option>
                                <vscode-option value="pdb">PDB</vscode-option>
                                <vscode-option value="alphafold">AlphaFold</vscode-option>
                                <vscode-option value="interpro">InterPro</vscode-option>
                            </vscode-dropdown>
                        </div>
                        
                        <div class="form-group">
                            <label for="cache-enabled">
                                <vscode-checkbox id="cache-enabled" checked>
                                    Enable result caching
                                </vscode-checkbox>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="cache-size">Max Cache Size (MB):</label>
                            <vscode-text-field id="cache-size" type="number" value="100" min="10" max="1000">
                                <span slot="start" class="codicon codicon-database"></span>
                            </vscode-text-field>
                        </div>
                        
                        <div class="form-actions">
                            <vscode-button type="submit">
                                <vscode-icon name="save"></vscode-icon>
                                Save Settings
                            </vscode-button>
                            <vscode-button type="button" appearance="secondary" id="validate-config">
                                <vscode-icon name="verified"></vscode-icon>
                                Validate Configuration
                            </vscode-button>
                        </div>
                    </form>
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Quick Actions</h3>
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
                    
                    <vscode-divider></vscode-divider>
                    
                    <h3>Status</h3>
                    <div id="settings-status" class="status-section">
                        <div class="status-item">
                            <vscode-icon name="circle-outline"></vscode-icon>
                            <span>Configuration not validated</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script nonce="${nonce}">
        ${scriptContent}
    </script>
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
