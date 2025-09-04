import * as assert from 'assert';
import { ExportFormats } from '../../src/export/formats';
import { BlastResults, AnnotationResults, SequenceAnalysis } from '../../src/tools/genomics/index';

/**
 * Test suite for export formats utility
 */
suite('Export Formats Tests', () => {
    
    // Sample data for testing
    const mockBlastResults: BlastResults = {
        querySequence: 'MKRISTTITTIITIIGNCGADS',
        database: 'swissprot',
        program: 'blastp',
        hits: [
            {
                id: 'sp|P00698|LYSC_CHICK',
                description: 'Lysozyme C (EC 3.2.1.17) - Gallus gallus',
                accession: 'P00698',
                length: 147,
                evalue: 1.2e-88,
                bitScore: 258.4,
                score: 658,
                identity: 129,
                positive: 129,
                gaps: 0,
                queryStart: 1,
                queryEnd: 22,
                subjectStart: 19,
                subjectEnd: 40,
                querySequence: 'MKRISTTITTIITIIGNCGADS',
                subjectSequence: 'MKRISTTITTIITIIGNCGADS',
                alignmentString: '|||||||||||||||||||||'
            },
            {
                id: 'sp|P00699|LYSC_HUMAN',
                description: 'Lysozyme C - Homo sapiens',
                accession: 'P00699',
                length: 148,
                evalue: 2.5e-85,
                bitScore: 245.1,
                score: 623,
                identity: 125,
                positive: 127,
                gaps: 1,
                queryStart: 1,
                queryEnd: 22,
                subjectStart: 20,
                subjectEnd: 41,
                querySequence: 'MKRISTTITTIITIIGNCGADS',
                subjectSequence: 'MKRISTTITTIITIIGNCGADS',
                alignmentString: '|||||||||||||||||||||'
            }
        ],
        statistics: {
            searchSpace: 55080,
            effectiveLength: 22,
            kappa: 0.041,
            lambda: 0.267,
            entropy: 0.14
        },
        parameters: {
            sequence: 'MKRISTTITTIITIIGNCGADS',
            database: 'swissprot',
            program: 'blastp',
            evalue: 10.0,
            maxTargetSeqs: 100
        },
        timestamp: new Date('2023-01-01T12:00:00Z')
    };

    const mockAnnotationResults: AnnotationResults = {
        sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGATAAGGATCC',
        orfs: [
            {
                id: 'orf1',
                start: 1,
                end: 66,
                strand: '+',
                frame: 1,
                length: 66,
                sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
                translation: 'MKRISTTITTIITIIGNCGADS'
            },
            {
                id: 'orf2',
                start: 67,
                end: 75,
                strand: '-',
                frame: 2,
                length: 9,
                sequence: 'GGATCCTAG',
                translation: 'GSS'
            }
        ],
        domains: [
            {
                id: 'PF00001',
                name: 'ATP_synthase',
                description: 'ATP synthase alpha/beta family domain',
                start: 10,
                end: 50,
                evalue: 1.2e-45,
                score: 150.5,
                database: 'pfam'
            }
        ],
        features: [
            {
                id: 'promoter1',
                type: 'promoter',
                start: 1,
                end: 25,
                strand: '+',
                name: 'TATA_box',
                description: 'TATA box promoter element',
                attributes: { strength: 'strong' }
            }
        ],
        predictions: [
            {
                id: 'pred1',
                function: 'ATP synthesis coupled proton transport',
                confidence: 0.95,
                evidence: 'Homology to known ATP synthases (UniProt:P12345)',
                database: 'GO'
            }
        ],
        timestamp: new Date('2023-01-01T12:00:00Z')
    };

    const mockAnalysisResults: SequenceAnalysis = {
        sequence: 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG',
        length: 100,
        composition: { A: 25, T: 25, G: 25, C: 25, N: 0, other: 0 },
        gcContent: 50.0,
        melting: { tm: 72.5, method: 'nearest_neighbor', saltConcentration: 0.05 },
        molecular: { molecularWeight: 65000.5, extinction: 165000, absorbance: 1.2 },
        restrictions: [
            {
                enzyme: 'EcoRI',
                site: 'GAATTC',
                position: 45,
                overhang: 'AATT',
                blunt: false
            },
            {
                enzyme: 'BamHI',
                site: 'GGATCC',
                position: 78,
                overhang: 'GATC',
                blunt: false
            }
        ],
        repeats: [
            {
                type: 'tandem',
                start: 10,
                end: 40,
                sequence: 'ATCGATCG',
                copies: 4
            }
        ],
        timestamp: new Date('2023-01-01T12:00:00Z')
    };

    suite('BLAST Results Export Tests', () => {
        test('should export BLAST results to CSV format correctly', () => {
            const csvOutput = ExportFormats.exportBlastToCSV(mockBlastResults);
            
            // Check headers
            assert.ok(csvOutput.includes('Query_ID,Hit_ID,Description'));
            assert.ok(csvOutput.includes('E_value,Bit_Score,Score'));
            assert.ok(csvOutput.includes('Identity,Positive,Gaps'));
            
            // Check data rows
            assert.ok(csvOutput.includes('sp|P00698|LYSC_CHICK'));
            assert.ok(csvOutput.includes('sp|P00699|LYSC_HUMAN'));
            assert.ok(csvOutput.includes('1.2e-88'));
            assert.ok(csvOutput.includes('258.4'));
            assert.ok(csvOutput.includes('swissprot'));
            assert.ok(csvOutput.includes('blastp'));
            
            // Check that descriptions are properly quoted
            assert.ok(csvOutput.includes('"Lysozyme C (EC 3.2.1.17) - Gallus gallus"'));
            
            const lines = csvOutput.split('\n');
            assert.strictEqual(lines.length, 3); // Header + 2 data rows
        });

        test('should export BLAST results to FASTA format correctly', () => {
            const fastaOutput = ExportFormats.exportBlastToFASTA(mockBlastResults);
            
            // Check query sequence
            assert.ok(fastaOutput.includes('>Query_blastp_swissprot'));
            assert.ok(fastaOutput.includes('MKRISTTITTIITIIGNCGADS'));
            
            // Check hit sequences
            assert.ok(fastaOutput.includes('>Hit_1_P00698_E1.2e-88_Lysozyme C (EC 3.2.1.17) - Gallus gallus'));
            assert.ok(fastaOutput.includes('>Hit_2_P00699_E2.5e-85_Lysozyme C - Homo sapiens'));
            
            const lines = fastaOutput.split('\n');
            const headerLines = lines.filter(line => line.startsWith('>'));
            assert.strictEqual(headerLines.length, 3); // Query + 2 hits
        });

        test('should handle BLAST results with no hits', () => {
            const emptyBlastResults: BlastResults = {
                ...mockBlastResults,
                hits: []
            };
            
            const csvOutput = ExportFormats.exportBlastToCSV(emptyBlastResults);
            const fastaOutput = ExportFormats.exportBlastToFASTA(emptyBlastResults);
            
            // CSV should still have headers
            assert.ok(csvOutput.includes('Query_ID,Hit_ID'));
            const csvLines = csvOutput.split('\n');
            assert.strictEqual(csvLines.length, 1); // Only header
            
            // FASTA should still have query
            assert.ok(fastaOutput.includes('>Query_blastp_swissprot'));
            assert.ok(fastaOutput.includes('MKRISTTITTIITIIGNCGADS'));
        });
    });

    suite('Annotation Results Export Tests', () => {
        test('should export annotation results to CSV format correctly', () => {
            const csvOutput = ExportFormats.exportAnnotationToCSV(mockAnnotationResults);
            
            // Check ORFs section
            assert.ok(csvOutput.includes('# Open Reading Frames'));
            assert.ok(csvOutput.includes('ORF_ID,Start,End,Strand,Frame,Length'));
            assert.ok(csvOutput.includes('orf1,1,66,+,1,66'));
            assert.ok(csvOutput.includes('orf2,67,75,-,2,9'));
            
            // Check domains section
            assert.ok(csvOutput.includes('# Protein Domains'));
            assert.ok(csvOutput.includes('Domain_ID,Name,Description'));
            assert.ok(csvOutput.includes('PF00001,"ATP_synthase"'));
            
            // Check features section
            assert.ok(csvOutput.includes('# Genomic Features'));
            assert.ok(csvOutput.includes('promoter1,promoter,1,25'));
            
            // Check predictions section
            assert.ok(csvOutput.includes('# Function Predictions'));
            assert.ok(csvOutput.includes('pred1,"ATP synthesis coupled proton transport"'));
        });

        test('should export annotation results to FASTA format correctly', () => {
            const fastaOutput = ExportFormats.exportAnnotationToFASTA(mockAnnotationResults);
            
            // Check original sequence
            assert.ok(fastaOutput.includes('>Original_Sequence_2023-01-01T12:00:00'));
            assert.ok(fastaOutput.includes('ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGATAAGGATCC'));
            
            // Check ORF sequences
            assert.ok(fastaOutput.includes('>orf1_DNA_1-66_frame1_+'));
            assert.ok(fastaOutput.includes('>orf1_protein_66bp'));
            assert.ok(fastaOutput.includes('MKRISTTITTIITIIGNCGADS'));
            
            assert.ok(fastaOutput.includes('>orf2_DNA_67-75_frame2_-'));
            assert.ok(fastaOutput.includes('>orf2_protein_9bp'));
            assert.ok(fastaOutput.includes('GSS'));
        });

        test('should export annotation results to GenBank format correctly', () => {
            const genbankOutput = ExportFormats.exportAnnotationToGenBank(mockAnnotationResults);
            
            // Check GenBank headers
            assert.ok(genbankOutput.includes('LOCUS       BIOMNI_ANNOTATION'));
            assert.ok(genbankOutput.includes('DEFINITION  Sequence annotation by Biomni VSCode Extension'));
            assert.ok(genbankOutput.includes('ACCESSION   BIOMNI_ANNOTATION'));
            assert.ok(genbankOutput.includes('VERSION     BIOMNI_ANNOTATION.1'));
            
            // Check features section
            assert.ok(genbankOutput.includes('FEATURES             Location/Qualifiers'));
            assert.ok(genbankOutput.includes('source          1..75'));
            
            // Check ORF features
            assert.ok(genbankOutput.includes('CDS             1..66'));
            assert.ok(genbankOutput.includes('/gene="orf1"'));
            assert.ok(genbankOutput.includes('/translation="MKRISTTITTIITIIGNCGADS"'));
            
            assert.ok(genbankOutput.includes('CDS             complement(67..75)'));
            assert.ok(genbankOutput.includes('/gene="orf2"'));
            
            // Check other features
            assert.ok(genbankOutput.includes('misc_feature    1..25'));
            assert.ok(genbankOutput.includes('/note="TATA_box"'));
            
            // Check domains
            assert.ok(genbankOutput.includes('misc_feature    10..50'));
            assert.ok(genbankOutput.includes('/note="protein domain: ATP_synthase"'));
            assert.ok(genbankOutput.includes('/db_xref="pfam:PF00001"'));
            
            // Check sequence section
            assert.ok(genbankOutput.includes('ORIGIN'));
            assert.ok(genbankOutput.includes('        1 atgaaacgca ttagcaccac cattaccacc accatcacca ttaccacagg taacggtgcg'));
            assert.ok(genbankOutput.includes('//'));
        });

        test('should handle annotation results with missing sections', () => {
            const minimalResults: AnnotationResults = {
                sequence: 'ATCGATCG',
                orfs: [],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };
            
            const csvOutput = ExportFormats.exportAnnotationToCSV(minimalResults);
            const fastaOutput = ExportFormats.exportAnnotationToFASTA(minimalResults);
            const genbankOutput = ExportFormats.exportAnnotationToGenBank(minimalResults);
            
            // Should not include empty sections in CSV
            assert.ok(!csvOutput.includes('# Open Reading Frames'));
            assert.ok(!csvOutput.includes('# Protein Domains'));
            
            // FASTA should still have original sequence
            assert.ok(fastaOutput.includes('>Original_Sequence_'));
            assert.ok(fastaOutput.includes('ATCGATCG'));
            
            // GenBank should have basic structure
            assert.ok(genbankOutput.includes('LOCUS'));
            assert.ok(genbankOutput.includes('source          1..8'));
            assert.ok(genbankOutput.includes('ORIGIN'));
        });
    });

    suite('Sequence Analysis Export Tests', () => {
        test('should export sequence analysis results to CSV format correctly', () => {
            const csvOutput = ExportFormats.exportAnalysisToCSV(mockAnalysisResults);
            
            // Check basic statistics
            assert.ok(csvOutput.includes('# Sequence Statistics'));
            assert.ok(csvOutput.includes('Property,Value'));
            assert.ok(csvOutput.includes('Sequence_Length,100'));
            assert.ok(csvOutput.includes('GC_Content,50.00'));
            assert.ok(csvOutput.includes('A_Count,25'));
            assert.ok(csvOutput.includes('T_Count,25'));
            assert.ok(csvOutput.includes('G_Count,25'));
            assert.ok(csvOutput.includes('C_Count,25'));
            assert.ok(csvOutput.includes('Melting_Temperature,72.50'));
            assert.ok(csvOutput.includes('Molecular_Weight,65000.50'));
            
            // Check restriction sites section
            assert.ok(csvOutput.includes('# Restriction Sites'));
            assert.ok(csvOutput.includes('Enzyme,Recognition_Site,Position,Overhang,Cut_Type'));
            assert.ok(csvOutput.includes('EcoRI,GAATTC,45,AATT,Sticky'));
            assert.ok(csvOutput.includes('BamHI,GGATCC,78,GATC,Sticky'));
            
            // Check repeats section
            assert.ok(csvOutput.includes('# Repeat Regions'));
            assert.ok(csvOutput.includes('Type,Start,End,Sequence,Copies'));
            assert.ok(csvOutput.includes('tandem,10,40,"ATCGATCG",4'));
        });

        test('should handle analysis results with no restriction sites or repeats', () => {
            const minimalResults: SequenceAnalysis = {
                ...mockAnalysisResults,
                restrictions: [],
                repeats: []
            };
            
            const csvOutput = ExportFormats.exportAnalysisToCSV(minimalResults);
            
            // Should have basic statistics
            assert.ok(csvOutput.includes('# Sequence Statistics'));
            assert.ok(csvOutput.includes('Sequence_Length,100'));
            
            // Should not have empty sections
            assert.ok(!csvOutput.includes('# Restriction Sites'));
            assert.ok(!csvOutput.includes('# Repeat Regions'));
        });
    });

    suite('JSON Export Tests', () => {
        test('should export BLAST results to JSON correctly', () => {
            const jsonOutput = ExportFormats.exportToJSON(mockBlastResults);
            
            assert.ok(typeof jsonOutput === 'string');
            
            const parsed = JSON.parse(jsonOutput);
            assert.strictEqual(parsed.querySequence, 'MKRISTTITTIITIIGNCGADS');
            assert.strictEqual(parsed.database, 'swissprot');
            assert.strictEqual(parsed.program, 'blastp');
            assert.strictEqual(parsed.hits.length, 2);
            assert.ok(parsed.statistics);
            assert.ok(parsed.parameters);
            assert.ok(parsed.timestamp);
        });

        test('should export annotation results to JSON correctly', () => {
            const jsonOutput = ExportFormats.exportToJSON(mockAnnotationResults);
            
            const parsed = JSON.parse(jsonOutput);
            assert.ok(parsed.sequence);
            assert.strictEqual(parsed.orfs.length, 2);
            assert.strictEqual(parsed.domains.length, 1);
            assert.strictEqual(parsed.features.length, 1);
            assert.strictEqual(parsed.predictions.length, 1);
        });

        test('should export analysis results to JSON correctly', () => {
            const jsonOutput = ExportFormats.exportToJSON(mockAnalysisResults);
            
            const parsed = JSON.parse(jsonOutput);
            assert.strictEqual(parsed.length, 100);
            assert.strictEqual(parsed.gcContent, 50.0);
            assert.ok(parsed.composition);
            assert.ok(parsed.melting);
            assert.ok(parsed.molecular);
            assert.strictEqual(parsed.restrictions.length, 2);
            assert.strictEqual(parsed.repeats.length, 1);
        });
    });

    suite('Summary Export Tests', () => {
        test('should generate BLAST results summary correctly', () => {
            const summary = ExportFormats.exportSummary(mockBlastResults);
            
            assert.ok(summary.includes('BIOMNI ANALYSIS SUMMARY'));
            assert.ok(summary.includes('BLAST SEARCH RESULTS'));
            assert.ok(summary.includes('Program: blastp'));
            assert.ok(summary.includes('Database: swissprot'));
            assert.ok(summary.includes('Query Length: 22 bp'));
            assert.ok(summary.includes('Total Hits: 2'));
            assert.ok(summary.includes('TOP HITS:'));
            assert.ok(summary.includes('1. Lysozyme C (EC 3.2.1.17) - Gallus gallus'));
            assert.ok(summary.includes('2. Lysozyme C - Homo sapiens'));
        });

        test('should generate annotation results summary correctly', () => {
            const summary = ExportFormats.exportSummary(mockAnnotationResults);
            
            assert.ok(summary.includes('GENE ANNOTATION RESULTS'));
            assert.ok(summary.includes('Sequence Length: 75 bp'));
            assert.ok(summary.includes('ORFs Found: 2'));
            assert.ok(summary.includes('Protein Domains: 1'));
            assert.ok(summary.includes('Genomic Features: 1'));
            assert.ok(summary.includes('Function Predictions: 1'));
            assert.ok(summary.includes('LONGEST ORFS:'));
            assert.ok(summary.includes('1. orf1: 66 bp (1-66, +)'));
        });

        test('should generate sequence analysis summary correctly', () => {
            const summary = ExportFormats.exportSummary(mockAnalysisResults);
            
            assert.ok(summary.includes('SEQUENCE ANALYSIS RESULTS'));
            assert.ok(summary.includes('Length: 100 bp'));
            assert.ok(summary.includes('GC Content: 50.00%'));
            assert.ok(summary.includes('Composition: A=25, T=25, G=25, C=25'));
            assert.ok(summary.includes('Melting Temperature: 72.50°C'));
            assert.ok(summary.includes('Molecular Weight: 65.00 kDa'));
            assert.ok(summary.includes('Restriction Sites: 2'));
            assert.ok(summary.includes('RESTRICTION ENZYMES:'));
            assert.ok(summary.includes('- EcoRI at position 45 (GAATTC)'));
            assert.ok(summary.includes('- BamHI at position 78 (GGATCC)'));
        });
    });

    suite('Utility Function Tests', () => {
        test('should return correct file extensions', () => {
            assert.strictEqual(ExportFormats.getFileExtension('csv'), 'csv');
            assert.strictEqual(ExportFormats.getFileExtension('json'), 'json');
            assert.strictEqual(ExportFormats.getFileExtension('fasta'), 'fasta');
            assert.strictEqual(ExportFormats.getFileExtension('genbank'), 'gb');
            assert.strictEqual(ExportFormats.getFileExtension('summary'), 'txt');
            assert.strictEqual(ExportFormats.getFileExtension('unknown' as any), 'txt');
        });

        test('should return correct MIME types', () => {
            assert.strictEqual(ExportFormats.getMimeType('csv'), 'text/csv');
            assert.strictEqual(ExportFormats.getMimeType('json'), 'application/json');
            assert.strictEqual(ExportFormats.getMimeType('fasta'), 'text/plain');
            assert.strictEqual(ExportFormats.getMimeType('genbank'), 'text/plain');
            assert.strictEqual(ExportFormats.getMimeType('summary'), 'text/plain');
            assert.strictEqual(ExportFormats.getMimeType('unknown' as any), 'text/plain');
        });
    });

    suite('Edge Cases and Error Handling Tests', () => {
        test('should handle very long sequences in FASTA export', () => {
            const longSequence = 'ATCGATCG'.repeat(10000); // 80kb sequence
            const longBlastResults: BlastResults = {
                ...mockBlastResults,
                querySequence: longSequence
            };
            
            const fastaOutput = ExportFormats.exportBlastToFASTA(longBlastResults);
            
            // Should include the full sequence with line breaks
            assert.ok(fastaOutput.includes(longSequence));
            
            // Check that lines are properly formatted (max 60 chars per line)
            const lines = fastaOutput.split('\n');
            const sequenceLines = lines.filter(line => !line.startsWith('>') && line.trim().length > 0);
            
            sequenceLines.forEach(line => {
                assert.ok(line.length <= 60, `Line too long: ${line.length} characters`);
            });
        });

        test('should handle special characters in descriptions', () => {
            const specialBlastResults: BlastResults = {
                ...mockBlastResults,
                hits: [{
                    ...mockBlastResults.hits[0],
                    description: 'Special chars: "quotes", commas, and newlines\ntest'
                }]
            };
            
            const csvOutput = ExportFormats.exportBlastToCSV(specialBlastResults);
            
            // Should properly escape quotes in CSV
            assert.ok(csvOutput.includes('""quotes""'));
            assert.ok(!csvOutput.includes('\n')); // Newlines should be handled
        });

        test('should handle empty or undefined data gracefully', () => {
            const emptyResults: AnnotationResults = {
                sequence: '',
                orfs: [],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };
            
            // Should not throw errors
            assert.doesNotThrow(() => {
                ExportFormats.exportAnnotationToCSV(emptyResults);
                ExportFormats.exportAnnotationToFASTA(emptyResults);
                ExportFormats.exportAnnotationToGenBank(emptyResults);
                ExportFormats.exportToJSON(emptyResults);
                ExportFormats.exportSummary(emptyResults);
            });
        });

        test('should handle large numbers in data fields', () => {
            const largeNumberResults: SequenceAnalysis = {
                ...mockAnalysisResults,
                molecular: {
                    molecularWeight: 1e10, // Very large molecular weight
                    extinction: 1e8,
                    absorbance: 1e6
                }
            };
            
            const csvOutput = ExportFormats.exportAnalysisToCSV(largeNumberResults);
            
            // Should handle scientific notation properly
            assert.ok(csvOutput.includes('1e+10') || csvOutput.includes('10000000000'));
        });
    });

    suite('Performance Tests', () => {
        test('should handle large result sets efficiently', () => {
            // Create BLAST results with many hits
            const manyHits = Array.from({ length: 1000 }, (_, i) => ({
                id: `hit_${i}`,
                description: `Test hit ${i}`,
                accession: `ACC${i.toString().padStart(6, '0')}`,
                length: 100 + i,
                evalue: Math.pow(10, -i % 20),
                bitScore: 100 + i * 0.1,
                score: 200 + i * 0.2,
                identity: 80 + i % 20,
                positive: 85 + i % 15,
                gaps: i % 10,
                queryStart: 1,
                queryEnd: 22,
                subjectStart: 1 + i % 50,
                subjectEnd: 22 + i % 50,
                querySequence: 'MKRISTTITTIITIIGNCGADS',
                subjectSequence: 'MKRISTTITTIITIIGNCGADS',
                alignmentString: '|||||||||||||||||||||'
            }));

            const largeBla stResults: BlastResults = {
                ...mockBlastResults,
                hits: manyHits
            };

            const startTime = Date.now();

            const csvOutput = ExportFormats.exportBlastToCSV(largeBlastResults);
            const fastaOutput = ExportFormats.exportBlastToFASTA(largeBlastResults);
            const jsonOutput = ExportFormats.exportToJSON(largeBlastResults);

            const endTime = Date.now();

            // Should complete within reasonable time
            assert.ok(endTime - startTime < 5000, 'Large export should complete within 5 seconds');
            
            // Verify outputs are correct
            assert.ok(csvOutput.split('\n').length > 1000); // Should have many rows
            assert.ok(fastaOutput.includes('>Hit_999_')); // Should include last hit
            
            const parsedJson = JSON.parse(jsonOutput);
            assert.strictEqual(parsedJson.hits.length, 1000);
        });
    });
});