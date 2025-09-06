import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class BiomniPanelProviderFixed {
  public static readonly viewType = 'biomni.panel';
  private static instance: BiomniPanelProviderFixed | undefined;
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): BiomniPanelProviderFixed {
    if (!BiomniPanelProviderFixed.instance) {
      BiomniPanelProviderFixed.instance = new BiomniPanelProviderFixed(context);
    }
    return BiomniPanelProviderFixed.instance;
  }

  public async show(): Promise<void> {
    const column = vscode.window.activeTextEditor 
      ? vscode.window.activeTextEditor.viewColumn 
      : vscode.ViewColumn.One;

    if (this.panel) {
      this.panel.reveal(column);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      BiomniPanelProviderFixed.viewType,
      'Biomni Panel',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          this.context.extensionUri,
          vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode')
        ]
      }
    );

    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.context.subscriptions);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        console.log('Received message from webview:', message);
        switch (message.type) {
          case 'navigate':
            vscode.window.showInformationMessage(`Navigated to: ${message.tab}`);
            break;
          case 'command':
            vscode.commands.executeCommand(message.command);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private getWebviewContent(webview: vscode.Webview): string {
    // Get path to UI toolkit
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

    // Read CSS file
    const stylePath = path.join(this.context.extensionPath, 'out', 'webview', 'style.css');
    
    let styleContent = '';
    
    try {
      if (fs.existsSync(stylePath)) {
        styleContent = fs.readFileSync(stylePath, 'utf8');
      }
    } catch (e) {
      console.error('Failed to read style.css:', e);
    }
    
    // Note: We're not using the external script file, embedding directly instead
    // This avoids CSP issues with external files

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src ${webview.cspSource} 'unsafe-inline';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} https:;">
    
    <title>Biomni Panel</title>
    
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }
        
        .tab-nav {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .tab-panel {
            display: none;
            animation: fadeIn 0.3s ease-in;
        }
        
        .tab-panel.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .status {
            padding: 10px;
            background: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-radius: 4px;
            margin: 10px 0;
        }
        
        .debug-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
            z-index: 1000;
            transition: transform 0.3s ease;
        }
        
        .debug-container.collapsed {
            transform: translateY(calc(100% - 30px));
        }
        
        .debug-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 10px;
            background: var(--vscode-titleBar-activeBackground);
            color: var(--vscode-titleBar-activeForeground);
            cursor: pointer;
            user-select: none;
        }
        
        .debug-output {
            background: #000;
            color: #0f0;
            padding: 10px;
            font-family: monospace;
            height: 150px;
            overflow-y: auto;
            margin: 0;
        }
        
        .debug-toggle {
            font-size: 12px;
        }
        
        .container {
            padding-bottom: 200px; /* Space for debug console */
        }
        
        .container.debug-collapsed {
            padding-bottom: 50px; /* Less space when collapsed */
        }
        
        ${styleContent}
    </style>
</head>
<body>
    <div class="container debug-collapsed">
        <div class="header">
            <h1>🧬 Biomni Bioinformatics Suite</h1>
            <p>Advanced biological data analysis tools</p>
        </div>
        
        <div class="status" id="status">
            Status: Loading UI components...
        </div>
        
        <div class="tab-nav">
            <vscode-button id="home-tab" class="tab-button" appearance="primary">
                Home
            </vscode-button>
            <vscode-button id="database-tab" class="tab-button">
                Database
            </vscode-button>
            <vscode-button id="analysis-tab" class="tab-button">
                Analysis
            </vscode-button>
            <vscode-button id="settings-tab" class="tab-button">
                Settings
            </vscode-button>
        </div>
        
        <div class="tab-content">
            <div id="home-panel" class="tab-panel active">
                <h2>Welcome</h2>
                <p>Select a tab above to get started.</p>
                
                <h3>Quick Actions</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <vscode-button id="validate-btn">Validate File</vscode-button>
                    <vscode-button id="query-btn">Query Database</vscode-button>
                    <vscode-button id="analyze-btn">Run Analysis</vscode-button>
                </div>
            </div>
            
            <div id="database-panel" class="tab-panel">
                <h2>Database Query</h2>
                <vscode-dropdown id="database-select">
                    <vscode-option value="uniprot">UniProt</vscode-option>
                    <vscode-option value="pdb">PDB</vscode-option>
                    <vscode-option value="alphafold">AlphaFold</vscode-option>
                </vscode-dropdown>
                <br><br>
                <vscode-text-field id="query-input" placeholder="Enter query..."></vscode-text-field>
                <br><br>
                <vscode-button id="search-btn" appearance="primary">Search</vscode-button>
            </div>
            
            <div id="analysis-panel" class="tab-panel">
                <h2>Analysis Tools</h2>
                <vscode-dropdown id="analysis-select">
                    <vscode-option value="blast">BLAST Search</vscode-option>
                    <vscode-option value="properties">Sequence Properties</vscode-option>
                    <vscode-option value="orfs">Find ORFs</vscode-option>
                </vscode-dropdown>
                <br><br>
                <vscode-button id="run-analysis-btn" appearance="primary">Run Analysis</vscode-button>
            </div>
            
            <div id="settings-panel" class="tab-panel">
                <h2>Settings</h2>
                <vscode-checkbox id="cache-checkbox">Enable Cache</vscode-checkbox>
                <br><br>
                <vscode-button id="save-settings-btn" appearance="primary">Save Settings</vscode-button>
            </div>
        </div>
        
    </div>
    
    <!-- Collapsible Debug Console (starts collapsed) -->
    <div class="debug-container collapsed" id="debug-container">
        <div class="debug-header" onclick="toggleDebug()">
            <span>🐛 Debug Console</span>
            <span class="debug-toggle" id="debug-toggle">▲</span>
        </div>
        <div class="debug-output" id="debug">
            Debug output will appear here...
        </div>
    </div>

    <!-- Load UI Toolkit -->
    <script type="module" src="${toolkitUri}"></script>
    
    <!-- Main Script -->
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const debug = document.getElementById('debug');
            const status = document.getElementById('status');
            const debugContainer = document.getElementById('debug-container');
            const debugToggle = document.getElementById('debug-toggle');
            const container = document.querySelector('.container');
            
            // Toggle debug console
            window.toggleDebug = function() {
                if (debugContainer.classList.contains('collapsed')) {
                    debugContainer.classList.remove('collapsed');
                    container.classList.remove('debug-collapsed');
                    debugToggle.textContent = '▼';
                } else {
                    debugContainer.classList.add('collapsed');
                    container.classList.add('debug-collapsed');
                    debugToggle.textContent = '▲';
                }
            };
            
            function log(msg) {
                console.log(msg);
                debug.innerHTML += msg + '<br>';
                debug.scrollTop = debug.scrollHeight;
            }
            
            log('[INIT] Starting webview initialization...');
            
            // Wait for web components to be defined
            async function waitForComponents() {
                log('[INIT] Waiting for web components...');
                
                if (!window.customElements) {
                    log('[ERROR] Web Components API not available');
                    status.textContent = 'Status: Error - Web Components not supported';
                    return;
                }
                
                const components = [
                    'vscode-button',
                    'vscode-dropdown',
                    'vscode-option',
                    'vscode-text-field',
                    'vscode-checkbox'
                ];
                
                for (const name of components) {
                    try {
                        await customElements.whenDefined(name);
                        log('[COMPONENT] ' + name + ' defined');
                    } catch (e) {
                        log('[ERROR] Failed to load ' + name + ': ' + e.message);
                    }
                }
                
                log('[INIT] All components loaded');
                status.textContent = 'Status: Ready';
                initializeUI();
            }
            
            function initializeUI() {
                log('[UI] Initializing UI...');
                
                // Tab navigation
                const tabButtons = document.querySelectorAll('.tab-button');
                const tabPanels = document.querySelectorAll('.tab-panel');
                
                log('[UI] Found ' + tabButtons.length + ' tab buttons');
                
                tabButtons.forEach((button, index) => {
                    button.addEventListener('click', () => {
                        log('[TAB] Clicked: ' + button.id);
                        
                        // Update buttons
                        tabButtons.forEach(b => b.appearance = 'secondary');
                        button.appearance = 'primary';
                        
                        // Update panels
                        tabPanels.forEach(p => p.classList.remove('active'));
                        const targetPanel = document.getElementById(button.id.replace('-tab', '-panel'));
                        if (targetPanel) {
                            targetPanel.classList.add('active');
                        }
                        
                        // Send message to extension
                        vscode.postMessage({
                            type: 'navigate',
                            tab: button.id.replace('-tab', '')
                        });
                    });
                });
                
                // Quick action buttons
                const validateBtn = document.getElementById('validate-btn');
                if (validateBtn) {
                    validateBtn.addEventListener('click', () => {
                        log('[ACTION] Validate clicked');
                        status.textContent = 'Status: Validating file...';
                        vscode.postMessage({
                            type: 'command',
                            command: 'biomni.file.validate'
                        });
                        
                        // Mock validation result
                        setTimeout(() => {
                            status.textContent = 'Status: File validation complete - Valid FASTA format';
                            log('[ACTION] Validation complete');
                        }, 800);
                    });
                }
                
                const queryBtn = document.getElementById('query-btn');
                if (queryBtn) {
                    queryBtn.addEventListener('click', () => {
                        log('[ACTION] Query Database clicked');
                        // Switch to database tab
                        document.getElementById('database-tab')?.click();
                    });
                }
                
                const analyzeBtn = document.getElementById('analyze-btn');
                if (analyzeBtn) {
                    analyzeBtn.addEventListener('click', () => {
                        log('[ACTION] Run Analysis clicked');
                        // Switch to analysis tab
                        document.getElementById('analysis-tab')?.click();
                    });
                }
                
                // Analysis button
                const runAnalysisBtn = document.getElementById('run-analysis-btn');
                if (runAnalysisBtn) {
                    runAnalysisBtn.addEventListener('click', () => {
                        const analysisType = document.getElementById('analysis-select')?.value;
                        log('[ANALYSIS] Running: ' + analysisType);
                        status.textContent = 'Status: Running ' + analysisType + ' analysis...';
                        
                        // Mock analysis result
                        setTimeout(() => {
                            status.textContent = 'Status: ' + analysisType + ' analysis complete';
                            log('[ANALYSIS] Analysis complete');
                            
                            // Show analysis results
                            const analysisPanel = document.getElementById('analysis-panel');
                            if (analysisPanel) {
                                let resultsDiv = document.getElementById('analysis-results');
                                if (!resultsDiv) {
                                    resultsDiv = document.createElement('div');
                                    resultsDiv.id = 'analysis-results';
                                    resultsDiv.style.marginTop = '20px';
                                    resultsDiv.style.padding = '15px';
                                    resultsDiv.style.background = 'var(--vscode-editor-inactiveSelectionBackground)';
                                    resultsDiv.style.borderRadius = '4px';
                                    analysisPanel.appendChild(resultsDiv);
                                }
                                
                                let analysisResults = '';
                                if (analysisType === 'blast') {
                                    analysisResults = '<h3>BLAST Results</h3>' +
                                        '<p><strong>Query:</strong> Input sequence (500 bp)</p>' +
                                        '<p><strong>Database:</strong> nr/nt</p>' +
                                        '<p><strong>Top Hits:</strong></p>' +
                                        '<ul>' +
                                        '<li>Hit 1: <strong>98.5%</strong> identity - Sequence match from Homo sapiens</li>' +
                                        '<li>Hit 2: <strong>92.3%</strong> identity - Sequence match from Pan troglodytes</li>' +
                                        '<li>Hit 3: <strong>87.1%</strong> identity - Sequence match from Mus musculus</li>' +
                                        '</ul>';
                                } else if (analysisType === 'properties') {
                                    analysisResults = '<h3>Sequence Properties</h3>' +
                                        '<p><strong>Length:</strong> 337 amino acids</p>' +
                                        '<p><strong>Molecular Weight:</strong> 38.2 kDa</p>' +
                                        '<p><strong>Isoelectric Point:</strong> 8.76</p>' +
                                        '<p><strong>Composition:</strong></p>' +
                                        '<ul>' +
                                        '<li>Hydrophobic: 45%</li>' +
                                        '<li>Polar: 28%</li>' +
                                        '<li>Charged: 27%</li>' +
                                        '</ul>';
                                } else if (analysisType === 'orfs') {
                                    analysisResults = '<h3>Open Reading Frames</h3>' +
                                        '<p><strong>Found 3 ORFs:</strong></p>' +
                                        '<ul>' +
                                        '<li>ORF1: Position 12-1023 (337 aa, +1 frame)</li>' +
                                        '<li>ORF2: Position 156-689 (177 aa, +3 frame)</li>' +
                                        '<li>ORF3: Position 892-1455 (187 aa, -2 frame)</li>' +
                                        '</ul>' +
                                        '<p><strong>Longest ORF:</strong> 1011 bp encoding 337 amino acids</p>';
                                }
                                
                                resultsDiv.innerHTML = analysisResults +
                                    '<br><vscode-button onclick="clearAnalysisResults()">Clear Results</vscode-button>';
                            }
                        }, 1500);
                    });
                }
                
                // Add clear analysis results function
                window.clearAnalysisResults = function() {
                    const resultsDiv = document.getElementById('analysis-results');
                    if (resultsDiv) {
                        resultsDiv.remove();
                    }
                    status.textContent = 'Status: Analysis results cleared';
                    log('[ANALYSIS] Results cleared');
                };
                
                // Settings button
                const saveSettingsBtn = document.getElementById('save-settings-btn');
                if (saveSettingsBtn) {
                    saveSettingsBtn.addEventListener('click', () => {
                        const cacheEnabled = document.getElementById('cache-checkbox')?.checked;
                        log('[SETTINGS] Saving - Cache: ' + cacheEnabled);
                        status.textContent = 'Status: Saving settings...';
                        
                        setTimeout(() => {
                            status.textContent = 'Status: Settings saved successfully';
                            log('[SETTINGS] Settings saved');
                        }, 500);
                    });
                }
                
                const searchBtn = document.getElementById('search-btn');
                if (searchBtn) {
                    searchBtn.addEventListener('click', () => {
                        const database = document.getElementById('database-select')?.value;
                        const query = document.getElementById('query-input')?.value;
                        log('[SEARCH] Database: ' + database + ', Query: ' + query);
                        status.textContent = 'Status: Searching ' + database + '...';
                        
                        // Mock search results after 1 second
                        setTimeout(() => {
                            status.textContent = 'Status: Found 3 results in ' + database;
                            log('[SEARCH] Mock results ready');
                            
                            // Show mock results in the panel
                            const databasePanel = document.getElementById('database-panel');
                            if (databasePanel) {
                                // Find or create results div
                                let resultsDiv = document.getElementById('search-results');
                                if (!resultsDiv) {
                                    resultsDiv = document.createElement('div');
                                    resultsDiv.id = 'search-results';
                                    resultsDiv.style.marginTop = '20px';
                                    resultsDiv.style.padding = '15px';
                                    resultsDiv.style.background = 'var(--vscode-editor-inactiveSelectionBackground)';
                                    resultsDiv.style.borderRadius = '4px';
                                    databasePanel.appendChild(resultsDiv);
                                }
                                
                                // Generate appropriate mock results based on database
                                let mockResults = '';
                                if (database === 'uniprot') {
                                    mockResults = '<ul>' +
                                        '<li><strong>P12345</strong> - Protein match 1 (Homo sapiens)</li>' +
                                        '<li><strong>Q67890</strong> - Protein match 2 (Mus musculus)</li>' +
                                        '<li><strong>A1B2C3</strong> - Protein match 3 (Rattus norvegicus)</li>' +
                                        '</ul>';
                                } else if (database === 'pdb') {
                                    mockResults = '<ul>' +
                                        '<li><strong>1ABC</strong> - Crystal structure at 2.5Å resolution</li>' +
                                        '<li><strong>2XYZ</strong> - Cryo-EM structure of protein complex</li>' +
                                        '<li><strong>3DEF</strong> - NMR structure in solution</li>' +
                                        '</ul>';
                                } else if (database === 'alphafold') {
                                    mockResults = '<ul>' +
                                        '<li><strong>AF-P12345-F1</strong> - Predicted structure (confidence: 92.1%)</li>' +
                                        '<li><strong>AF-Q67890-F1</strong> - Predicted structure (confidence: 88.7%)</li>' +
                                        '<li><strong>AF-A1B2C3-F1</strong> - Predicted structure (confidence: 85.3%)</li>' +
                                        '</ul>';
                                }
                                
                                resultsDiv.innerHTML = '<h3>Search Results</h3>' +
                                    '<p>Found results for "<strong>' + query + '</strong>" in ' + database.toUpperCase() + ':</p>' +
                                    mockResults +
                                    '<vscode-button onclick="clearResults()">Clear Results</vscode-button>';
                            }
                        }, 1000);
                    });
                }
                
                // Add clear results function
                window.clearResults = function() {
                    const resultsDiv = document.getElementById('search-results');
                    if (resultsDiv) {
                        resultsDiv.remove();
                    }
                    status.textContent = 'Status: Results cleared';
                    log('[SEARCH] Results cleared');
                };
                
                log('[UI] UI initialization complete');
            }
            
            // Start initialization
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', waitForComponents);
            } else {
                waitForComponents();
            }
            
            // Listen for messages from extension
            window.addEventListener('message', event => {
                log('[MESSAGE] Received: ' + JSON.stringify(event.data));
            });
            
            log('[INIT] Script setup complete');
        })();
    </script>
</body>
</html>`;
  }


  public dispose(): void {
    BiomniPanelProviderFixed.instance = undefined;
    if (this.panel) {
      this.panel.dispose();
    }
  }
}