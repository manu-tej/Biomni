import * as vscode from 'vscode';
import * as path from 'path';
import { BlastResults, AnnotationResults, SequenceAnalysis } from '../../tools/genomics/index';
import { GenomicsResultsManager } from '../../tools/results/manager';

/**
 * Interactive results webview panel for displaying genomics analysis results
 */
export class GenomicsResultsPanel {
    public static currentPanel: GenomicsResultsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        _context: vscode.ExtensionContext,
        private readonly resultsManager: GenomicsResultsManager
    ) {
        this.panel = panel;
        this.update();
        
        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
        
        // Clean up when panel is closed
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Create or show the results panel
     */
    public static createOrShow(
        context: vscode.ExtensionContext,
        resultsManager: GenomicsResultsManager,
        result?: BlastResults | AnnotationResults | SequenceAnalysis,
        resultId?: string
    ): void {
        const column = vscode.window.activeTextEditor 
            ? vscode.ViewColumn.Beside 
            : vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (GenomicsResultsPanel.currentPanel) {
            GenomicsResultsPanel.currentPanel.panel.reveal(column);
            
            // Update with new result if provided
            if (result) {
                GenomicsResultsPanel.currentPanel.displayResult(result, resultId);
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'biomniResults',
            'Biomni Analysis Results',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'out')),
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]
            }
        );

        GenomicsResultsPanel.currentPanel = new GenomicsResultsPanel(
            panel, 
            context, 
            resultsManager
        );

        // Display result if provided
        if (result) {
            GenomicsResultsPanel.currentPanel.displayResult(result, resultId);
        }
    }

    /**
     * Display a specific analysis result
     */
    public displayResult(
        result: BlastResults | AnnotationResults | SequenceAnalysis, 
        resultId?: string
    ): void {
        this.panel.webview.postMessage({
            command: 'displayResult',
            result,
            resultId,
            type: this.getResultType(result)
        });
    }

    /**
     * Show results history
     */
    public async showHistory(): Promise<void> {
        const history = await this.resultsManager.getHistory();
        this.panel.webview.postMessage({
            command: 'showHistory',
            history
        });
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'export':
                await this.handleExport(message.resultId, message.format);
                break;
                
            case 'loadResult':
                await this.handleLoadResult(message.resultId);
                break;
                
            case 'deleteResult':
                await this.handleDeleteResult(message.resultId);
                break;
                
            case 'showHistory':
                await this.showHistory();
                break;
                
            case 'clearCache':
                await this.handleClearCache();
                break;
                
            case 'copySequence':
                await this.handleCopySequence(message.sequence);
                break;
                
            case 'openBlastHit':
                await this.handleOpenBlastHit(message.hit);
                break;
        }
    }

    /**
     * Handle export request from webview
     */
    private async handleExport(resultId: string, format: string): Promise<void> {
        try {
            const result = await this.resultsManager.getResult(resultId);
            if (!result) {
                vscode.window.showErrorMessage('Result not found');
                return;
            }

            const exportedData = await this.resultsManager.exportResult(result, format as any);
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`biomni_result.${format}`),
                filters: this.getExportFilters(format)
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
     * Handle load result request from webview
     */
    private async handleLoadResult(resultId: string): Promise<void> {
        try {
            const result = await this.resultsManager.getResult(resultId);
            if (result) {
                this.displayResult(result, resultId);
            } else {
                vscode.window.showErrorMessage('Result not found');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load result: ${errorMessage}`);
        }
    }

    /**
     * Handle delete result request from webview
     */
    private async handleDeleteResult(resultId: string): Promise<void> {
        const confirmed = await vscode.window.showWarningMessage(
            'Are you sure you want to delete this result?',
            { modal: true },
            'Delete'
        );

        if (confirmed === 'Delete') {
            try {
                await this.resultsManager.removeResult(resultId);
                await this.showHistory(); // Refresh history view
                vscode.window.showInformationMessage('Result deleted successfully');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to delete result: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle clear cache request from webview
     */
    private async handleClearCache(): Promise<void> {
        const confirmed = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all cached results?',
            { modal: true },
            'Clear All'
        );

        if (confirmed === 'Clear All') {
            try {
                await this.resultsManager.clearCache();
                await this.showHistory(); // Refresh history view
                vscode.window.showInformationMessage('Cache cleared successfully');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to clear cache: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle copy sequence to clipboard
     */
    private async handleCopySequence(sequence: string): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(sequence);
            vscode.window.showInformationMessage('Sequence copied to clipboard');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to copy sequence to clipboard');
        }
    }

    /**
     * Handle opening BLAST hit details
     */
    private async handleOpenBlastHit(hit: any): Promise<void> {
        // Create a new document with the hit details
        const doc = await vscode.workspace.openTextDocument({
            content: this.formatBlastHitDetails(hit),
            language: 'plaintext'
        });
        
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Update the webview content
     */
    private update(): void {
        this.panel.webview.html = this.getWebviewContent();
    }

    /**
     * Generate the HTML content for the webview
     */
    private getWebviewContent(): string {
        const nonce = this.getNonce();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Biomni Analysis Results</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-font-family);
            --vscode-font-size: var(--vscode-font-size);
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .content {
            margin-top: 20px;
        }
        
        .result-section {
            margin-bottom: 30px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .result-header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .result-body {
            padding: 15px;
        }
        
        .hit-item {
            border: 1px solid var(--vscode-panel-border);
            margin-bottom: 10px;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .hit-header {
            background-color: var(--vscode-editor-lineHighlightBackground);
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            justify-content: between;
            align-items: center;
        }
        
        .hit-body {
            padding: 12px;
            display: none;
        }
        
        .hit-body.expanded {
            display: block;
        }
        
        .sequence {
            font-family: monospace;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            word-break: break-all;
            margin: 10px 0;
        }
        
        .alignment {
            font-family: monospace;
            white-space: pre-line;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            overflow-x: auto;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        
        .stat-item {
            background-color: var(--vscode-editor-lineHighlightBackground);
            padding: 10px;
            border-radius: 4px;
        }
        
        .stat-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            text-transform: uppercase;
        }
        
        .stat-value {
            font-size: 16px;
            margin-top: 4px;
        }
        
        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
        }
        
        .history-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .history-info {
            flex: 1;
        }
        
        .history-actions {
            display: flex;
            gap: 5px;
        }
        
        .history-actions button {
            padding: 4px 8px;
            font-size: 11px;
        }
        
        .feature-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .feature-item:last-child {
            border-bottom: none;
        }
        
        .feature-type {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        .error {
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        
        .success {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Biomni Analysis Results</h1>
        <div class="controls">
            <button onclick="showHistory()">History</button>
            <button onclick="clearCache()">Clear Cache</button>
            <button onclick="exportResult('json')" id="exportJsonBtn" disabled>Export JSON</button>
            <button onclick="exportResult('csv')" id="exportCsvBtn" disabled>Export CSV</button>
            <button onclick="exportResult('fasta')" id="exportFastaBtn" disabled>Export FASTA</button>
        </div>
    </div>
    
    <div class="content" id="content">
        <div class="loading">
            No results to display. Run a genomics analysis to see results here.
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentResult = null;
        let currentResultId = null;
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'displayResult':
                    displayResult(message.result, message.resultId, message.type);
                    break;
                case 'showHistory':
                    showHistoryView(message.history);
                    break;
            }
        });
        
        function displayResult(result, resultId, type) {
            currentResult = result;
            currentResultId = resultId;
            
            const content = document.getElementById('content');
            
            // Enable export buttons
            document.getElementById('exportJsonBtn').disabled = false;
            document.getElementById('exportCsvBtn').disabled = false;
            document.getElementById('exportFastaBtn').disabled = false;
            
            if (type === 'blast') {
                content.innerHTML = generateBlastResultsHTML(result);
            } else if (type === 'annotation') {
                content.innerHTML = generateAnnotationResultsHTML(result);
            } else if (type === 'analysis') {
                content.innerHTML = generateAnalysisResultsHTML(result);
            }
            
            // Add event listeners for interactive elements
            addEventListeners();
        }
        
        function generateBlastResultsHTML(result) {
            let html = '';
            
            // Query information
            html += '<div class="result-section">';
            html += '<div class="result-header">Query Information</div>';
            html += '<div class="result-body">';
            html += '<div class="stats-grid">';
            html += \`<div class="stat-item"><div class="stat-label">Program</div><div class="stat-value">\${result.program}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Database</div><div class="stat-value">\${result.database}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Query Length</div><div class="stat-value">\${result.querySequence.length} bp</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Total Hits</div><div class="stat-value">\${result.hits.length}</div></div>\`;
            html += '</div>';
            html += \`<div class="sequence" onclick="copySequence('\${result.querySequence}')">\${formatSequence(result.querySequence)}</div>\`;
            html += '</div></div>';
            
            // Hits
            if (result.hits.length > 0) {
                html += '<div class="result-section">';
                html += '<div class="result-header">BLAST Hits</div>';
                html += '<div class="result-body">';
                
                result.hits.forEach((hit, index) => {
                    html += \`<div class="hit-item">\`;
                    html += \`<div class="hit-header" onclick="toggleHit(\${index})">\`;
                    html += \`<div><strong>\${hit.description}</strong> (E-value: \${hit.evalue})</div>\`;
                    html += \`<div>▼</div>\`;
                    html += \`</div>\`;
                    html += \`<div class="hit-body" id="hit-\${index}">\`;
                    html += \`<div class="stats-grid">\`;
                    html += \`<div class="stat-item"><div class="stat-label">Accession</div><div class="stat-value">\${hit.accession}</div></div>\`;
                    html += \`<div class="stat-item"><div class="stat-label">E-value</div><div class="stat-value">\${hit.evalue}</div></div>\`;
                    html += \`<div class="stat-item"><div class="stat-label">Bit Score</div><div class="stat-value">\${hit.bitScore}</div></div>\`;
                    html += \`<div class="stat-item"><div class="stat-label">Identity</div><div class="stat-value">\${hit.identity}</div></div>\`;
                    html += \`</div>\`;
                    if (hit.alignmentString) {
                        html += \`<div class="alignment">\${formatAlignment(hit)}</div>\`;
                    }
                    html += \`<button onclick="openBlastHit(\${index})">View Details</button>\`;
                    html += \`</div>\`;
                    html += \`</div>\`;
                });
                
                html += '</div></div>';
            }
            
            return html;
        }
        
        function generateAnnotationResultsHTML(result) {
            let html = '';
            
            // Sequence information
            html += '<div class="result-section">';
            html += '<div class="result-header">Sequence Information</div>';
            html += '<div class="result-body">';
            html += '<div class="stats-grid">';
            html += \`<div class="stat-item"><div class="stat-label">Length</div><div class="stat-value">\${result.sequence.length} bp</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">ORFs Found</div><div class="stat-value">\${result.orfs.length}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Domains</div><div class="stat-value">\${result.domains.length}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Features</div><div class="stat-value">\${result.features.length}</div></div>\`;
            html += '</div>';
            html += '</div></div>';
            
            // ORFs
            if (result.orfs.length > 0) {
                html += '<div class="result-section">';
                html += '<div class="result-header">Open Reading Frames</div>';
                html += '<div class="result-body">';
                
                result.orfs.forEach((orf, index) => {
                    html += \`<div class="feature-item">\`;
                    html += \`<div>\`;
                    html += \`<strong>\${orf.id}</strong> (\${orf.start}-\${orf.end}, \${orf.strand}, frame \${orf.frame})\`;
                    html += \`<br><small>\${orf.length} bp</small>\`;
                    html += \`</div>\`;
                    html += \`<button onclick="copySequence('\${orf.translation}')">Copy Protein</button>\`;
                    html += \`</div>\`;
                });
                
                html += '</div></div>';
            }
            
            // Domains
            if (result.domains.length > 0) {
                html += '<div class="result-section">';
                html += '<div class="result-header">Protein Domains</div>';
                html += '<div class="result-body">';
                
                result.domains.forEach((domain, index) => {
                    html += \`<div class="feature-item">\`;
                    html += \`<div>\`;
                    html += \`<strong>\${domain.name}</strong> (\${domain.start}-\${domain.end})\`;
                    html += \`<br><small>\${domain.description} (E-value: \${domain.evalue})</small>\`;
                    html += \`</div>\`;
                    html += \`<span class="feature-type" style="background-color: #4ecdc4;">\${domain.database}</span>\`;
                    html += \`</div>\`;
                });
                
                html += '</div></div>';
            }
            
            return html;
        }
        
        function generateAnalysisResultsHTML(result) {
            let html = '';
            
            // Basic statistics
            html += '<div class="result-section">';
            html += '<div class="result-header">Sequence Statistics</div>';
            html += '<div class="result-body">';
            html += '<div class="stats-grid">';
            html += \`<div class="stat-item"><div class="stat-label">Length</div><div class="stat-value">\${result.length} bp</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">GC Content</div><div class="stat-value">\${result.gcContent.toFixed(2)}%</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">A Count</div><div class="stat-value">\${result.composition.A}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">T Count</div><div class="stat-value">\${result.composition.T}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">G Count</div><div class="stat-value">\${result.composition.G}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">C Count</div><div class="stat-value">\${result.composition.C}</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Melting Temp</div><div class="stat-value">\${result.melting.tm.toFixed(1)}°C</div></div>\`;
            html += \`<div class="stat-item"><div class="stat-label">Molecular Weight</div><div class="stat-value">\${(result.molecular.molecularWeight / 1000).toFixed(1)} kDa</div></div>\`;
            html += '</div>';
            html += '</div></div>';
            
            // Restriction sites
            if (result.restrictions.length > 0) {
                html += '<div class="result-section">';
                html += '<div class="result-header">Restriction Sites</div>';
                html += '<div class="result-body">';
                
                result.restrictions.forEach((site, index) => {
                    html += \`<div class="feature-item">\`;
                    html += \`<div>\`;
                    html += \`<strong>\${site.enzyme}</strong> at position \${site.position}\`;
                    html += \`<br><small>\${site.site} (\${site.blunt ? 'Blunt' : 'Sticky'} end)</small>\`;
                    html += \`</div>\`;
                    html += \`</div>\`;
                });
                
                html += '</div></div>';
            }
            
            return html;
        }
        
        function formatSequence(sequence, lineLength = 60) {
            const lines = [];
            for (let i = 0; i < sequence.length; i += lineLength) {
                lines.push(sequence.substring(i, i + lineLength));
            }
            return lines.join('\\n');
        }
        
        function formatAlignment(hit) {
            // This would format the alignment properly
            return hit.alignmentString || 'Alignment not available';
        }
        
        function toggleHit(index) {
            const hitBody = document.getElementById(\`hit-\${index}\`);
            if (hitBody.classList.contains('expanded')) {
                hitBody.classList.remove('expanded');
            } else {
                hitBody.classList.add('expanded');
            }
        }
        
        function copySequence(sequence) {
            vscode.postMessage({
                command: 'copySequence',
                sequence: sequence
            });
        }
        
        function openBlastHit(index) {
            if (currentResult && currentResult.hits) {
                vscode.postMessage({
                    command: 'openBlastHit',
                    hit: currentResult.hits[index]
                });
            }
        }
        
        function exportResult(format) {
            if (currentResultId) {
                vscode.postMessage({
                    command: 'export',
                    resultId: currentResultId,
                    format: format
                });
            }
        }
        
        function showHistory() {
            vscode.postMessage({
                command: 'showHistory'
            });
        }
        
        function showHistoryView(history) {
            const content = document.getElementById('content');
            
            // Disable export buttons when showing history
            document.getElementById('exportJsonBtn').disabled = true;
            document.getElementById('exportCsvBtn').disabled = true;
            document.getElementById('exportFastaBtn').disabled = true;
            
            let html = '<div class="result-section">';
            html += '<div class="result-header">Analysis History</div>';
            html += '<div class="result-body">';
            
            if (history.length === 0) {
                html += '<p>No analysis history found.</p>';
            } else {
                history.forEach((item, index) => {
                    const date = new Date(item.timestamp).toLocaleString();
                    html += \`<div class="history-item" onclick="loadResult('\${item.id}')">\`;
                    html += \`<div class="history-info">\`;
                    html += \`<strong>\${item.type.toUpperCase()}</strong> - \${date}\`;
                    html += \`<br><small>Sequence: \${item.sequence}... (\${formatBytes(item.size)})</small>\`;
                    html += \`</div>\`;
                    html += \`<div class="history-actions">\`;
                    html += \`<button onclick="event.stopPropagation(); loadResult('\${item.id}')">Load</button>\`;
                    html += \`<button onclick="event.stopPropagation(); deleteResult('\${item.id}')">Delete</button>\`;
                    html += \`</div>\`;
                    html += \`</div>\`;
                });
            }
            
            html += '</div></div>';
            content.innerHTML = html;
        }
        
        function loadResult(resultId) {
            vscode.postMessage({
                command: 'loadResult',
                resultId: resultId
            });
        }
        
        function deleteResult(resultId) {
            vscode.postMessage({
                command: 'deleteResult',
                resultId: resultId
            });
        }
        
        function clearCache() {
            vscode.postMessage({
                command: 'clearCache'
            });
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function addEventListeners() {
            // Additional event listeners for interactive elements
        }
    </script>
</body>
</html>`;
    }

    /**
     * Get result type for display purposes
     */
    private getResultType(result: BlastResults | AnnotationResults | SequenceAnalysis): string {
        if ('hits' in result) return 'blast';
        if ('orfs' in result) return 'annotation';
        if ('composition' in result) return 'analysis';
        return 'unknown';
    }

    /**
     * Format BLAST hit details for text document
     */
    private formatBlastHitDetails(hit: any): string {
        return `BLAST Hit Details
===============

ID: ${hit.id}
Description: ${hit.description}
Accession: ${hit.accession}
Length: ${hit.length} bp
E-value: ${hit.evalue}
Bit Score: ${hit.bitScore}
Identity: ${hit.identity}
Positive: ${hit.positive}
Gaps: ${hit.gaps}

Query: ${hit.queryStart} - ${hit.queryEnd}
Subject: ${hit.subjectStart} - ${hit.subjectEnd}

Alignment:
${hit.alignmentString || 'Alignment not available'}

Query Sequence:
${hit.querySequence || 'Not available'}

Subject Sequence:
${hit.subjectSequence || 'Not available'}
`;
    }

    /**
     * Get export file filters
     */
    private getExportFilters(format: string): Record<string, string[]> {
        const filters: Record<string, Record<string, string[]>> = {
            'json': { 'JSON Files': ['json'] },
            'csv': { 'CSV Files': ['csv'] },
            'fasta': { 'FASTA Files': ['fasta', 'fa', 'fas'] },
            'genbank': { 'GenBank Files': ['gb', 'gbk'] }
        };

        return filters[format] || { 'All Files': ['*'] };
    }

    /**
     * Generate unique nonce for content security policy
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
     * Dispose of panel resources
     */
    private dispose(): void {
        GenomicsResultsPanel.currentPanel = undefined;
        this.panel.dispose();
        
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}