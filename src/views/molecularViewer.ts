import * as vscode from 'vscode';
import * as path from 'path';

export interface MolecularViewerOptions {
    format: 'pdb' | 'mmcif' | 'mol2' | 'sdf';
    backgroundColor?: string;
    atomColors?: Record<string, string>;
    showLabels?: boolean;
    showBonds?: boolean;
    showRibbon?: boolean;
}

export class MolecularViewer {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private moleculeData: string;
    private options: MolecularViewerOptions;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.moleculeData = '';
        this.options = {
            format: 'pdb',
            backgroundColor: '#1e1e1e',
            showLabels: false,
            showBonds: true,
            showRibbon: false
        };
    }

    public async show(moleculeData: string, options: MolecularViewerOptions): Promise<void> {
        this.moleculeData = moleculeData;
        this.options = { ...this.options, ...options };

        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            this.panel.reveal(columnToShowIn);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'biomniMolecularViewer',
                'Molecular Structure Viewer',
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                    ]
                }
            );

            this.panel.webview.html = this.getWebviewContent();
            
            this.panel.webview.onDidReceiveMessage(
                message => this.handleMessage(message),
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                undefined,
                this.context.subscriptions
            );
        }

        // Send molecule data to webview
        this.panel.webview.postMessage({
            command: 'loadMolecule',
            data: this.moleculeData,
            options: this.options
        });
    }

    private handleMessage(message: any): void {
        switch (message.command) {
            case 'export':
                this.exportVisualization(message.format);
                break;
            case 'selectAtom':
                this.handleAtomSelection(message.atomId);
                break;
            case 'updateOptions':
                this.options = { ...this.options, ...message.options };
                this.updateVisualization();
                break;
            case 'error':
                vscode.window.showErrorMessage(`Molecular Viewer: ${message.error}`);
                break;
        }
    }

    private async exportVisualization(format: 'png' | 'svg' | 'pdb'): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('molecule.' + format),
            filters: {
                'Image files': [format],
                'All files': ['*']
            }
        });

        if (uri) {
            this.panel?.webview.postMessage({
                command: 'export',
                format: format,
                path: uri.fsPath
            });
        }
    }

    private handleAtomSelection(atomId: string): void {
        vscode.window.showInformationMessage(`Selected atom: ${atomId}`);
    }

    private updateVisualization(): void {
        this.panel?.webview.postMessage({
            command: 'updateOptions',
            options: this.options
        });
    }

    private getWebviewContent(): string {
        // Uncomment when script files are created
        // const scriptUri = this.panel!.webview.asWebviewUri(
        //     vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'molecular-viewer.js'))
        // );
        
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'molecular-viewer.css'))
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>Molecular Structure Viewer</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background-color: ${this.options.backgroundColor};
                }
                #viewer-container {
                    width: 100vw;
                    height: 100vh;
                    position: relative;
                }
                #controls {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 10px;
                    border-radius: 5px;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 12px;
                }
                .control-group {
                    margin-bottom: 10px;
                }
                .control-group label {
                    display: inline-block;
                    width: 100px;
                    margin-right: 10px;
                }
                .control-group input[type="checkbox"] {
                    margin-right: 5px;
                }
                button {
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-right: 5px;
                }
                button:hover {
                    background: #005a9e;
                }
            </style>
        </head>
        <body>
            <div id="viewer-container"></div>
            <div id="controls">
                <div class="control-group">
                    <label>Display Mode:</label>
                    <select id="displayMode">
                        <option value="ball-stick">Ball & Stick</option>
                        <option value="spacefill">Space Fill</option>
                        <option value="ribbon">Ribbon</option>
                        <option value="cartoon">Cartoon</option>
                    </select>
                </div>
                <div class="control-group">
                    <label><input type="checkbox" id="showLabels"> Show Labels</label>
                </div>
                <div class="control-group">
                    <label><input type="checkbox" id="showBonds" checked> Show Bonds</label>
                </div>
                <div class="control-group">
                    <label><input type="checkbox" id="showWater"> Show Water</label>
                </div>
                <div class="control-group">
                    <button id="resetView">Reset View</button>
                    <button id="exportPNG">Export PNG</button>
                    <button id="exportPDB">Export PDB</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'loadMolecule':
                            loadMolecule(message.data, message.options);
                            break;
                        case 'updateOptions':
                            updateVisualization(message.options);
                            break;
                        case 'export':
                            exportVisualization(message.format, message.path);
                            break;
                    }
                });

                // Placeholder functions - would use Three.js and NGL in production
                function loadMolecule(data, options) {
                    console.log('Loading molecule with options:', options);
                    // Initialize Three.js scene
                    // Parse molecule data
                    // Create 3D representation
                }

                function updateVisualization(options) {
                    console.log('Updating visualization:', options);
                    // Update Three.js scene based on options
                }

                function exportVisualization(format, path) {
                    console.log('Exporting as:', format, 'to:', path);
                    // Export current view
                }

                // Control event handlers
                document.getElementById('displayMode').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateOptions',
                        options: { displayMode: e.target.value }
                    });
                });

                document.getElementById('showLabels').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateOptions',
                        options: { showLabels: e.target.checked }
                    });
                });

                document.getElementById('showBonds').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateOptions',
                        options: { showBonds: e.target.checked }
                    });
                });

                document.getElementById('showWater').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateOptions',
                        options: { showWater: e.target.checked }
                    });
                });

                document.getElementById('resetView').addEventListener('click', () => {
                    // Reset camera position
                    console.log('Resetting view');
                });

                document.getElementById('exportPNG').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'export',
                        format: 'png'
                    });
                });

                document.getElementById('exportPDB').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'export',
                        format: 'pdb'
                    });
                });
            </script>
        </body>
        </html>`;
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}