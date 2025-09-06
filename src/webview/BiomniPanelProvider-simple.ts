import * as vscode from 'vscode';

export class BiomniPanelProviderSimple {
  public static readonly viewType = 'biomni.panel';
  private static instance: BiomniPanelProviderSimple | undefined;
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): BiomniPanelProviderSimple {
    if (!BiomniPanelProviderSimple.instance) {
      BiomniPanelProviderSimple.instance = new BiomniPanelProviderSimple(context);
    }
    return BiomniPanelProviderSimple.instance;
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
      BiomniPanelProviderSimple.viewType,
      'Biomni Panel Test',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.panel.webview.html = this.getSimpleWebviewContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.context.subscriptions);
  }

  private getSimpleWebviewContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Biomni Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
        }
        button { 
            padding: 10px 20px; 
            margin: 10px;
            cursor: pointer;
            background: #007ACC;
            color: white;
            border: none;
            border-radius: 4px;
        }
        button:hover {
            background: #005a9e;
        }
        .status {
            margin: 20px 0;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Biomni Panel - Debug Mode</h1>
    <div class="status" id="status">Status: Ready</div>
    
    <h2>Test Buttons</h2>
    <button onclick="testClick()">Test JavaScript Click</button>
    <button id="test-listener">Test Event Listener</button>
    
    <h2>VSCode API Test</h2>
    <button onclick="testVscode()">Test VSCode API</button>
    
    <h2>Console Output</h2>
    <div id="output" style="background: #000; color: #0f0; padding: 10px; font-family: monospace; min-height: 100px;">
        Console output will appear here...
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const output = document.getElementById('output');
        const status = document.getElementById('status');
        
        function log(msg) {
            console.log(msg);
            output.innerHTML += msg + '<br>';
        }
        
        log('[INIT] Webview script loaded');
        
        function testClick() {
            log('[CLICK] Button clicked via onclick');
            status.textContent = 'Status: Button clicked!';
        }
        
        function testVscode() {
            log('[VSCODE] Sending message to extension');
            vscode.postMessage({ type: 'test', text: 'Hello from webview!' });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            log('[DOM] DOMContentLoaded fired');
            
            const btn = document.getElementById('test-listener');
            if (btn) {
                btn.addEventListener('click', () => {
                    log('[LISTENER] Button clicked via addEventListener');
                    status.textContent = 'Status: Event listener worked!';
                });
                log('[DOM] Event listener attached');
            } else {
                log('[ERROR] Could not find test-listener button');
            }
            
            // Test if we can find all buttons
            const allButtons = document.querySelectorAll('button');
            log('[DOM] Found ' + allButtons.length + ' buttons');
        });
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            log('[MESSAGE] Received: ' + JSON.stringify(event.data));
        });
        
        log('[INIT] Setup complete');
    </script>
</body>
</html>`;
  }

  public dispose(): void {
    BiomniPanelProviderSimple.instance = undefined;
    if (this.panel) {
      this.panel.dispose();
    }
  }
}