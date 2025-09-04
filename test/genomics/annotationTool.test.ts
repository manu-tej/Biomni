import * as assert from 'assert';
import * as vscode from 'vscode';
import { AnnotationTool } from '../../src/tools/genomics/annotation';
import { AnnotationOptions, AnnotationResults } from '../../src/tools/genomics/index';

/**
 * Test suite for gene annotation tool functionality
 */
suite('Annotation Tool Tests', () => {
    let annotationTool: AnnotationTool;
    let mockMcpProvider: any;

    suiteSetup(() => {
        // Create mock MCP provider
        mockMcpProvider = {
            invoke: async (method: string, params: any) => {
                switch (method) {
                    case 'biomni.find_orfs':
                        return {
                            orfs: [
                                {
                                    id: 'orf1',
                                    start: 1,
                                    end: 300,
                                    strand: '+',
                                    frame: 1,
                                    length: 300,
                                    sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
                                    translation: 'MKRISTTITTIITIIGNCGADS'
                                },
                                {
                                    id: 'orf2',
                                    start: 350,
                                    end: 550,
                                    strand: '-',
                                    frame: 2,
                                    length: 201,
                                    sequence: 'ATGCAGCTGGAGAACGCGCTGGACAAGATCGAGGAGCTGAAGCGCGAGGAG',
                                    translation: 'MQLENALDKIEELKREEE'
                                }
                            ]
                        };
                        
                    case 'biomni.find_domains':
                        return {
                            domains: [
                                {
                                    id: 'PF00001',
                                    name: 'ATP_synthase',
                                    description: 'ATP synthase subunit',
                                    start: 50,
                                    end: 200,
                                    evalue: 1.2e-45,
                                    score: 150.5,
                                    database: 'pfam'
                                }
                            ]
                        };
                        
                    case 'biomni.predict_function':
                        return {
                            predictions: [
                                {
                                    id: 'pred1',
                                    function: 'ATP synthesis',
                                    confidence: 0.95,
                                    evidence: 'Homology to known ATP synthases',
                                    database: 'GO'
                                }
                            ]
                        };
                        
                    case 'biomni.annotate_features':
                        return {
                            features: [
                                {
                                    id: 'feature1',
                                    type: 'promoter',
                                    start: 1,
                                    end: 50,
                                    strand: '+',
                                    name: 'TATA_box',
                                    description: 'TATA box promoter element'
                                }
                            ]
                        };
                        
                    case 'biomni.translate_sequence':
                        return {
                            translations: [
                                'MKRISTTITTIITIIGNCGADS',
                                'RNTILPPLTPPSPLTQVTVRA',
                                'EKALHHHYHHHHLPQGNGAR',
                                'MQLENALDKIEELKREEE',
                                'SAWRTRAGHDIGAAVAEA',
                                'LGECAGQSESWKRRRS'
                            ]
                        };
                        
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }
            }
        };

        annotationTool = new AnnotationTool(mockMcpProvider);
    });

    suite('Gene Annotation Tests', () => {
        test('should perform complete gene annotation', async () => {
            const sequence = 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGATAAGGATCC';
            const options: AnnotationOptions = {
                findOrfs: true,
                translateOrfs: true,
                findDomains: true,
                predictFunction: true,
                annotateFeatures: true
            };

            const results = await annotationTool.annotate(sequence, options);

            assert.strictEqual(results.sequence, sequence);
            assert.strictEqual(results.orfs.length, 2);
            assert.strictEqual(results.domains.length, 1);
            assert.strictEqual(results.features.length, 1);
            assert.strictEqual(results.predictions.length, 1);
            assert.ok(results.timestamp instanceof Date);
        });

        test('should find ORFs correctly', async () => {
            const sequence = 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA';
            const orfs = await annotationTool.findORFs(sequence, 100, 1);

            assert.strictEqual(orfs.length, 2);
            assert.strictEqual(orfs[0].id, 'orf1');
            assert.strictEqual(orfs[0].start, 1);
            assert.strictEqual(orfs[0].end, 300);
            assert.strictEqual(orfs[0].strand, '+');
            assert.strictEqual(orfs[0].frame, 1);
            assert.strictEqual(orfs[0].length, 300);
        });

        test('should translate sequences in all reading frames', async () => {
            const sequence = 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA';
            const translations = await annotationTool.translateSequence(sequence, 1);

            assert.strictEqual(translations.length, 6);
            assert.strictEqual(translations[0], 'MKRISTTITTIITIIGNCGADS');
            assert.ok(translations.every(t => typeof t === 'string'));
        });

        test('should find protein domains', async () => {
            const sequence = 'MKRISTTITTIITIIGNCGADS';
            const domains = await annotationTool.findDomains(sequence);

            assert.strictEqual(domains.length, 1);
            assert.strictEqual(domains[0].id, 'PF00001');
            assert.strictEqual(domains[0].name, 'ATP_synthase');
            assert.strictEqual(domains[0].database, 'pfam');
            assert.strictEqual(domains[0].evalue, 1.2e-45);
        });

        test('should predict gene functions', async () => {
            const sequence = 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA';
            const predictions = await annotationTool.predictFunctions(sequence);

            assert.strictEqual(predictions.length, 1);
            assert.strictEqual(predictions[0].function, 'ATP synthesis');
            assert.strictEqual(predictions[0].confidence, 0.95);
            assert.strictEqual(predictions[0].database, 'GO');
        });

        test('should annotate genomic features', async () => {
            const sequence = 'TATAWAATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA';
            const features = await annotationTool.annotateFeatures(sequence, 'human');

            assert.strictEqual(features.length, 1);
            assert.strictEqual(features[0].type, 'promoter');
            assert.strictEqual(features[0].name, 'TATA_box');
            assert.strictEqual(features[0].start, 1);
            assert.strictEqual(features[0].end, 50);
        });
    });

    suite('Sequence Type Detection Tests', () => {
        test('should correctly identify nucleotide sequences', () => {
            const dnaSequence = 'ATCGATCGATCGATCGATCG';
            const rnaSequence = 'AUCGAUCGAUCGAUCGAUCG';
            
            // Use the private method through reflection for testing
            const isNucleotide = (annotationTool as any).isNucleotideSequence(dnaSequence);
            const isRnaNucleotide = (annotationTool as any).isNucleotideSequence(rnaSequence);
            
            assert.strictEqual(isNucleotide, true);
            assert.strictEqual(isRnaNucleotide, true);
        });

        test('should correctly identify protein sequences', () => {
            const proteinSequence = 'MKRISTTITTIITIIGNCGADS';
            
            const isNucleotide = (annotationTool as any).isNucleotideSequence(proteinSequence);
            
            assert.strictEqual(isNucleotide, false);
        });

        test('should handle ambiguous sequences', () => {
            const ambiguousSequence = 'ATCGATCGMKRISTTITTIITIIGNCGADS';
            
            const isNucleotide = (annotationTool as any).isNucleotideSequence(ambiguousSequence);
            
            // Should be determined by the majority of characters
            assert.strictEqual(isNucleotide, false);
        });
    });

    suite('Feature Type Normalization Tests', () => {
        test('should normalize feature types correctly', () => {
            const testCases = [
                { input: 'gene', expected: 'gene' },
                { input: 'locus', expected: 'gene' },
                { input: 'CDS', expected: 'CDS' },
                { input: 'coding_sequence', expected: 'CDS' },
                { input: 'exon', expected: 'exon' },
                { input: 'intron', expected: 'intron' },
                { input: 'promoter', expected: 'promoter' },
                { input: 'tss', expected: 'promoter' },
                { input: 'enhancer', expected: 'enhancer' },
                { input: 'unknown_feature', expected: 'other' }
            ];

            testCases.forEach(testCase => {
                const normalized = (annotationTool as any).normalizeFeatureType(testCase.input);
                assert.strictEqual(normalized, testCase.expected, `Failed for input: ${testCase.input}`);
            });
        });
    });

    suite('Color Coding Tests', () => {
        test('should assign appropriate colors to feature types', () => {
            const featureTypes = ['gene', 'CDS', 'exon', 'intron', 'promoter', 'enhancer', 'other'];
            
            featureTypes.forEach(featureType => {
                const color = annotationTool.getFeatureColor(featureType);
                assert.ok(color.startsWith('#'), `Color should be hex format for ${featureType}`);
                assert.strictEqual(color.length, 7, `Color should be 7 characters long for ${featureType}`);
            });
        });
    });

    suite('Genetic Code Tests', () => {
        test('should provide comprehensive genetic code tables', () => {
            const geneticCodes = annotationTool.getGeneticCodes();
            
            assert.ok(Object.keys(geneticCodes).length > 10);
            assert.strictEqual(geneticCodes[1], 'Standard');
            assert.strictEqual(geneticCodes[2], 'Vertebrate Mitochondrial');
            assert.strictEqual(geneticCodes[11], 'Bacterial/Archaeal/Plant Plastid');
        });
    });

    suite('Summary Generation Tests', () => {
        test('should generate comprehensive annotation summary', () => {
            const mockResults: AnnotationResults = {
                sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
                orfs: [
                    {
                        id: 'orf1',
                        start: 1,
                        end: 300,
                        strand: '+',
                        frame: 1,
                        length: 300,
                        sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGATAAGGATCC',
                        translation: 'MKRISTTITTIITIIGNCGADS'
                    }
                ],
                domains: [
                    {
                        id: 'PF00001',
                        name: 'ATP_synthase',
                        description: 'ATP synthase subunit',
                        start: 50,
                        end: 200,
                        evalue: 1.2e-45,
                        score: 150.5,
                        database: 'pfam'
                    }
                ],
                features: [
                    {
                        id: 'feature1',
                        type: 'promoter',
                        start: 1,
                        end: 50,
                        strand: '+',
                        name: 'TATA_box',
                        description: 'TATA box promoter element',
                        attributes: {}
                    }
                ],
                predictions: [
                    {
                        id: 'pred1',
                        function: 'ATP synthesis',
                        confidence: 0.95,
                        evidence: 'Homology to known ATP synthases',
                        database: 'GO'
                    }
                ],
                timestamp: new Date()
            };

            const summary = annotationTool.generateSummary(mockResults);
            
            assert.ok(summary.includes('Sequence length: 75 bp'));
            assert.ok(summary.includes('ORFs found: 1'));
            assert.ok(summary.includes('Longest ORF: 300 bp'));
            assert.ok(summary.includes('Protein domains: 1'));
            assert.ok(summary.includes('Unique domains: 1'));
            assert.ok(summary.includes('Genomic features: 1'));
            assert.ok(summary.includes('Feature types: promoter'));
            assert.ok(summary.includes('Function predictions: 1'));
        });
    });

    suite('Error Handling Tests', () => {
        test('should handle MCP provider failures gracefully', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP call failed');
                }
            };
            
            const failingAnnotationTool = new AnnotationTool(failingProvider);
            
            try {
                await failingAnnotationTool.annotate('ATCGATCG', { findOrfs: true });
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Gene annotation failed'));
            }
        });

        test('should handle partial annotation failures gracefully', async () => {
            const partialFailureProvider = {
                invoke: async (method: string) => {
                    if (method === 'biomni.find_orfs') {
                        return { orfs: [] };
                    } else if (method === 'biomni.find_domains') {
                        throw new Error('Domain finding failed');
                    } else {
                        return {};
                    }
                }
            };
            
            const partialTool = new AnnotationTool(partialFailureProvider);
            
            // Should still return results for successful operations
            const results = await partialTool.annotate('ATCGATCG', {
                findOrfs: true,
                findDomains: true
            });
            
            assert.ok(results);
            assert.strictEqual(results.orfs.length, 0);
            assert.strictEqual(results.domains.length, 0); // Should be empty due to failure
        });
    });

    suite('Performance Tests', () => {
        test('should handle large sequences efficiently', async () => {
            const largeSequence = 'ATCGATCG'.repeat(10000); // 80kb sequence
            
            const startTime = Date.now();
            
            const results = await annotationTool.annotate(largeSequence, {
                findOrfs: true,
                translateOrfs: true
            });
            
            const endTime = Date.now();
            
            // Should complete within reasonable time
            assert.ok(endTime - startTime < 5000, 'Large sequence annotation should complete within 5 seconds');
            assert.ok(results);
            assert.strictEqual(results.sequence, largeSequence);
        });

        test('should handle multiple concurrent annotations', async () => {
            const sequences = Array.from({ length: 10 }, (_, i) => 
                `ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA${i}`
            );
            
            const startTime = Date.now();
            
            const promises = sequences.map(seq => 
                annotationTool.annotate(seq, { findOrfs: true })
            );
            
            const results = await Promise.all(promises);
            
            const endTime = Date.now();
            
            assert.strictEqual(results.length, 10);
            assert.ok(results.every(result => result.orfs.length >= 0));
            assert.ok(endTime - startTime < 10000, 'Concurrent annotations should complete within 10 seconds');
        });
    });

    suite('Integration Tests', () => {
        test('should integrate properly with all annotation steps', async () => {
            const sequence = 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA';
            
            const fullOptions: AnnotationOptions = {
                findOrfs: true,
                translateOrfs: true,
                findDomains: true,
                predictFunction: true,
                annotateFeatures: true,
                organism: 'human',
                geneticCode: 1
            };

            const results = await annotationTool.annotate(sequence, fullOptions);
            
            // Verify all annotation types are present
            assert.ok(results.orfs.length > 0);
            assert.ok(results.domains.length > 0);
            assert.ok(results.features.length > 0);
            assert.ok(results.predictions.length > 0);
            
            // Verify data integrity
            results.orfs.forEach(orf => {
                assert.ok(orf.id);
                assert.ok(typeof orf.start === 'number');
                assert.ok(typeof orf.end === 'number');
                assert.ok(['+', '-'].includes(orf.strand));
                assert.ok(orf.frame >= 1 && orf.frame <= 3);
            });
            
            results.domains.forEach(domain => {
                assert.ok(domain.id);
                assert.ok(domain.name);
                assert.ok(typeof domain.evalue === 'number');
                assert.ok(typeof domain.score === 'number');
            });
        });
    });
});