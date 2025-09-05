import * as vscode from 'vscode';

export interface NetworkNode {
  id: string;
  label: string;
  type?: 'gene' | 'protein' | 'metabolite' | 'pathway';
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type?: 'activation' | 'inhibition' | 'binding' | 'phosphorylation';
  weight?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface NetworkGraphOptions {
  layout: 'force' | 'circular' | 'hierarchical' | 'grid';
  nodeSize?: number;
  edgeWidth?: number;
  showLabels?: boolean;
  physics?: boolean;
  clustering?: boolean;
}

export class NetworkGraphViewer {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private nodes: NetworkNode[] = [];
  private edges: NetworkEdge[] = [];
  private options: NetworkGraphOptions;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.options = {
      layout: 'force',
      nodeSize: 10,
      edgeWidth: 1,
      showLabels: true,
      physics: true,
      clustering: false,
    };
  }

  public async show(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    options?: Partial<NetworkGraphOptions>
  ): Promise<void> {
    this.nodes = nodes;
    this.edges = edges;
    if (options) {
      this.options = { ...this.options, ...options };
    }

    const columnToShowIn = vscode.window.activeTextEditor?.viewColumn;

    if (this.panel) {
      this.panel.reveal(columnToShowIn);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'biomniNetworkGraph',
        'Network Graph Viewer',
        columnToShowIn || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
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

    // Send network data to webview
    this.panel.webview.postMessage({
      command: 'loadNetwork',
      nodes: this.nodes,
      edges: this.edges,
      options: this.options,
    });
  }

  private handleMessage(message: any): void {
    switch (message.command) {
      case 'selectNode':
        this.handleNodeSelection(message.nodeId);
        break;
      case 'selectEdge':
        this.handleEdgeSelection(message.edgeId);
        break;
      case 'export':
        this.exportNetwork(message.format);
        break;
      case 'updateLayout':
        this.updateLayout(message.layout);
        break;
      case 'cluster':
        this.performClustering();
        break;
    }
  }

  private handleNodeSelection(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      vscode.window.showInformationMessage(`Selected: ${node.label} (${node.type || 'unknown'})`);
    }
  }

  private handleEdgeSelection(edgeId: string): void {
    const edge = this.edges.find(e => e.id === edgeId);
    if (edge) {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);
      vscode.window.showInformationMessage(
        `Edge: ${source?.label} → ${target?.label} (${edge.type || 'interaction'})`
      );
    }
  }

  private async exportNetwork(format: 'json' | 'graphml' | 'csv' | 'png'): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`network.${format}`),
      filters: this.getExportFilters(format),
    });

    if (uri) {
      let content: string;

      switch (format) {
        case 'json':
          content = JSON.stringify({ nodes: this.nodes, edges: this.edges }, null, 2);
          break;
        case 'graphml':
          content = this.exportToGraphML();
          break;
        case 'csv':
          content = this.exportToCSV();
          break;
        case 'png':
          // Handle image export through webview
          this.panel?.webview.postMessage({
            command: 'exportImage',
            path: uri.fsPath,
          });
          return;
        default:
          content = '';
      }

      if (content) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
        vscode.window.showInformationMessage(`Network exported to ${uri.fsPath}`);
      }
    }
  }

  private getExportFilters(format: string): { [name: string]: string[] } {
    switch (format) {
      case 'json':
        return { 'JSON files': ['json'], 'All files': ['*'] };
      case 'graphml':
        return { 'GraphML files': ['graphml', 'xml'], 'All files': ['*'] };
      case 'csv':
        return { 'CSV files': ['csv'], 'All files': ['*'] };
      case 'png':
        return { 'PNG images': ['png'], 'All files': ['*'] };
      default:
        return { 'All files': ['*'] };
    }
  }

  private exportToGraphML(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += '  <graph id="G" edgedefault="directed">\n';

    // Add nodes
    this.nodes.forEach(node => {
      xml += `    <node id="${node.id}">\n`;
      xml += `      <data key="label">${node.label}</data>\n`;
      if (node.type) {
        xml += `      <data key="type">${node.type}</data>\n`;
      }
      xml += '    </node>\n';
    });

    // Add edges
    this.edges.forEach((edge, index) => {
      xml += `    <edge id="e${index}" source="${edge.source}" target="${edge.target}">\n`;
      if (edge.type) {
        xml += `      <data key="type">${edge.type}</data>\n`;
      }
      if (edge.weight !== undefined) {
        xml += `      <data key="weight">${edge.weight}</data>\n`;
      }
      xml += '    </edge>\n';
    });

    xml += '  </graph>\n';
    xml += '</graphml>';

    return xml;
  }

  private exportToCSV(): string {
    let csv = 'Source,Target,Type,Weight\n';

    this.edges.forEach(edge => {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);
      csv += `"${source?.label || edge.source}","${target?.label || edge.target}","${edge.type || ''}",${edge.weight || 1}\n`;
    });

    return csv;
  }

  private updateLayout(layout: string): void {
    this.options.layout = layout as any;
    this.panel?.webview.postMessage({
      command: 'updateLayout',
      layout: layout,
    });
  }

  private performClustering(): void {
    // Implement clustering algorithm (e.g., Louvain community detection)
    this.panel?.webview.postMessage({
      command: 'performClustering',
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Network Graph Viewer</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background-color: #1e1e1e;
                }
                #network-container {
                    width: 100vw;
                    height: 100vh;
                }
                #controls {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.8);
                    padding: 10px;
                    border-radius: 5px;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 12px;
                }
                .control-group {
                    margin-bottom: 10px;
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
                select {
                    padding: 3px;
                    border-radius: 3px;
                    border: 1px solid #555;
                    background: #2d2d2d;
                    color: white;
                }
                #info {
                    position: absolute;
                    bottom: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.8);
                    padding: 10px;
                    border-radius: 5px;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div id="network-container"></div>
            <div id="controls">
                <div class="control-group">
                    <label>Layout: </label>
                    <select id="layoutSelect">
                        <option value="force">Force-Directed</option>
                        <option value="circular">Circular</option>
                        <option value="hierarchical">Hierarchical</option>
                        <option value="grid">Grid</option>
                    </select>
                </div>
                <div class="control-group">
                    <button id="clusterBtn">Detect Communities</button>
                    <button id="resetBtn">Reset View</button>
                </div>
                <div class="control-group">
                    <button id="exportJSON">Export JSON</button>
                    <button id="exportGraphML">Export GraphML</button>
                    <button id="exportPNG">Export PNG</button>
                </div>
            </div>
            <div id="info">
                <div>Nodes: <span id="nodeCount">0</span></div>
                <div>Edges: <span id="edgeCount">0</span></div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                let networkData = { nodes: [], edges: [] };
                let networkOptions = {};

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'loadNetwork':
                            loadNetwork(message.nodes, message.edges, message.options);
                            break;
                        case 'updateLayout':
                            updateLayout(message.layout);
                            break;
                        case 'performClustering':
                            performClustering();
                            break;
                        case 'exportImage':
                            exportImage(message.path);
                            break;
                    }
                });

                function loadNetwork(nodes, edges, options) {
                    networkData = { nodes, edges };
                    networkOptions = options;
                    
                    document.getElementById('nodeCount').textContent = nodes.length;
                    document.getElementById('edgeCount').textContent = edges.length;
                    
                    // Initialize network visualization (would use vis.js or d3.js in production)
                    console.log('Loading network with', nodes.length, 'nodes and', edges.length, 'edges');
                }

                function updateLayout(layout) {
                    console.log('Updating layout to:', layout);
                    // Update network layout
                }

                function performClustering() {
                    console.log('Performing clustering analysis');
                    // Run community detection algorithm
                }

                function exportImage(path) {
                    console.log('Exporting network as image to:', path);
                    // Export canvas as PNG
                }

                // Control event handlers
                document.getElementById('layoutSelect').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateLayout',
                        layout: e.target.value
                    });
                });

                document.getElementById('clusterBtn').addEventListener('click', () => {
                    vscode.postMessage({ command: 'cluster' });
                });

                document.getElementById('resetBtn').addEventListener('click', () => {
                    // Reset network view
                    console.log('Resetting view');
                });

                document.getElementById('exportJSON').addEventListener('click', () => {
                    vscode.postMessage({ command: 'export', format: 'json' });
                });

                document.getElementById('exportGraphML').addEventListener('click', () => {
                    vscode.postMessage({ command: 'export', format: 'graphml' });
                });

                document.getElementById('exportPNG').addEventListener('click', () => {
                    vscode.postMessage({ command: 'export', format: 'png' });
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
