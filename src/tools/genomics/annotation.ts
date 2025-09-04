import { AnnotationOptions, AnnotationResults, ORF, Domain, Feature, FunctionPrediction } from './index';

/**
 * Gene annotation tool implementation
 */
export class AnnotationTool {
    constructor(private mcpProvider: any) {}

    /**
     * Perform comprehensive gene annotation
     */
    async annotate(sequence: string, options: AnnotationOptions = {}): Promise<AnnotationResults> {
        try {
            // Prepare parameters for MCP call
            const mcpParams = this.prepareMCPParams(sequence, options);
            
            // Call Biomni's annotation functions through MCP
            const results = await this.performAnnotationSteps(mcpParams);
            
            // Parse and format results
            return this.parseAnnotationResults(results, sequence);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Gene annotation failed: ${errorMessage}`);
        }
    }

    /**
     * Find Open Reading Frames (ORFs) in sequence
     */
    async findORFs(sequence: string, minLength: number = 100, geneticCode: number = 1): Promise<ORF[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                min_length: minLength,
                genetic_code: geneticCode,
                find_all_frames: true
            };

            const result = await this.mcpProvider.invoke('biomni.find_orfs', params);
            return this.parseORFs(result.orfs || []);
        } catch (error) {
            throw new Error(`ORF finding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Translate sequence in all reading frames
     */
    async translateSequence(sequence: string, geneticCode: number = 1): Promise<string[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                genetic_code: geneticCode,
                all_frames: true
            };

            const result = await this.mcpProvider.invoke('biomni.translate_sequence', params);
            return result.translations || [];
        } catch (error) {
            throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find protein domains using Pfam/InterPro
     */
    async findDomains(sequence: string, proteinSequence?: string): Promise<Domain[]> {
        try {
            // Use provided protein sequence or translate DNA sequence
            let protein = proteinSequence;
            if (!protein && this.isNucleotideSequence(sequence)) {
                const translations = await this.translateSequence(sequence);
                protein = translations[0]; // Use first reading frame
            }

            const params = {
                sequence: protein || sequence,
                databases: ['pfam', 'interpro'],
                evalue_threshold: 1e-3
            };

            const result = await this.mcpProvider.invoke('biomni.find_domains', params);
            return this.parseDomains(result.domains || []);
        } catch (error) {
            throw new Error(`Domain finding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Predict gene functions
     */
    async predictFunctions(sequence: string): Promise<FunctionPrediction[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                include_go: true,
                include_kegg: true,
                include_cog: true
            };

            const result = await this.mcpProvider.invoke('biomni.predict_function', params);
            return this.parseFunctionPredictions(result.predictions || []);
        } catch (error) {
            throw new Error(`Function prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Annotate genomic features (promoters, enhancers, etc.)
     */
    async annotateFeatures(sequence: string, organism?: string): Promise<Feature[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                organism: organism || 'human',
                find_promoters: true,
                find_enhancers: true,
                find_repeats: true,
                find_cpg_islands: true
            };

            const result = await this.mcpProvider.invoke('biomni.annotate_features', params);
            return this.parseFeatures(result.features || []);
        } catch (error) {
            throw new Error(`Feature annotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get genetic code tables
     */
    getGeneticCodes(): Record<number, string> {
        return {
            1: 'Standard',
            2: 'Vertebrate Mitochondrial',
            3: 'Yeast Mitochondrial',
            4: 'Mold/Protozoan/Coelenterate Mitochondrial',
            5: 'Invertebrate Mitochondrial',
            6: 'Ciliate/Dasycladacean/Hexamita Nuclear',
            9: 'Echinoderm/Flatworm Mitochondrial',
            10: 'Euplotid Nuclear',
            11: 'Bacterial/Archaeal/Plant Plastid',
            12: 'Alternative Yeast Nuclear',
            13: 'Ascidian Mitochondrial',
            14: 'Alternative Flatworm Mitochondrial',
            16: 'Chlorophycean Mitochondrial',
            21: 'Trematode Mitochondrial',
            22: 'Scenedesmus obliquus Mitochondrial',
            23: 'Thraustochytrium Mitochondrial'
        };
    }

    // Private helper methods

    /**
     * Prepare parameters for MCP annotation call
     */
    private prepareMCPParams(sequence: string, options: AnnotationOptions): any {
        return {
            sequence: sequence.replace(/\s/g, ''),
            find_orfs: options.findOrfs !== false,
            translate_orfs: options.translateOrfs !== false,
            find_domains: options.findDomains !== false,
            predict_function: options.predictFunction !== false,
            annotate_features: options.annotateFeatures !== false,
            organism: options.organism || 'human',
            genetic_code: options.geneticCode || 1
        };
    }

    /**
     * Perform annotation steps in parallel where possible
     */
    private async performAnnotationSteps(params: any): Promise<any> {
        const results: any = {};

        // Run annotations in parallel for better performance
        const promises: Promise<void>[] = [];

        if (params.find_orfs) {
            promises.push(
                this.mcpProvider.invoke('biomni.find_orfs', params)
                    .then((result: any) => { results.orfs = result; })
                    .catch((error: any) => { console.warn('ORF finding failed:', error); })
            );
        }

        if (params.find_domains) {
            promises.push(
                this.mcpProvider.invoke('biomni.find_domains', params)
                    .then((result: any) => { results.domains = result; })
                    .catch((error: any) => { console.warn('Domain finding failed:', error); })
            );
        }

        if (params.predict_function) {
            promises.push(
                this.mcpProvider.invoke('biomni.predict_function', params)
                    .then((result: any) => { results.functions = result; })
                    .catch((error: any) => { console.warn('Function prediction failed:', error); })
            );
        }

        if (params.annotate_features) {
            promises.push(
                this.mcpProvider.invoke('biomni.annotate_features', params)
                    .then((result: any) => { results.features = result; })
                    .catch((error: any) => { console.warn('Feature annotation failed:', error); })
            );
        }

        await Promise.all(promises);
        return results;
    }

    /**
     * Parse annotation results into structured format
     */
    private parseAnnotationResults(results: any, sequence: string): AnnotationResults {
        return {
            sequence,
            orfs: this.parseORFs(results.orfs?.orfs || []),
            domains: this.parseDomains(results.domains?.domains || []),
            features: this.parseFeatures(results.features?.features || []),
            predictions: this.parseFunctionPredictions(results.functions?.predictions || []),
            timestamp: new Date()
        };
    }

    /**
     * Parse ORF results
     */
    private parseORFs(orfsData: any[]): ORF[] {
        return orfsData.map((orf, index) => ({
            id: orf.id || `orf_${index + 1}`,
            start: parseInt(orf.start || orf.begin || '1'),
            end: parseInt(orf.end || orf.finish || '1'),
            strand: orf.strand || '+',
            frame: parseInt(orf.frame || '1'),
            length: parseInt(orf.length || '0'),
            sequence: orf.sequence || '',
            translation: orf.translation || orf.protein || ''
        }));
    }

    /**
     * Parse domain results
     */
    private parseDomains(domainsData: any[]): Domain[] {
        return domainsData.map((domain, index) => ({
            id: domain.id || domain.accession || `domain_${index + 1}`,
            name: domain.name || domain.description || 'Unknown domain',
            description: domain.description || domain.name || '',
            start: parseInt(domain.start || domain.from || '1'),
            end: parseInt(domain.end || domain.to || '1'),
            evalue: parseFloat(domain.evalue || domain.expect || '1'),
            score: parseFloat(domain.score || domain.bit_score || '0'),
            database: domain.database || 'pfam'
        }));
    }

    /**
     * Parse genomic features
     */
    private parseFeatures(featuresData: any[]): Feature[] {
        return featuresData.map((feature, index) => ({
            id: feature.id || `feature_${index + 1}`,
            type: this.normalizeFeatureType(feature.type || 'other'),
            start: parseInt(feature.start || feature.begin || '1'),
            end: parseInt(feature.end || feature.finish || '1'),
            strand: feature.strand || '.',
            name: feature.name || feature.id,
            description: feature.description || feature.note,
            attributes: feature.attributes || {}
        }));
    }

    /**
     * Parse function predictions
     */
    private parseFunctionPredictions(predictionsData: any[]): FunctionPrediction[] {
        return predictionsData.map((pred, index) => ({
            id: pred.id || `prediction_${index + 1}`,
            function: pred.function || pred.description || 'Unknown function',
            confidence: parseFloat(pred.confidence || pred.score || '0'),
            evidence: pred.evidence || pred.method || 'Computational prediction',
            database: pred.database || 'unknown'
        }));
    }

    /**
     * Check if sequence is nucleotide (DNA/RNA)
     */
    private isNucleotideSequence(sequence: string): boolean {
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        const nucleotideChars = (cleanSequence.match(/[ATCGUN]/g) || []).length;
        const totalChars = cleanSequence.length;
        return totalChars > 0 && (nucleotideChars / totalChars) > 0.8;
    }

    /**
     * Normalize feature types to standard terms
     */
    private normalizeFeatureType(type: string): 'gene' | 'CDS' | 'exon' | 'intron' | 'promoter' | 'enhancer' | 'other' {
        const normalized = type.toLowerCase();
        
        if (['gene', 'locus'].includes(normalized)) return 'gene';
        if (['cds', 'coding_sequence', 'coding'].includes(normalized)) return 'CDS';
        if (['exon'].includes(normalized)) return 'exon';
        if (['intron'].includes(normalized)) return 'intron';
        if (['promoter', 'tss', 'transcription_start'].includes(normalized)) return 'promoter';
        if (['enhancer', 'silencer'].includes(normalized)) return 'enhancer';
        
        return 'other';
    }

    /**
     * Get color coding for different feature types
     */
    getFeatureColor(featureType: string): string {
        const colors: Record<string, string> = {
            'gene': '#ff6b6b',
            'CDS': '#4ecdc4',
            'exon': '#45b7d1',
            'intron': '#96ceb4',
            'promoter': '#ffeaa7',
            'enhancer': '#dda0dd',
            'other': '#c0c0c0'
        };
        
        const color = colors[featureType];
        if (color !== undefined) {
            return color;
        }
        // Fallback color
        return '#c0c0c0';
    }

    /**
     * Generate annotation summary
     */
    generateSummary(results: AnnotationResults): string {
        const summary: string[] = [];
        
        summary.push(`Sequence length: ${results.sequence.length} bp`);
        
        if (results.orfs.length > 0) {
            summary.push(`ORFs found: ${results.orfs.length}`);
            const longestORF = Math.max(...results.orfs.map(orf => orf.length));
            summary.push(`Longest ORF: ${longestORF} bp`);
        }
        
        if (results.domains.length > 0) {
            summary.push(`Protein domains: ${results.domains.length}`);
            const uniqueDomains = new Set(results.domains.map(d => d.name)).size;
            summary.push(`Unique domains: ${uniqueDomains}`);
        }
        
        if (results.features.length > 0) {
            summary.push(`Genomic features: ${results.features.length}`);
            const featureTypes = [...new Set(results.features.map(f => f.type))];
            summary.push(`Feature types: ${featureTypes.join(', ')}`);
        }
        
        if (results.predictions.length > 0) {
            summary.push(`Function predictions: ${results.predictions.length}`);
        }
        
        return summary.join('\n');
    }
}