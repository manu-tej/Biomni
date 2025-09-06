import * as vscode from 'vscode';
import { GenomicsToolsService } from './genomicsTools';
import { ResultsManager } from './resultsManager';

export interface QuickAction {
    label: string;
    description?: string;
    detail?: string;
    action: () => Promise<void> | void;
    icon?: string;
}

export class CommandPaletteService {
    private genomicsTools: GenomicsToolsService;
    private resultsManager: ResultsManager;
    private recentCommands: string[] = [];
    private maxRecentCommands = 5;

    constructor(
        genomicsTools: GenomicsToolsService,
        resultsManager: ResultsManager,
        private context: vscode.ExtensionContext
    ) {
        this.genomicsTools = genomicsTools;
        this.resultsManager = resultsManager;
        this.loadRecentCommands();
    }

    /**
     * Register enhanced command palette commands
     */
    registerCommands(): void {
        // Quick access command
        vscode.commands.registerCommand('biomni.quickAccess', () => this.showQuickAccess());
        
        // Recent commands
        vscode.commands.registerCommand('biomni.recentCommands', () => this.showRecentCommands());
        
        // Quick sequence analysis
        vscode.commands.registerCommand('biomni.quickSequenceAnalysis', () => this.quickSequenceAnalysis());
        
        // Quick database search
        vscode.commands.registerCommand('biomni.quickDatabaseSearch', () => this.quickDatabaseSearch());
        
        // Workflow launcher
        vscode.commands.registerCommand('biomni.launchWorkflow', () => this.launchWorkflow());
    }

    /**
     * Show quick access menu with most common actions
     */
    async showQuickAccess(): Promise<void> {
        const actions: vscode.QuickPickItem[] = [
            {
                label: '$(search) Database Search',
                description: 'Search biological databases',
                detail: 'UniProt, PDB, AlphaFold'
            },
            {
                label: '$(beaker) Run Analysis',
                description: 'Analyze sequences and structures',
                detail: 'BLAST, Alignment, Sequence Properties'
            },
            {
                label: '$(history) View History',
                description: 'View recent results',
                detail: `${this.resultsManager.getRecentResults(5).length} recent results`
            },
            {
                label: '$(export) Export Results',
                description: 'Export results in various formats',
                detail: 'JSON, CSV, FASTA, GenBank, HTML'
            },
            {
                label: '$(file) Validate File',
                description: 'Validate biological file format',
                detail: 'FASTA, FASTQ, VCF, PDB'
            },
            {
                label: '$(settings-gear) Settings',
                description: 'Configure Biomni extension',
                detail: 'API keys, preferences'
            }
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select an action',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selected) return;

        // Execute based on selection
        switch (selected.label) {
            case '$(search) Database Search':
                await this.quickDatabaseSearch();
                break;
            case '$(beaker) Run Analysis':
                await this.quickAnalysis();
                break;
            case '$(history) View History':
                await vscode.commands.executeCommand('biomni.openPanel');
                break;
            case '$(export) Export Results':
                await this.quickExport();
                break;
            case '$(file) Validate File':
                await vscode.commands.executeCommand('biomni.file.validateFormat');
                break;
            case '$(settings-gear) Settings':
                await vscode.commands.executeCommand('biomni.settings.openPanel');
                break;
        }
    }

    /**
     * Show recent commands
     */
    async showRecentCommands(): Promise<void> {
        if (this.recentCommands.length === 0) {
            vscode.window.showInformationMessage('No recent commands');
            return;
        }

        const items = this.recentCommands.map(cmd => ({
            label: this.getCommandLabel(cmd),
            description: cmd
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a recent command to run'
        });

        if (selected) {
            await vscode.commands.executeCommand(selected.description);
            this.addRecentCommand(selected.description);
        }
    }

    /**
     * Quick sequence analysis from current file or input
     */
    async quickSequenceAnalysis(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        let sequence = '';

        if (editor) {
            const selection = editor.selection;
            sequence = selection.isEmpty 
                ? editor.document.getText()
                : editor.document.getText(selection);
        }

        if (!sequence || sequence.length === 0) {
            sequence = await vscode.window.showInputBox({
                prompt: 'Enter sequence to analyze',
                placeHolder: 'ATCGATCG... or paste protein sequence'
            }) || '';
        }

        if (!sequence) return;

        // Determine sequence type
        const isProtein = /[EFILPQXZ]/i.test(sequence);
        
        const analysisOptions = isProtein
            ? ['Protein Properties', 'Domain Search', 'Structure Prediction', 'BLAST Protein']
            : ['DNA Properties', 'ORF Finding', 'Translation', 'BLAST Nucleotide'];

        const selected = await vscode.window.showQuickPick(analysisOptions, {
            placeHolder: 'Select analysis type'
        });

        if (!selected) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running ${selected}...`,
            cancellable: false
        }, async () => {
            let result;
            
            switch (selected) {
                case 'DNA Properties':
                case 'Protein Properties':
                    result = await this.genomicsTools.analyzeSequence(sequence);
                    break;
                case 'BLAST Nucleotide':
                    result = await this.genomicsTools.blastSearch({
                        sequence,
                        database: 'nt',
                        program: 'blastn'
                    });
                    break;
                case 'BLAST Protein':
                    result = await this.genomicsTools.blastSearch({
                        sequence,
                        database: 'nr',
                        program: 'blastp'
                    });
                    break;
                default:
                    vscode.window.showInformationMessage(`${selected} analysis complete (mock)`);
                    return;
            }

            // Store result
            const resultId = this.resultsManager.storeResult(
                'analysis',
                selected.toLowerCase().replace(' ', '_'),
                result,
                sequence.substring(0, 50)
            );

            vscode.window.showInformationMessage(
                `${selected} complete`,
                'View Results',
                'Export'
            ).then(action => {
                if (!action) return;
                if (action === 'View Results') {
                    vscode.commands.executeCommand('biomni.openPanel');
                } else if (action === 'Export') {
                    this.resultsManager.exportResult(resultId, {
                        format: 'json',
                        includeMetadata: true,
                        prettify: true
                    });
                }
            });
        });
    }

    /**
     * Quick database search
     */
    async quickDatabaseSearch(): Promise<void> {
        const databases = [
            { label: 'UniProt', description: 'Protein sequences and annotations' },
            { label: 'PDB', description: 'Protein structures' },
            { label: 'AlphaFold', description: 'Predicted protein structures' },
            { label: 'NCBI Gene', description: 'Gene information' },
            { label: 'InterPro', description: 'Protein families and domains' }
        ];

        const selectedDb = await vscode.window.showQuickPick(databases, {
            placeHolder: 'Select database to search'
        });

        if (!selectedDb) return;

        const query = await vscode.window.showInputBox({
            prompt: `Search ${selectedDb.label}`,
            placeHolder: 'Enter gene name, protein ID, or keywords'
        });

        if (!query) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Searching ${selectedDb.label}...`,
            cancellable: false
        }, async () => {
            let results;
            
            switch (selectedDb.label) {
                case 'UniProt':
                    results = await this.genomicsTools.searchUniprot(query);
                    break;
                case 'PDB':
                    results = await this.genomicsTools.searchPDB(query);
                    break;
                case 'AlphaFold':
                    results = await this.genomicsTools.searchAlphaFold(query);
                    break;
                default:
                    // Mock for other databases
                    results = [{ database: selectedDb.label, query, mock: true }];
            }

            // Store results
            this.resultsManager.storeResult(
                'database',
                selectedDb.label.toLowerCase(),
                results,
                query
            );

            vscode.window.showInformationMessage(
                `Found ${results.length} results in ${selectedDb.label}`,
                'View Results'
            ).then(action => {
                if (action && action === 'View Results') {
                    vscode.commands.executeCommand('biomni.openPanel');
                }
            });
        });
    }

    /**
     * Quick analysis menu
     */
    async quickAnalysis(): Promise<void> {
        const analyses = [
            { label: 'BLAST Search', description: 'Sequence similarity search' },
            { label: 'Sequence Alignment', description: 'Multiple sequence alignment' },
            { label: 'Sequence Properties', description: 'GC content, composition, ORFs' },
            { label: 'Gene Annotation', description: 'Annotate genes and features' },
            { label: 'Protein Structure', description: 'Predict or analyze structure' }
        ];

        const selected = await vscode.window.showQuickPick(analyses, {
            placeHolder: 'Select analysis type'
        });

        if (!selected) return;

        // Route to appropriate handler
        switch (selected.label) {
            case 'BLAST Search':
                await vscode.commands.executeCommand('biomni.genomics.blast');
                break;
            case 'Sequence Alignment':
                await vscode.commands.executeCommand('biomni.genomics.align');
                break;
            case 'Sequence Properties':
                await this.quickSequenceAnalysis();
                break;
            default:
                vscode.window.showInformationMessage(`${selected.label} - Coming soon!`);
        }

        this.addRecentCommand(`biomni.analysis.${selected.label.toLowerCase().replace(' ', '_')}`);
    }

    /**
     * Quick export of recent results
     */
    async quickExport(): Promise<void> {
        const recentResults = this.resultsManager.getRecentResults(10);
        
        if (recentResults.length === 0) {
            vscode.window.showWarningMessage('No results to export');
            return;
        }

        const items = recentResults.map(r => ({
            label: `${r.source}: ${r.query || 'No query'}`,
            description: new Date(r.timestamp).toLocaleString(),
            id: r.id
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select result to export',
            canPickMany: true
        }) as typeof items | undefined;

        if (!selected || selected.length === 0) return;

        const format = await vscode.window.showQuickPick(
            ['JSON', 'CSV', 'FASTA', 'HTML'],
            { placeHolder: 'Select export format' }
        );

        if (!format) return;

        if (selected.length === 1 && selected[0]) {
            await this.resultsManager.exportResult(selected[0].id, {
                format: format.toLowerCase() as any,
                includeMetadata: true,
                prettify: true
            });
        } else {
            await this.resultsManager.exportMultipleResults(
                selected.map(s => s.id),
                {
                    format: format.toLowerCase() as any,
                    includeMetadata: true,
                    prettify: true
                }
            );
        }
    }

    /**
     * Launch workflow builder
     */
    async launchWorkflow(): Promise<void> {
        const workflows = [
            {
                label: 'Protein Analysis Pipeline',
                description: 'Search → Structure → Domains → Function',
                steps: ['uniprot', 'alphafold', 'interpro', 'go']
            },
            {
                label: 'Sequence Annotation Pipeline',
                description: 'BLAST → Alignment → Annotation → Visualization',
                steps: ['blast', 'align', 'annotate', 'visualize']
            },
            {
                label: 'Drug Target Discovery',
                description: 'Target → Structure → Docking → Analysis',
                steps: ['target', 'structure', 'dock', 'analyze']
            },
            {
                label: 'Custom Workflow',
                description: 'Build your own workflow',
                steps: []
            }
        ];

        const selected = await vscode.window.showQuickPick(workflows, {
            placeHolder: 'Select a workflow template'
        });

        if (!selected) return;

        if (selected.label === 'Custom Workflow') {
            vscode.window.showInformationMessage('Workflow builder coming soon!');
            return;
        }

        // Execute workflow steps
        vscode.window.showInformationMessage(
            `Starting ${selected.label}`,
            'View Progress'
        ).then(action => {
            if (action && action === 'View Progress') {
                vscode.commands.executeCommand('biomni.openPanel');
            }
        });

        // Mock workflow execution
        for (const step of selected.steps) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            vscode.window.showInformationMessage(`Completed: ${step}`);
        }
    }

    /**
     * Get friendly label for command
     */
    private getCommandLabel(command: string): string {
        const parts = command.split('.');
        const action = parts[parts.length - 1] || '';
        return action
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Add command to recent history
     */
    private addRecentCommand(command: string): void {
        // Remove if already exists
        const index = this.recentCommands.indexOf(command);
        if (index > -1) {
            this.recentCommands.splice(index, 1);
        }

        // Add to front
        this.recentCommands.unshift(command);

        // Trim to max size
        if (this.recentCommands.length > this.maxRecentCommands) {
            this.recentCommands = this.recentCommands.slice(0, this.maxRecentCommands);
        }

        this.saveRecentCommands();
    }

    /**
     * Save recent commands to storage
     */
    private saveRecentCommands(): void {
        this.context.globalState.update('biomni.recentCommands', this.recentCommands);
    }

    /**
     * Load recent commands from storage
     */
    private loadRecentCommands(): void {
        this.recentCommands = this.context.globalState.get('biomni.recentCommands', []);
    }
}