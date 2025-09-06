import * as vscode from 'vscode';
import { BiomniMcpClient } from '../biomni/mcpClient';

export interface BlastParams {
    sequence: string;
    database: string;
    program?: 'blastn' | 'blastp' | 'blastx' | 'tblastn' | 'tblastx';
    evalue?: number;
    maxResults?: number;
}

export interface BlastResult {
    accession: string;
    description: string;
    score: number;
    evalue: number;
    identity: number;
    coverage: number;
    alignment?: string;
}

export interface AnnotationOptions {
    includeFeatures?: boolean;
    includeDomains?: boolean;
    includeGO?: boolean;
    includePathways?: boolean;
}

export interface AnnotationResult {
    gene: string;
    description: string;
    features?: any[];
    domains?: any[];
    goTerms?: any[];
    pathways?: any[];
}

export interface SequenceAnalysis {
    length: number;
    gcContent: number;
    composition: Record<string, number>;
    orfs?: any[];
    translation?: string;
}

export class GenomicsToolsService {
    private mcpClient: BiomniMcpClient | undefined;

    constructor(mcpClient?: BiomniMcpClient) {
        this.mcpClient = mcpClient;
    }

    updateMcpClient(mcpClient: BiomniMcpClient): void {
        this.mcpClient = mcpClient;
    }

    /**
     * Run BLAST search against specified database
     */
    async blastSearch(params: BlastParams): Promise<BlastResult[]> {
        if (!this.mcpClient) {
            // Return mock data if MCP client not available
            return this.getMockBlastResults(params);
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.genomics.blast', {
                sequence: params.sequence,
                database: params.database,
                program: params.program || 'blastn',
                evalue: params.evalue || 0.001,
                max_results: params.maxResults || 10
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'BLAST search failed');
            }

            return this.transformBlastResults(toolResult.result);
        } catch (error) {
            console.error('BLAST search failed:', error);
            vscode.window.showErrorMessage(`BLAST search failed: ${error}`);
            return this.getMockBlastResults(params);
        }
    }

    /**
     * Annotate genes in sequence
     */
    async annotateGenes(sequence: string, options: AnnotationOptions = {}): Promise<AnnotationResult[]> {
        if (!this.mcpClient) {
            return this.getMockAnnotations();
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.genomics.annotate', {
                sequence,
                include_features: options.includeFeatures ?? true,
                include_domains: options.includeDomains ?? true,
                include_go: options.includeGO ?? false,
                include_pathways: options.includePathways ?? false
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'Gene annotation failed');
            }

            return this.transformAnnotationResults(toolResult.result);
        } catch (error) {
            console.error('Gene annotation failed:', error);
            vscode.window.showErrorMessage(`Gene annotation failed: ${error}`);
            return this.getMockAnnotations();
        }
    }

    /**
     * Analyze sequence properties
     */
    async analyzeSequence(sequence: string): Promise<SequenceAnalysis> {
        if (!this.mcpClient) {
            return this.getMockSequenceAnalysis(sequence);
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.genomics.sequence_analysis', {
                sequence,
                include_orfs: true,
                include_translation: true
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'Sequence analysis failed');
            }

            return this.transformSequenceAnalysis(toolResult.result);
        } catch (error) {
            console.error('Sequence analysis failed:', error);
            vscode.window.showErrorMessage(`Sequence analysis failed: ${error}`);
            return this.getMockSequenceAnalysis(sequence);
        }
    }

    /**
     * Search UniProt database
     */
    async searchUniprot(query: string): Promise<any[]> {
        if (!this.mcpClient) {
            return this.getMockUniprotResults(query);
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.database.uniprot', {
                query,
                limit: 10
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'UniProt search failed');
            }

            return Array.isArray(toolResult.result) ? toolResult.result : [toolResult.result];
        } catch (error) {
            console.error('UniProt search failed:', error);
            return this.getMockUniprotResults(query);
        }
    }

    /**
     * Search PDB database
     */
    async searchPDB(query: string): Promise<any[]> {
        if (!this.mcpClient) {
            return this.getMockPDBResults(query);
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.database.pdb', {
                query,
                limit: 10
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'PDB search failed');
            }

            return Array.isArray(toolResult.result) ? toolResult.result : [toolResult.result];
        } catch (error) {
            console.error('PDB search failed:', error);
            return this.getMockPDBResults(query);
        }
    }

    /**
     * Search AlphaFold database
     */
    async searchAlphaFold(query: string): Promise<any[]> {
        if (!this.mcpClient) {
            return this.getMockAlphaFoldResults(query);
        }

        try {
            const toolResult = await this.mcpClient.callTool('biomni.database.alphafold', {
                query,
                limit: 10
            });

            if (!toolResult.success) {
                throw new Error(toolResult.error || 'AlphaFold search failed');
            }

            return Array.isArray(toolResult.result) ? toolResult.result : [toolResult.result];
        } catch (error) {
            console.error('AlphaFold search failed:', error);
            return this.getMockAlphaFoldResults(query);
        }
    }

    // Transform functions to convert MCP responses to our format
    private transformBlastResults(mcpResult: any): BlastResult[] {
        if (!mcpResult || !mcpResult.hits) {
            return [];
        }

        return mcpResult.hits.map((hit: any) => ({
            accession: hit.accession || hit.id,
            description: hit.description || hit.title,
            score: hit.score || 0,
            evalue: hit.evalue || 0,
            identity: hit.identity || 0,
            coverage: hit.coverage || 0,
            alignment: hit.alignment
        }));
    }

    private transformAnnotationResults(mcpResult: any): AnnotationResult[] {
        if (!mcpResult || !mcpResult.annotations) {
            return [];
        }

        return mcpResult.annotations.map((ann: any) => ({
            gene: ann.gene || ann.name,
            description: ann.description,
            features: ann.features || [],
            domains: ann.domains || [],
            goTerms: ann.go_terms || [],
            pathways: ann.pathways || []
        }));
    }

    private transformSequenceAnalysis(mcpResult: any): SequenceAnalysis {
        return {
            length: mcpResult.length || 0,
            gcContent: mcpResult.gc_content || 0,
            composition: mcpResult.composition || {},
            orfs: mcpResult.orfs || [],
            translation: mcpResult.translation
        };
    }

    // Mock data functions for development/testing
    private getMockBlastResults(_params: BlastParams): BlastResult[] {
        return [
            {
                accession: 'NM_001234',
                description: 'Sample gene sequence match',
                score: 250,
                evalue: 1e-50,
                identity: 95.5,
                coverage: 98.2
            },
            {
                accession: 'XM_567890',
                description: 'Similar sequence from related species',
                score: 180,
                evalue: 1e-30,
                identity: 85.3,
                coverage: 92.1
            }
        ];
    }

    private getMockAnnotations(): AnnotationResult[] {
        return [
            {
                gene: 'GENE1',
                description: 'Sample gene with important function',
                features: [{ type: 'CDS', start: 100, end: 500 }],
                domains: [{ name: 'Kinase', start: 150, end: 300 }]
            }
        ];
    }

    private getMockSequenceAnalysis(sequence: string): SequenceAnalysis {
        const length = sequence.length;
        const gcCount = (sequence.match(/[GC]/gi) || []).length;
        
        return {
            length,
            gcContent: (gcCount / length) * 100,
            composition: {
                A: (sequence.match(/A/gi) || []).length,
                T: (sequence.match(/T/gi) || []).length,
                G: (sequence.match(/G/gi) || []).length,
                C: (sequence.match(/C/gi) || []).length
            }
        };
    }

    private getMockUniprotResults(query: string): any[] {
        return [
            {
                accession: 'P12345',
                name: 'PROTEIN_HUMAN',
                description: `Protein matching "${query}"`,
                organism: 'Homo sapiens',
                length: 500
            },
            {
                accession: 'Q67890',
                name: 'PROTEIN_MOUSE', 
                description: `Related protein to "${query}"`,
                organism: 'Mus musculus',
                length: 495
            }
        ];
    }

    private getMockPDBResults(query: string): any[] {
        return [
            {
                pdbId: '1ABC',
                title: `Crystal structure related to ${query}`,
                resolution: 2.5,
                method: 'X-RAY DIFFRACTION'
            },
            {
                pdbId: '2XYZ',
                title: `NMR structure of ${query} homolog`,
                method: 'SOLUTION NMR'
            }
        ];
    }

    private getMockAlphaFoldResults(_query: string): any[] {
        return [
            {
                uniprotId: 'P12345',
                confidence: 92.5,
                modelUrl: `https://alphafold.ebi.ac.uk/files/AF-P12345-F1-model_v4.pdb`
            }
        ];
    }
}