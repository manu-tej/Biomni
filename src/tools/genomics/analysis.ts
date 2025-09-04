import { 
    SequenceAnalysis, 
    NucleotideComposition, 
    MeltingTemperature, 
    MolecularProperties, 
    RestrictionSite, 
    RepeatRegion 
} from './index';

/**
 * Sequence analysis tool implementation
 */
export class SequenceAnalysisTool {
    constructor(private mcpProvider: any) {}

    /**
     * Perform comprehensive sequence analysis
     */
    async analyze(sequence: string): Promise<SequenceAnalysis> {
        try {
            const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
            
            // Prepare parameters for MCP call
            const params = {
                sequence: cleanSequence,
                include_composition: true,
                include_gc_content: true,
                include_melting_temp: true,
                include_molecular_props: true,
                include_restriction_sites: true,
                include_repeats: true
            };
            
            // Call Biomni's analysis functions
            const results = await this.performAnalysisSteps(params);
            
            // Parse and format results
            return this.parseAnalysisResults(results, cleanSequence);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Sequence analysis failed: ${errorMessage}`);
        }
    }

    /**
     * Calculate basic sequence composition
     */
    async calculateComposition(sequence: string): Promise<NucleotideComposition> {
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        const composition: NucleotideComposition = {
            A: 0, T: 0, G: 0, C: 0, N: 0, other: 0
        };
        
        for (const nucleotide of cleanSequence) {
            if (nucleotide in composition) {
                (composition as any)[nucleotide]++;
            } else if (nucleotide === 'U') {
                composition.T++; // Count U as T for RNA sequences
            } else {
                composition.other++;
            }
        }
        
        return composition;
    }

    /**
     * Calculate GC content percentage
     */
    calculateGCContent(sequence: string): number {
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        const gcCount = (cleanSequence.match(/[GC]/g) || []).length;
        return cleanSequence.length > 0 ? (gcCount / cleanSequence.length) * 100 : 0;
    }

    /**
     * Find restriction enzyme sites
     */
    async findRestrictionSites(sequence: string, enzymes?: string[]): Promise<RestrictionSite[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                enzymes: enzymes || ['EcoRI', 'BamHI', 'HindIII', 'XbaI', 'SacI', 'KpnI', 'SmaI', 'XhoI'],
                min_site_length: 4
            };

            const result = await this.mcpProvider.invoke('biomni.find_restriction_sites', params);
            return this.parseRestrictionSites(result.sites || []);
        } catch (error) {
            // Fallback to basic restriction site finding
            return this.findBasicRestrictionSites(sequence);
        }
    }

    /**
     * Find repeat regions in sequence
     */
    async findRepeats(sequence: string, minLength: number = 10): Promise<RepeatRegion[]> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                min_length: minLength,
                find_tandem: true,
                find_inverted: true,
                find_direct: true
            };

            const result = await this.mcpProvider.invoke('biomni.find_repeats', params);
            return this.parseRepeats(result.repeats || []);
        } catch (error) {
            // Fallback to basic repeat finding
            return this.findBasicRepeats(sequence, minLength);
        }
    }

    /**
     * Calculate melting temperature
     */
    async calculateMeltingTemperature(sequence: string, saltConc: number = 0.05): Promise<MeltingTemperature> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                salt_concentration: saltConc,
                method: 'nearest_neighbor'
            };

            const result = await this.mcpProvider.invoke('biomni.calculate_tm', params);
            return {
                tm: parseFloat(result.tm || '0'),
                method: result.method || 'nearest_neighbor',
                saltConcentration: saltConc
            };
        } catch (error) {
            // Fallback to basic Tm calculation
            return this.calculateBasicTm(sequence, saltConc);
        }
    }

    /**
     * Calculate molecular properties
     */
    async calculateMolecularProperties(sequence: string): Promise<MolecularProperties> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                sequence_type: this.isProteinSequence(sequence) ? 'protein' : 'dna'
            };

            const result = await this.mcpProvider.invoke('biomni.molecular_properties', params);
            return {
                molecularWeight: parseFloat(result.molecular_weight || '0'),
                extinction: parseFloat(result.extinction_coefficient || '0'),
                absorbance: parseFloat(result.absorbance_280 || '0')
            };
        } catch (error) {
            // Fallback to basic molecular weight calculation
            return this.calculateBasicMolecularProps(sequence);
        }
    }

    /**
     * Get codon usage table
     */
    async getCodonUsage(sequence: string, geneticCode: number = 1): Promise<Record<string, number>> {
        try {
            const params = {
                sequence: sequence.replace(/\s/g, ''),
                genetic_code: geneticCode,
                reading_frame: 1
            };

            const result = await this.mcpProvider.invoke('biomni.codon_usage', params);
            return result.codon_usage || {};
        } catch (error) {
            return this.calculateBasicCodonUsage(sequence);
        }
    }

    /**
     * Translate DNA sequence to protein
     */
    translateSequence(sequence: string, frame: number = 1, _geneticCode: number = 1): string {
        const codonTable = this.getGeneticCodeTable();
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        
        // Adjust for reading frame
        const startPos = (frame - 1) % 3;
        const codingSequence = cleanSequence.slice(startPos);
        
        let protein = '';
        for (let i = 0; i < codingSequence.length - 2; i += 3) {
            const codon = codingSequence.substr(i, 3);
            protein += codonTable[codon] || 'X';
        }
        
        return protein;
    }

    /**
     * Get reverse complement of DNA sequence
     */
    reverseComplement(sequence: string): string {
        const complement: Record<string, string> = {
            'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
            'U': 'A', 'N': 'N', '-': '-'
        };
        
        return sequence
            .replace(/\s/g, '')
            .toUpperCase()
            .split('')
            .reverse()
            .map(base => complement[base] || base)
            .join('');
    }

    // Private helper methods

    /**
     * Perform analysis steps in parallel where possible
     */
    private async performAnalysisSteps(params: any): Promise<any> {
        const results: any = {};

        // Run analyses that don't depend on each other in parallel
        const promises: Promise<void>[] = [];

        promises.push(
            this.mcpProvider.invoke('biomni.sequence_composition', params)
                .then((result: any) => { results.composition = result; })
                .catch((error: any) => { console.warn('Composition analysis failed:', error); })
        );

        promises.push(
            this.mcpProvider.invoke('biomni.find_restriction_sites', params)
                .then((result: any) => { results.restriction = result; })
                .catch((error: any) => { console.warn('Restriction site analysis failed:', error); })
        );

        promises.push(
            this.mcpProvider.invoke('biomni.find_repeats', params)
                .then((result: any) => { results.repeats = result; })
                .catch((error: any) => { console.warn('Repeat analysis failed:', error); })
        );

        promises.push(
            this.mcpProvider.invoke('biomni.calculate_tm', params)
                .then((result: any) => { results.melting = result; })
                .catch((error: any) => { console.warn('Melting temperature calculation failed:', error); })
        );

        promises.push(
            this.mcpProvider.invoke('biomni.molecular_properties', params)
                .then((result: any) => { results.molecular = result; })
                .catch((error: any) => { console.warn('Molecular properties calculation failed:', error); })
        );

        await Promise.all(promises);
        return results;
    }

    /**
     * Parse analysis results into structured format
     */
    private parseAnalysisResults(results: any, sequence: string): SequenceAnalysis {
        const composition = this.parseComposition(results.composition) || this.calculateCompositionLocal(sequence);
        
        return {
            sequence,
            length: sequence.length,
            composition,
            gcContent: this.calculateGCContent(sequence),
            melting: this.parseMeltingTemp(results.melting) || this.calculateBasicTm(sequence),
            molecular: this.parseMolecularProps(results.molecular) || this.calculateBasicMolecularProps(sequence),
            restrictions: this.parseRestrictionSites(results.restriction?.sites || []),
            repeats: this.parseRepeats(results.repeats?.repeats || []),
            timestamp: new Date()
        };
    }

    /**
     * Parse composition results
     */
    private parseComposition(compData: any): NucleotideComposition | null {
        if (!compData) return null;
        
        return {
            A: parseInt(compData.A || compData.adenine || '0'),
            T: parseInt(compData.T || compData.thymine || '0'),
            G: parseInt(compData.G || compData.guanine || '0'),
            C: parseInt(compData.C || compData.cytosine || '0'),
            N: parseInt(compData.N || '0'),
            other: parseInt(compData.other || '0')
        };
    }

    /**
     * Calculate composition locally
     */
    private calculateCompositionLocal(sequence: string): NucleotideComposition {
        const composition: NucleotideComposition = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 };
        
        for (const nucleotide of sequence) {
            if (nucleotide in composition) {
                (composition as any)[nucleotide]++;
            } else if (nucleotide === 'U') {
                composition.T++;
            } else {
                composition.other++;
            }
        }
        
        return composition;
    }

    /**
     * Parse melting temperature results
     */
    private parseMeltingTemp(meltData: any): MeltingTemperature | null {
        if (!meltData) return null;
        
        return {
            tm: parseFloat(meltData.tm || '0'),
            method: meltData.method || 'basic',
            saltConcentration: parseFloat(meltData.salt_concentration || '0.05')
        };
    }

    /**
     * Parse molecular properties results
     */
    private parseMolecularProps(molData: any): MolecularProperties | null {
        if (!molData) return null;
        
        return {
            molecularWeight: parseFloat(molData.molecular_weight || '0'),
            extinction: parseFloat(molData.extinction_coefficient || '0'),
            absorbance: parseFloat(molData.absorbance_280 || '0')
        };
    }

    /**
     * Parse restriction sites
     */
    private parseRestrictionSites(sitesData: any[]): RestrictionSite[] {
        return sitesData.map((site, index) => ({
            enzyme: site.enzyme || `enzyme_${index + 1}`,
            site: site.site || site.recognition_site || '',
            position: parseInt(site.position || site.start || '0'),
            overhang: site.overhang || '',
            blunt: Boolean(site.blunt || site.overhang === '')
        }));
    }

    /**
     * Parse repeat regions
     */
    private parseRepeats(repeatsData: any[]): RepeatRegion[] {
        return repeatsData.map((repeat) => ({
            type: this.normalizeRepeatType(repeat.type || 'tandem'),
            start: parseInt(repeat.start || '0'),
            end: parseInt(repeat.end || '0'),
            sequence: repeat.sequence || '',
            copies: parseInt(repeat.copies || repeat.count || '1')
        }));
    }

    /**
     * Basic restriction site finding fallback
     */
    private findBasicRestrictionSites(sequence: string): RestrictionSite[] {
        const sites: RestrictionSite[] = [];
        const enzymes = {
            'EcoRI': 'GAATTC',
            'BamHI': 'GGATCC',
            'HindIII': 'AAGCTT',
            'XbaI': 'TCTAGA',
            'SacI': 'GAGCTC',
            'KpnI': 'GGTACC'
        };

        for (const [enzyme, recognition] of Object.entries(enzymes)) {
            let position = 0;
            while ((position = sequence.indexOf(recognition, position)) !== -1) {
                sites.push({
                    enzyme,
                    site: recognition,
                    position: position + 1, // 1-based positioning
                    overhang: '',
                    blunt: false
                });
                position++;
            }
        }

        return sites;
    }

    /**
     * Basic repeat finding fallback
     */
    private findBasicRepeats(sequence: string, minLength: number): RepeatRegion[] {
        const repeats: RepeatRegion[] = [];
        
        // Simple tandem repeat detection
        for (let len = minLength; len <= Math.min(50, sequence.length / 2); len++) {
            for (let i = 0; i <= sequence.length - len * 2; i++) {
                const motif = sequence.substr(i, len);
                let copies = 1;
                let pos = i + len;
                
                while (pos + len <= sequence.length && sequence.substr(pos, len) === motif) {
                    copies++;
                    pos += len;
                }
                
                if (copies >= 2) {
                    repeats.push({
                        type: 'tandem',
                        start: i + 1,
                        end: pos,
                        sequence: motif,
                        copies
                    });
                }
            }
        }
        
        return repeats;
    }

    /**
     * Basic Tm calculation fallback
     */
    private calculateBasicTm(sequence: string, saltConc: number = 0.05): MeltingTemperature {
        const gcCount = (sequence.match(/[GC]/g) || []).length;
        const atCount = sequence.length - gcCount;
        
        // Basic formula: Tm = 4*(G+C) + 2*(A+T)
        const basicTm = 4 * gcCount + 2 * atCount;
        
        return {
            tm: basicTm,
            method: 'basic',
            saltConcentration: saltConc
        };
    }

    /**
     * Basic molecular properties calculation fallback
     */
    private calculateBasicMolecularProps(sequence: string): MolecularProperties {
        const isProtein = this.isProteinSequence(sequence);
        
        if (isProtein) {
            // Basic protein molecular weight calculation
            const avgMW = 110; // Average amino acid molecular weight
            return {
                molecularWeight: sequence.length * avgMW,
                extinction: 0,
                absorbance: 0
            };
        } else {
            // Basic DNA molecular weight calculation
            const avgMW = 650; // Average nucleotide molecular weight
            return {
                molecularWeight: sequence.length * avgMW,
                extinction: 0,
                absorbance: 0
            };
        }
    }

    /**
     * Basic codon usage calculation
     */
    private calculateBasicCodonUsage(sequence: string): Record<string, number> {
        const codonUsage: Record<string, number> = {};
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        
        for (let i = 0; i < cleanSequence.length - 2; i += 3) {
            const codon = cleanSequence.substr(i, 3);
            if (codon.length === 3) {
                codonUsage[codon] = (codonUsage[codon] || 0) + 1;
            }
        }
        
        return codonUsage;
    }

    /**
     * Check if sequence is protein
     */
    private isProteinSequence(sequence: string): boolean {
        const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
        const proteinChars = (cleanSequence.match(/[ARNDCEQGHILKMFPSTWYV]/g) || []).length;
        const totalChars = cleanSequence.length;
        return totalChars > 0 && (proteinChars / totalChars) > 0.7;
    }

    /**
     * Normalize repeat type
     */
    private normalizeRepeatType(type: string): 'tandem' | 'inverted' | 'direct' {
        const normalized = type.toLowerCase();
        if (['inverted', 'palindromic'].includes(normalized)) return 'inverted';
        if (['direct'].includes(normalized)) return 'direct';
        return 'tandem';
    }

    /**
     * Get genetic code table
     */
    private getGeneticCodeTable(): Record<string, string> {
        // Standard genetic code
        return {
            'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
            'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
            'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
            'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
            'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
            'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
            'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
            'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
            'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
            'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
            'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
            'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
            'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
            'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
            'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
            'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
        };
    }
}