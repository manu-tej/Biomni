import * as vscode from 'vscode';
import * as path from 'path';
import { GenomicsToolsService } from '../services/genomicsTools';
import { BiomniMcpClient } from '../biomni/mcpClient';

// Tree item types for different sections
export enum BiomniItemType {
    Root = 'root',
    Database = 'database',
    Analysis = 'analysis',
    FileInfo = 'fileInfo',
    Settings = 'settings',
    Result = 'result',
    Action = 'action'
}

// Data structure for tree items
export interface BiomniTreeItem {
    label: string;
    type: BiomniItemType;
    children?: BiomniTreeItem[];
    icon?: string;
    command?: vscode.Command;
    contextValue?: string;
    description?: string;
    tooltip?: string;
    data?: any;
}

export class BiomniSidebarProvider implements vscode.TreeDataProvider<BiomniTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BiomniTreeItem | undefined | null | void> = new vscode.EventEmitter<BiomniTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BiomniTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private results: Map<string, BiomniTreeItem[]> = new Map();
    private fileInfo: BiomniTreeItem[] = [];
    private context: vscode.ExtensionContext;
    private genomicsTools: GenomicsToolsService;

    constructor(context: vscode.ExtensionContext, mcpClient?: BiomniMcpClient) {
        this.context = context;
        this.genomicsTools = new GenomicsToolsService(mcpClient);
        this.initialize();
    }

    public updateMcpClient(mcpClient: BiomniMcpClient): void {
        this.genomicsTools.updateMcpClient(mcpClient);
    }

    private initialize(): void {
        // Register tree view
        vscode.window.createTreeView('biomniSidebar', {
            treeDataProvider: this,
            showCollapseAll: true
        });

        // Store context for later use
        this.context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(() => this.updateFileInfo())
        );

        // Register commands for tree items
        this.registerCommands();
    }

    private registerCommands(): void {
        // Database commands
        vscode.commands.registerCommand('biomni.sidebar.queryUniprot', () => this.queryDatabase('uniprot'));
        vscode.commands.registerCommand('biomni.sidebar.queryPDB', () => this.queryDatabase('pdb'));
        vscode.commands.registerCommand('biomni.sidebar.queryAlphaFold', () => this.queryDatabase('alphafold'));
        
        // Analysis commands
        vscode.commands.registerCommand('biomni.sidebar.runBlast', () => this.runAnalysis('blast'));
        vscode.commands.registerCommand('biomni.sidebar.runAlignment', () => this.runAnalysis('alignment'));
        
        // File commands
        vscode.commands.registerCommand('biomni.sidebar.validateFile', () => this.validateActiveFile());
        
        // Settings commands
        vscode.commands.registerCommand('biomni.sidebar.openSettings', () => this.openSettings());
        
        // Result actions
        vscode.commands.registerCommand('biomni.sidebar.viewResult', (item: BiomniTreeItem) => this.viewResult(item));
        vscode.commands.registerCommand('biomni.sidebar.exportResult', (item: BiomniTreeItem) => this.exportResult(item));
    }

    getTreeItem(element: BiomniTreeItem): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.label,
            element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );

        if (element.icon) {
            item.iconPath = new vscode.ThemeIcon(element.icon);
        }

        if (element.command) {
            item.command = element.command;
        }

        if (element.contextValue) {
            item.contextValue = element.contextValue;
        }

        if (element.description) {
            item.description = element.description;
        }

        if (element.tooltip) {
            item.tooltip = element.tooltip;
        }

        return item;
    }

    getChildren(element?: BiomniTreeItem): Thenable<BiomniTreeItem[]> {
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        }

        if (element.children) {
            return Promise.resolve(element.children);
        }

        // Dynamic children based on type
        switch (element.type) {
            case BiomniItemType.Database:
                return Promise.resolve(this.getDatabaseItems());
            case BiomniItemType.Analysis:
                return Promise.resolve(this.getAnalysisItems());
            case BiomniItemType.FileInfo:
                return Promise.resolve(this.fileInfo);
            case BiomniItemType.Settings:
                return Promise.resolve(this.getSettingsItems());
            default:
                return Promise.resolve([]);
        }
    }

    private getRootItems(): BiomniTreeItem[] {
        return [
            {
                label: 'Databases',
                type: BiomniItemType.Database,
                icon: 'database',
                children: [],
                tooltip: 'Query biological databases'
            },
            {
                label: 'Analysis',
                type: BiomniItemType.Analysis,
                icon: 'beaker',
                children: [],
                tooltip: 'Run analysis tools'
            },
            {
                label: 'File Info',
                type: BiomniItemType.FileInfo,
                icon: 'file-text',
                children: this.fileInfo,
                tooltip: 'Current file information'
            },
            {
                label: 'Settings',
                type: BiomniItemType.Settings,
                icon: 'settings-gear',
                children: [],
                tooltip: 'Extension settings'
            }
        ];
    }

    private getDatabaseItems(): BiomniTreeItem[] {
        const items: BiomniTreeItem[] = [
            {
                label: 'UniProt',
                type: BiomniItemType.Action,
                icon: 'search',
                command: {
                    command: 'biomni.sidebar.queryUniprot',
                    title: 'Query UniProt'
                },
                tooltip: 'Search UniProt database'
            },
            {
                label: 'PDB',
                type: BiomniItemType.Action,
                icon: 'search',
                command: {
                    command: 'biomni.sidebar.queryPDB',
                    title: 'Query PDB'
                },
                tooltip: 'Search Protein Data Bank'
            },
            {
                label: 'AlphaFold',
                type: BiomniItemType.Action,
                icon: 'search',
                command: {
                    command: 'biomni.sidebar.queryAlphaFold',
                    title: 'Query AlphaFold'
                },
                tooltip: 'Search AlphaFold database'
            }
        ];

        // Add results if available
        const dbResults = this.results.get('database');
        if (dbResults && dbResults.length > 0) {
            items.push({
                label: `Results (${dbResults.length})`,
                type: BiomniItemType.Result,
                icon: 'list-tree',
                children: dbResults,
                contextValue: 'results'
            });
        }

        return items;
    }

    private getAnalysisItems(): BiomniTreeItem[] {
        const items: BiomniTreeItem[] = [
            {
                label: 'BLAST',
                type: BiomniItemType.Action,
                icon: 'play',
                command: {
                    command: 'biomni.sidebar.runBlast',
                    title: 'Run BLAST'
                },
                tooltip: 'Run BLAST analysis'
            },
            {
                label: 'Sequence Alignment',
                type: BiomniItemType.Action,
                icon: 'play',
                command: {
                    command: 'biomni.sidebar.runAlignment',
                    title: 'Run Alignment'
                },
                tooltip: 'Run sequence alignment'
            }
        ];

        // Add results if available
        const analysisResults = this.results.get('analysis');
        if (analysisResults && analysisResults.length > 0) {
            items.push({
                label: `Results (${analysisResults.length})`,
                type: BiomniItemType.Result,
                icon: 'list-tree',
                children: analysisResults,
                contextValue: 'results'
            });
        }

        return items;
    }

    private getSettingsItems(): BiomniTreeItem[] {
        return [
            {
                label: 'API Keys',
                type: BiomniItemType.Action,
                icon: 'key',
                command: {
                    command: 'biomni.settings.manageApiKeys',
                    title: 'Manage API Keys'
                },
                tooltip: 'Manage API keys'
            },
            {
                label: 'Configuration',
                type: BiomniItemType.Action,
                icon: 'gear',
                command: {
                    command: 'biomni.sidebar.openSettings',
                    title: 'Open Settings'
                },
                tooltip: 'Open extension settings'
            }
        ];
    }

    private async queryDatabase(database: string): Promise<void> {
        const query = await vscode.window.showInputBox({
            prompt: `Enter search query for ${database}`,
            placeHolder: 'e.g., protein name, ID, or sequence'
        });

        if (!query) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Searching ${database}...`,
            cancellable: false
        }, async () => {
            try {
                let searchResults: any[] = [];
                
                // Call appropriate service based on database
                switch (database.toLowerCase()) {
                    case 'uniprot':
                        searchResults = await this.genomicsTools.searchUniprot(query);
                        break;
                    case 'pdb':
                        searchResults = await this.genomicsTools.searchPDB(query);
                        break;
                    case 'alphafold':
                        searchResults = await this.genomicsTools.searchAlphaFold(query);
                        break;
                    default:
                        vscode.window.showErrorMessage(`Unknown database: ${database}`);
                        return;
                }

                // Transform results to tree items
                const treeResults: BiomniTreeItem[] = searchResults.map((result) => {
                    // Format based on database type
                    let label = '';
                    let description = '';
                    
                    if (database.toLowerCase() === 'uniprot') {
                        label = `${result.accession}: ${result.name || ''}`;
                        description = result.organism || '';
                    } else if (database.toLowerCase() === 'pdb') {
                        label = `${result.pdbId}: ${result.title || ''}`;
                        description = result.method || '';
                    } else if (database.toLowerCase() === 'alphafold') {
                        label = `${result.uniprotId}`;
                        description = `Confidence: ${result.confidence}%`;
                    }

                    return {
                        label,
                        type: BiomniItemType.Result,
                        icon: 'file',
                        description,
                        command: {
                            command: 'biomni.sidebar.viewResult',
                            title: 'View Result',
                            arguments: [{ 
                                label, 
                                data: { ...result, query, database } 
                            }]
                        },
                        contextValue: 'result',
                        tooltip: JSON.stringify(result, null, 2)
                    };
                });

                this.results.set('database', treeResults);
                this.refresh();

                vscode.window.showInformationMessage(
                    `Found ${treeResults.length} results in ${database}`
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        });
    }

    private async runAnalysis(analysisType: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file to analyze');
            return;
        }

        // Get sequence from active editor
        const sequence = editor.document.getText();
        if (!sequence || sequence.length === 0) {
            vscode.window.showWarningMessage('No sequence found in active file');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running ${analysisType} analysis...`,
            cancellable: false
        }, async () => {
            try {
                let analysisResults: any;
                
                // Run appropriate analysis based on type
                switch (analysisType.toLowerCase()) {
                    case 'blast':
                        // For BLAST, we need to get database preference
                        const database = await vscode.window.showQuickPick(
                            ['nr', 'nt', 'swissprot', 'pdb'],
                            { placeHolder: 'Select BLAST database' }
                        );
                        if (!database) return;

                        const blastResults = await this.genomicsTools.blastSearch({
                            sequence,
                            database,
                            program: 'blastn'
                        });
                        
                        // Transform BLAST results to tree items
                        const blastTreeItems: BiomniTreeItem[] = blastResults.map((hit) => ({
                            label: hit.accession,
                            type: BiomniItemType.Result,
                            icon: 'file',
                            description: `E-value: ${hit.evalue}, Identity: ${hit.identity}%`,
                            tooltip: hit.description,
                            command: {
                                command: 'biomni.sidebar.viewResult',
                                title: 'View BLAST Hit',
                                arguments: [{ 
                                    label: hit.accession, 
                                    data: { ...hit, analysisType: 'BLAST' } 
                                }]
                            },
                            contextValue: 'result'
                        }));

                        this.results.set('analysis', blastTreeItems);
                        break;

                    case 'alignment':
                    case 'sequence alignment':
                        // For sequence analysis
                        analysisResults = await this.genomicsTools.analyzeSequence(sequence);
                        
                        // Create tree items for sequence analysis
                        const analysisTreeItems: BiomniTreeItem[] = [
                            {
                                label: 'Sequence Properties',
                                type: BiomniItemType.Result,
                                icon: 'info',
                                description: `Length: ${analysisResults.length}bp`,
                                children: [
                                    {
                                        label: 'GC Content',
                                        type: BiomniItemType.Result,
                                        description: `${analysisResults.gcContent.toFixed(2)}%`,
                                        icon: 'graph'
                                    },
                                    {
                                        label: 'Composition',
                                        type: BiomniItemType.Result,
                                        description: `A:${analysisResults.composition.A || 0} T:${analysisResults.composition.T || 0} G:${analysisResults.composition.G || 0} C:${analysisResults.composition.C || 0}`,
                                        icon: 'list-flat'
                                    }
                                ]
                            }
                        ];

                        // Add ORFs if found
                        if (analysisResults.orfs && analysisResults.orfs.length > 0) {
                            analysisTreeItems.push({
                                label: `ORFs Found: ${analysisResults.orfs.length}`,
                                type: BiomniItemType.Result,
                                icon: 'symbol-method',
                                children: analysisResults.orfs.map((orf: any) => ({
                                    label: `ORF ${orf.frame || ''}`,
                                    type: BiomniItemType.Result,
                                    description: `${orf.start}-${orf.end} (${orf.length}bp)`,
                                    icon: 'arrow-right'
                                }))
                            });
                        }

                        this.results.set('analysis', analysisTreeItems);
                        break;

                    default:
                        vscode.window.showErrorMessage(`Unknown analysis type: ${analysisType}`);
                        return;
                }

                this.refresh();
                vscode.window.showInformationMessage(`${analysisType} analysis complete`);
                
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        });
    }

    private async validateActiveFile(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file to validate');
            return;
        }

        const fileName = path.basename(editor.document.fileName);
        const extension = path.extname(fileName);

        // Check if it's a biological file format
        const bioFormats = ['.fasta', '.fa', '.fastq', '.fq', '.vcf', '.pdb'];
        if (bioFormats.includes(extension)) {
            vscode.window.showInformationMessage(`✓ Valid ${extension} file format`);
        } else {
            vscode.window.showWarningMessage(`File type ${extension} is not a recognized biological format`);
        }
    }

    private updateFileInfo(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.fileInfo = [];
            this.refresh();
            return;
        }

        const fileName = path.basename(editor.document.fileName);
        const extension = path.extname(fileName);
        const lines = editor.document.lineCount;

        this.fileInfo = [
            {
                label: 'Name',
                type: BiomniItemType.Result,
                description: fileName,
                icon: 'file'
            },
            {
                label: 'Type',
                type: BiomniItemType.Result,
                description: extension || 'Unknown',
                icon: 'symbol-file'
            },
            {
                label: 'Lines',
                type: BiomniItemType.Result,
                description: lines.toString(),
                icon: 'list-ordered'
            }
        ];

        // Add validate button for biological files
        const bioFormats = ['.fasta', '.fa', '.fastq', '.fq', '.vcf', '.pdb'];
        if (bioFormats.includes(extension)) {
            this.fileInfo.push({
                label: 'Validate Format',
                type: BiomniItemType.Action,
                icon: 'check',
                command: {
                    command: 'biomni.sidebar.validateFile',
                    title: 'Validate File'
                }
            });
        }

        this.refresh();
    }

    private openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'biomni');
    }

    private viewResult(item: BiomniTreeItem): void {
        vscode.window.showInformationMessage(`Viewing: ${item.label}`, 'Export', 'Close')
            .then(selection => {
                if (selection === 'Export') {
                    this.exportResult(item);
                }
            });
    }

    private exportResult(item: BiomniTreeItem): void {
        vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`${item.label}.json`),
            filters: {
                'JSON': ['json'],
                'CSV': ['csv'],
                'All': ['*']
            }
        }).then(uri => {
            if (uri) {
                vscode.window.showInformationMessage(`Result exported to ${uri.fsPath}`);
            }
        });
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public clearResults(): void {
        this.results.clear();
        this.refresh();
    }
}