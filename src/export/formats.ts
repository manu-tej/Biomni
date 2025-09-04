import { BlastResults, AnnotationResults, SequenceAnalysis } from '../tools/genomics/index';

/**
 * Export utilities for various biological data formats
 */
export class ExportFormats {
    
    /**
     * Export BLAST results to CSV format
     */
    static exportBlastToCSV(results: BlastResults): string {
        const headers = [
            'Query_ID',
            'Hit_ID',
            'Description',
            'Accession',
            'E_value',
            'Bit_Score',
            'Score',
            'Identity',
            'Positive',
            'Gaps',
            'Query_Start',
            'Query_End',
            'Subject_Start',
            'Subject_End',
            'Query_Length',
            'Subject_Length',
            'Alignment_Length',
            'Identity_Percent',
            'Database',
            'Program'
        ];

        const rows = results.hits.map((hit, index) => {
            const queryLength = results.querySequence.length;
            const alignmentLength = Math.abs(hit.queryEnd - hit.queryStart) + 1;
            const identityPercent = alignmentLength > 0 ? (hit.identity / alignmentLength * 100).toFixed(2) : '0';

            return [
                `Query_${index + 1}`,
                hit.id,
                `"${hit.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
                hit.accession,
                hit.evalue,
                hit.bitScore,
                hit.score,
                hit.identity,
                hit.positive,
                hit.gaps,
                hit.queryStart,
                hit.queryEnd,
                hit.subjectStart,
                hit.subjectEnd,
                queryLength,
                hit.length,
                alignmentLength,
                identityPercent,
                results.database,
                results.program
            ];
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Export BLAST results to FASTA format
     */
    static exportBlastToFASTA(results: BlastResults): string {
        const sequences: string[] = [];
        
        // Add query sequence
        sequences.push(`>Query_${results.program}_${results.database}`);
        sequences.push(this.formatSequenceLines(results.querySequence));
        
        // Add hit sequences
        results.hits.forEach((hit, index) => {
            if (hit.subjectSequence) {
                const header = `>Hit_${index + 1}_${hit.accession}_E${hit.evalue}_${hit.description.substring(0, 50)}`;
                sequences.push(header);
                sequences.push(this.formatSequenceLines(hit.subjectSequence));
            }
        });
        
        return sequences.join('\n');
    }

    /**
     * Export annotation results to CSV format
     */
    static exportAnnotationToCSV(results: AnnotationResults): string {
        const sections: string[] = [];
        
        // ORFs section
        if (results.orfs.length > 0) {
            sections.push('# Open Reading Frames');
            const orfHeaders = ['ORF_ID', 'Start', 'End', 'Strand', 'Frame', 'Length', 'Sequence', 'Translation'];
            sections.push(orfHeaders.join(','));
            
            results.orfs.forEach(orf => {
                const row = [
                    orf.id,
                    orf.start,
                    orf.end,
                    orf.strand,
                    orf.frame,
                    orf.length,
                    `"${orf.sequence}"`,
                    `"${orf.translation}"`
                ];
                sections.push(row.join(','));
            });
            sections.push('');
        }
        
        // Domains section
        if (results.domains.length > 0) {
            sections.push('# Protein Domains');
            const domainHeaders = ['Domain_ID', 'Name', 'Description', 'Start', 'End', 'E_value', 'Score', 'Database'];
            sections.push(domainHeaders.join(','));
            
            results.domains.forEach(domain => {
                const row = [
                    domain.id,
                    `"${domain.name}"`,
                    `"${domain.description}"`,
                    domain.start,
                    domain.end,
                    domain.evalue,
                    domain.score,
                    domain.database
                ];
                sections.push(row.join(','));
            });
            sections.push('');
        }
        
        // Features section
        if (results.features.length > 0) {
            sections.push('# Genomic Features');
            const featureHeaders = ['Feature_ID', 'Type', 'Start', 'End', 'Strand', 'Name', 'Description'];
            sections.push(featureHeaders.join(','));
            
            results.features.forEach(feature => {
                const row = [
                    feature.id,
                    feature.type,
                    feature.start,
                    feature.end,
                    feature.strand,
                    `"${feature.name || ''}"`,
                    `"${feature.description || ''}"`
                ];
                sections.push(row.join(','));
            });
            sections.push('');
        }
        
        // Predictions section
        if (results.predictions.length > 0) {
            sections.push('# Function Predictions');
            const predictionHeaders = ['Prediction_ID', 'Function', 'Confidence', 'Evidence', 'Database'];
            sections.push(predictionHeaders.join(','));
            
            results.predictions.forEach(prediction => {
                const row = [
                    prediction.id,
                    `"${prediction.function}"`,
                    prediction.confidence,
                    `"${prediction.evidence}"`,
                    prediction.database
                ];
                sections.push(row.join(','));
            });
        }
        
        return sections.join('\n');
    }

    /**
     * Export annotation results to FASTA format
     */
    static exportAnnotationToFASTA(results: AnnotationResults): string {
        const sequences: string[] = [];
        
        // Add original sequence
        sequences.push(`>Original_Sequence_${results.timestamp.toISOString().slice(0, 19)}`);
        sequences.push(this.formatSequenceLines(results.sequence));
        
        // Add ORF sequences
        results.orfs.forEach(orf => {
            // DNA sequence
            sequences.push(`>${orf.id}_DNA_${orf.start}-${orf.end}_frame${orf.frame}_${orf.strand}`);
            sequences.push(this.formatSequenceLines(orf.sequence));
            
            // Protein sequence
            if (orf.translation) {
                sequences.push(`>${orf.id}_protein_${orf.length}bp`);
                sequences.push(this.formatSequenceLines(orf.translation));
            }
        });
        
        return sequences.join('\n');
    }

    /**
     * Export annotation results to GenBank format
     */
    static exportAnnotationToGenBank(results: AnnotationResults): string {
        const lines: string[] = [];
        const date = new Date().toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        }).toUpperCase().replace(/,/g, '');

        // Header
        lines.push(`LOCUS       BIOMNI_ANNOTATION    ${results.sequence.length.toString().padStart(8)} bp    DNA     linear   UNC ${date}`);
        lines.push('DEFINITION  Sequence annotation by Biomni VSCode Extension');
        lines.push('ACCESSION   BIOMNI_ANNOTATION');
        lines.push('VERSION     BIOMNI_ANNOTATION.1');
        lines.push('KEYWORDS    .');
        lines.push('SOURCE      .');
        lines.push('  ORGANISM  Unknown');
        lines.push('            Unclassified.');
        
        // Features
        lines.push('FEATURES             Location/Qualifiers');
        lines.push(`     source          1..${results.sequence.length}`);
        lines.push('                     /organism="Unknown"');
        lines.push('                     /mol_type="genomic DNA"');
        
        // Add ORF features
        results.orfs.forEach(orf => {
            const location = orf.strand === '+' 
                ? `${orf.start}..${orf.end}` 
                : `complement(${orf.start}..${orf.end})`;
            
            lines.push(`     CDS             ${location}`);
            lines.push(`                     /gene="${orf.id}"`);
            lines.push(`                     /product="predicted protein"`);
            lines.push(`                     /note="ORF found by Biomni, frame ${orf.frame}"`);
            
            if (orf.translation) {
                // Split translation into lines of max 58 characters (GenBank standard)
                const translation = orf.translation;
                lines.push(`                     /translation="${translation.substring(0, 58)}`);
                for (let i = 58; i < translation.length; i += 58) {
                    const chunk = translation.substring(i, i + 58);
                    lines.push(`                     ${chunk}${i + 58 >= translation.length ? '"' : ''}`);
                }
                if (translation.length <= 58) {
                    lines[lines.length - 1] += '"';
                }
            }
        });
        
        // Add other features
        results.features.forEach(feature => {
            const location = feature.strand === '+' 
                ? `${feature.start}..${feature.end}` 
                : feature.strand === '-'
                ? `complement(${feature.start}..${feature.end})`
                : `${feature.start}..${feature.end}`;
            
            const featureType = feature.type === 'CDS' ? 'CDS' : 'misc_feature';
            lines.push(`     ${featureType.padEnd(15)} ${location}`);
            
            if (feature.name) {
                lines.push(`                     /note="${feature.name}"`);
            }
            if (feature.description) {
                lines.push(`                     /product="${feature.description}"`);
            }
        });
        
        // Add domains as misc_features
        results.domains.forEach(domain => {
            lines.push(`     misc_feature    ${domain.start}..${domain.end}`);
            lines.push(`                     /note="protein domain: ${domain.name}"`);
            lines.push(`                     /db_xref="${domain.database}:${domain.id}"`);
            if (domain.evalue) {
                lines.push(`                     /inference="protein motif:${domain.database}:${domain.evalue}"`);
            }
        });
        
        // Origin (sequence)
        lines.push('ORIGIN      ');
        const sequence = results.sequence.toLowerCase();
        for (let i = 0; i < sequence.length; i += 60) {
            const seqLine = sequence.substring(i, i + 60);
            const lineNum = (i + 1).toString().padStart(9);
            const formattedSeq = seqLine.match(/.{1,10}/g)?.join(' ') || seqLine;
            lines.push(`${lineNum} ${formattedSeq}`);
        }
        lines.push('//');
        
        return lines.join('\n');
    }

    /**
     * Export analysis results to CSV format
     */
    static exportAnalysisToCSV(results: SequenceAnalysis): string {
        const sections: string[] = [];
        
        // Basic statistics
        sections.push('# Sequence Statistics');
        sections.push('Property,Value');
        sections.push(`Sequence_Length,${results.length}`);
        sections.push(`GC_Content,${results.gcContent.toFixed(2)}`);
        sections.push(`A_Count,${results.composition.A}`);
        sections.push(`T_Count,${results.composition.T}`);
        sections.push(`G_Count,${results.composition.G}`);
        sections.push(`C_Count,${results.composition.C}`);
        sections.push(`N_Count,${results.composition.N}`);
        sections.push(`Other_Count,${results.composition.other}`);
        sections.push(`Melting_Temperature,${results.melting.tm.toFixed(2)}`);
        sections.push(`Molecular_Weight,${results.molecular.molecularWeight.toFixed(2)}`);
        sections.push(`Extinction_Coefficient,${results.molecular.extinction}`);
        sections.push(`Absorbance_280nm,${results.molecular.absorbance}`);
        sections.push('');
        
        // Restriction sites
        if (results.restrictions.length > 0) {
            sections.push('# Restriction Sites');
            sections.push('Enzyme,Recognition_Site,Position,Overhang,Cut_Type');
            
            results.restrictions.forEach(site => {
                sections.push(`${site.enzyme},${site.site},${site.position},${site.overhang},${site.blunt ? 'Blunt' : 'Sticky'}`);
            });
            sections.push('');
        }
        
        // Repeat regions
        if (results.repeats.length > 0) {
            sections.push('# Repeat Regions');
            sections.push('Type,Start,End,Sequence,Copies');
            
            results.repeats.forEach(repeat => {
                sections.push(`${repeat.type},${repeat.start},${repeat.end},"${repeat.sequence}",${repeat.copies}`);
            });
        }
        
        return sections.join('\n');
    }

    /**
     * Export any result type to JSON format
     */
    static exportToJSON(results: BlastResults | AnnotationResults | SequenceAnalysis): string {
        return JSON.stringify(results, null, 2);
    }

    /**
     * Export results summary for quick reference
     */
    static exportSummary(results: BlastResults | AnnotationResults | SequenceAnalysis): string {
        const lines: string[] = [];
        lines.push('BIOMNI ANALYSIS SUMMARY');
        lines.push('======================');
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push('');
        
        if ('hits' in results) {
            // BLAST results summary
            lines.push('BLAST SEARCH RESULTS');
            lines.push(`Program: ${results.program}`);
            lines.push(`Database: ${results.database}`);
            lines.push(`Query Length: ${results.querySequence.length} bp`);
            lines.push(`Total Hits: ${results.hits.length}`);
            
            if (results.hits.length > 0) {
                lines.push('');
                lines.push('TOP HITS:');
                results.hits.slice(0, 10).forEach((hit, index) => {
                    lines.push(`${index + 1}. ${hit.description} (E-value: ${hit.evalue})`);
                });
            }
        } else if ('orfs' in results) {
            // Annotation results summary
            lines.push('GENE ANNOTATION RESULTS');
            lines.push(`Sequence Length: ${results.sequence.length} bp`);
            lines.push(`ORFs Found: ${results.orfs.length}`);
            lines.push(`Protein Domains: ${results.domains.length}`);
            lines.push(`Genomic Features: ${results.features.length}`);
            lines.push(`Function Predictions: ${results.predictions.length}`);
            
            if (results.orfs.length > 0) {
                lines.push('');
                lines.push('LONGEST ORFS:');
                const sortedOrfs = [...results.orfs].sort((a, b) => b.length - a.length);
                sortedOrfs.slice(0, 5).forEach((orf, index) => {
                    lines.push(`${index + 1}. ${orf.id}: ${orf.length} bp (${orf.start}-${orf.end}, ${orf.strand})`);
                });
            }
        } else if ('composition' in results) {
            // Analysis results summary
            lines.push('SEQUENCE ANALYSIS RESULTS');
            lines.push(`Length: ${results.length} bp`);
            lines.push(`GC Content: ${results.gcContent.toFixed(2)}%`);
            lines.push(`Composition: A=${results.composition.A}, T=${results.composition.T}, G=${results.composition.G}, C=${results.composition.C}`);
            lines.push(`Melting Temperature: ${results.melting.tm.toFixed(2)}°C`);
            lines.push(`Molecular Weight: ${(results.molecular.molecularWeight / 1000).toFixed(2)} kDa`);
            
            if (results.restrictions.length > 0) {
                lines.push(`Restriction Sites: ${results.restrictions.length}`);
                lines.push('');
                lines.push('RESTRICTION ENZYMES:');
                results.restrictions.forEach((site, index) => {
                    if (index < 10) { // Show only first 10
                        lines.push(`- ${site.enzyme} at position ${site.position} (${site.site})`);
                    }
                });
            }
        }
        
        return lines.join('\n');
    }

    /**
     * Format sequence with line breaks for better readability
     */
    private static formatSequenceLines(sequence: string, lineLength: number = 60): string {
        const lines: string[] = [];
        for (let i = 0; i < sequence.length; i += lineLength) {
            lines.push(sequence.substring(i, i + lineLength));
        }
        return lines.join('\n');
    }


    /**
     * Get appropriate file extension for format
     */
    static getFileExtension(format: 'csv' | 'json' | 'fasta' | 'genbank' | 'summary'): string {
        const extensions: Record<string, string> = {
            'csv': 'csv',
            'json': 'json',
            'fasta': 'fasta',
            'genbank': 'gb',
            'summary': 'txt'
        };
        return extensions[format] || 'txt';
    }

    /**
     * Get MIME type for format
     */
    static getMimeType(format: 'csv' | 'json' | 'fasta' | 'genbank' | 'summary'): string {
        const mimeTypes: Record<string, string> = {
            'csv': 'text/csv',
            'json': 'application/json',
            'fasta': 'text/plain',
            'genbank': 'text/plain',
            'summary': 'text/plain'
        };
        return mimeTypes[format] || 'text/plain';
    }
}