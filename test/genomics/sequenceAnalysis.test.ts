import * as assert from 'assert';
import { SequenceAnalysisTool } from '../../src/tools/genomics/analysis';
import { SequenceAnalysis, NucleotideComposition } from '../../src/tools/genomics/index';

/**
 * Test suite for sequence analysis tool functionality
 */
suite('Sequence Analysis Tool Tests', () => {
    let analysisTool: SequenceAnalysisTool;
    let mockMcpProvider: any;

    suiteSetup(() => {
        // Create mock MCP provider
        mockMcpProvider = {
            invoke: async (method: string, params: any) => {
                switch (method) {
                    case 'biomni.sequence_composition':
                        return {
                            A: 25,
                            T: 25,
                            G: 25,
                            C: 25,
                            N: 0,
                            other: 0
                        };
                        
                    case 'biomni.find_restriction_sites':
                        return {
                            sites: [
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
                            ]
                        };
                        
                    case 'biomni.find_repeats':
                        return {
                            repeats: [
                                {
                                    type: 'tandem',
                                    start: 100,
                                    end: 150,
                                    sequence: 'ATCGATCG',
                                    copies: 6
                                }
                            ]
                        };
                        
                    case 'biomni.calculate_tm':
                        return {
                            tm: 72.5,
                            method: 'nearest_neighbor',
                            salt_concentration: 0.05
                        };
                        
                    case 'biomni.molecular_properties':
                        return {
                            molecular_weight: 30000.5,
                            extinction_coefficient: 165000,
                            absorbance_280: 1.2
                        };
                        
                    case 'biomni.codon_usage':
                        return {
                            codon_usage: {
                                'ATG': 5,
                                'TTT': 3,
                                'GGG': 2,
                                'CCC': 1
                            }
                        };
                        
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }
            }
        };

        analysisTool = new SequenceAnalysisTool(mockMcpProvider);
    });

    suite('Comprehensive Sequence Analysis Tests', () => {
        test('should perform complete sequence analysis', async () => {
            const testSequence = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG';
            
            const results = await analysisTool.analyze(testSequence);
            
            assert.strictEqual(results.sequence, testSequence);
            assert.strictEqual(results.length, testSequence.length);
            assert.ok(results.composition);
            assert.ok(typeof results.gcContent === 'number');
            assert.ok(results.melting);
            assert.ok(results.molecular);
            assert.ok(Array.isArray(results.restrictions));
            assert.ok(Array.isArray(results.repeats));
            assert.ok(results.timestamp instanceof Date);
        });

        test('should calculate nucleotide composition accurately', async () => {
            const testSequence = 'AAATTCCCGGGG'; // 3A, 2T, 3C, 4G
            
            const composition = await analysisTool.calculateComposition(testSequence);
            
            assert.strictEqual(composition.A, 3);
            assert.strictEqual(composition.T, 2);
            assert.strictEqual(composition.C, 3);
            assert.strictEqual(composition.G, 4);
            assert.strictEqual(composition.N, 0);
            assert.strictEqual(composition.other, 0);
        });

        test('should handle RNA sequences (U->T conversion)', async () => {
            const rnaSequence = 'AAAUUCCCGGGG'; // RNA with U instead of T
            
            const composition = await analysisTool.calculateComposition(rnaSequence);
            
            assert.strictEqual(composition.A, 3);
            assert.strictEqual(composition.T, 2); // U should be counted as T
            assert.strictEqual(composition.C, 3);
            assert.strictEqual(composition.G, 4);
        });

        test('should calculate GC content correctly', () => {
            const testCases = [
                { sequence: 'AAATTTGGGCCC', expected: 50 }, // 6 GC out of 12
                { sequence: 'ATATATATATAT', expected: 0 },   // No GC
                { sequence: 'GCGCGCGCGCGC', expected: 100 }, // All GC
                { sequence: 'ATCGATCGATCG', expected: 50 }   // Equal GC and AT
            ];

            testCases.forEach(testCase => {
                const gcContent = analysisTool.calculateGCContent(testCase.sequence);
                assert.strictEqual(gcContent, testCase.expected, 
                    `Failed for sequence: ${testCase.sequence}`);
            });
        });

        test('should find restriction sites correctly', async () => {
            const sequence = 'ATCGAATTCGGGATCCATCG'; // Contains EcoRI and BamHI sites
            
            const sites = await analysisTool.findRestrictionSites(sequence);
            
            assert.strictEqual(sites.length, 2);
            
            const ecoRI = sites.find(site => site.enzyme === 'EcoRI');
            const bamHI = sites.find(site => site.enzyme === 'BamHI');
            
            assert.ok(ecoRI);
            assert.strictEqual(ecoRI.site, 'GAATTC');
            assert.ok(bamHI);
            assert.strictEqual(bamHI.site, 'GGATCC');
        });

        test('should find repeat regions correctly', async () => {
            const sequence = 'ATCGATCGATCGATCGATCGATCGATCG'; // Tandem repeats
            
            const repeats = await analysisTool.findRepeats(sequence, 8);
            
            assert.strictEqual(repeats.length, 1);
            assert.strictEqual(repeats[0].type, 'tandem');
            assert.strictEqual(repeats[0].sequence, 'ATCGATCG');
            assert.strictEqual(repeats[0].copies, 6);
        });

        test('should calculate melting temperature', async () => {
            const sequence = 'ATCGATCGATCGATCG';
            const saltConc = 0.1;
            
            const meltingTemp = await analysisTool.calculateMeltingTemperature(sequence, saltConc);
            
            assert.strictEqual(meltingTemp.tm, 72.5);
            assert.strictEqual(meltingTemp.method, 'nearest_neighbor');
            assert.strictEqual(meltingTemp.saltConcentration, saltConc);
        });

        test('should calculate molecular properties', async () => {
            const sequence = 'ATCGATCGATCGATCG';
            
            const properties = await analysisTool.calculateMolecularProperties(sequence);
            
            assert.strictEqual(properties.molecularWeight, 30000.5);
            assert.strictEqual(properties.extinction, 165000);
            assert.strictEqual(properties.absorbance, 1.2);
        });
    });

    suite('Fallback Methods Tests', () => {
        test('should use fallback restriction site finding when MCP fails', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP failed');
                }
            };
            
            const failingTool = new SequenceAnalysisTool(failingProvider);
            const sequence = 'ATCGAATTCGGGATCCATCG'; // Contains EcoRI and BamHI
            
            const sites = await failingTool.findRestrictionSites(sequence);
            
            // Should find at least the basic sites
            assert.ok(sites.length > 0);
            const ecoRI = sites.find(site => site.enzyme === 'EcoRI');
            assert.ok(ecoRI);
        });

        test('should use fallback repeat finding when MCP fails', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP failed');
                }
            };
            
            const failingTool = new SequenceAnalysisTool(failingProvider);
            const sequence = 'ATCGATCGATCGATCGATCGATCG'; // Clear tandem repeats
            
            const repeats = await failingTool.findRepeats(sequence, 8);
            
            // Should find basic repeats
            assert.ok(repeats.length > 0);
            assert.strictEqual(repeats[0].type, 'tandem');
        });

        test('should use fallback Tm calculation when MCP fails', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP failed');
                }
            };
            
            const failingTool = new SequenceAnalysisTool(failingProvider);
            const sequence = 'ATCGATCGATCGATCG'; // 8 AT and 8 GC = 4*8 + 2*8 = 48°C
            
            const tm = await failingTool.calculateMeltingTemperature(sequence);
            
            assert.strictEqual(tm.tm, 48);
            assert.strictEqual(tm.method, 'basic');
        });

        test('should use fallback molecular properties when MCP fails', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP failed');
                }
            };
            
            const failingTool = new SequenceAnalysisTool(failingProvider);
            const sequence = 'ATCGATCGATCGATCG'; // 16 bp DNA
            
            const properties = await failingTool.calculateMolecularProperties(sequence);
            
            assert.strictEqual(properties.molecularWeight, 16 * 650); // Basic calculation
            assert.strictEqual(properties.extinction, 0);
            assert.strictEqual(properties.absorbance, 0);
        });
    });

    suite('Sequence Translation Tests', () => {
        test('should translate DNA sequence correctly', () => {
            const dnaSequence = 'ATGAAATTTGGGTAG'; // Start codon + 4 more codons + stop
            
            const protein = analysisTool.translateSequence(dnaSequence, 1, 1);
            
            assert.strictEqual(protein, 'MKFG*'); // M-K-F-G-stop
        });

        test('should handle different reading frames', () => {
            const sequence = 'ATCATGAAATTTGGGTAG'; // ATG starts at position 4
            
            const frame1 = analysisTool.translateSequence(sequence, 1, 1);
            const frame2 = analysisTool.translateSequence(sequence, 2, 1);
            const frame3 = analysisTool.translateSequence(sequence, 3, 1);
            
            // Frame 2 should have the proper start codon
            assert.ok(frame2.startsWith('M')); // ATG -> M
            assert.notStrictEqual(frame1, frame2);
            assert.notStrictEqual(frame2, frame3);
        });

        test('should handle invalid codons with X', () => {
            const invalidSequence = 'ATGNNN'; // NNN is not a valid codon
            
            const protein = analysisTool.translateSequence(invalidSequence, 1, 1);
            
            assert.strictEqual(protein, 'MX'); // M + X for invalid codon
        });
    });

    suite('Reverse Complement Tests', () => {
        test('should generate correct reverse complement', () => {
            const testCases = [
                { input: 'ATCG', expected: 'CGAT' },
                { input: 'AAATTTGGGCCC', expected: 'GGGCCCAAATTT' },
                { input: 'ATCGATCG', expected: 'CGATCGAT' },
                { input: 'UUUAAACCCGGG', expected: 'CCCGGGTTAAAA' } // RNA
            ];

            testCases.forEach(testCase => {
                const result = analysisTool.reverseComplement(testCase.input);
                assert.strictEqual(result, testCase.expected, 
                    `Failed for input: ${testCase.input}`);
            });
        });

        test('should handle ambiguous nucleotides', () => {
            const sequence = 'ATCGN-ATCG';
            const result = analysisTool.reverseComplement(sequence);
            
            assert.strictEqual(result, 'CGAT-NCGAT');
        });
    });

    suite('Codon Usage Tests', () => {
        test('should calculate codon usage correctly', async () => {
            const sequence = 'ATGATGTTTTTT'; // ATG, ATG, TTT, TTT
            
            const codonUsage = await analysisTool.getCodonUsage(sequence);
            
            assert.strictEqual(codonUsage['ATG'], 5); // From mock data
            assert.strictEqual(codonUsage['TTT'], 3);
        });

        test('should use fallback codon usage calculation', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP failed');
                }
            };
            
            const failingTool = new SequenceAnalysisTool(failingProvider);
            const sequence = 'ATGATGTTTTTT'; // ATG appears twice, TTT appears twice
            
            const codonUsage = await failingTool.getCodonUsage(sequence);
            
            assert.strictEqual(codonUsage['ATG'], 2);
            assert.strictEqual(codonUsage['TTT'], 2);
        });
    });

    suite('Sequence Type Detection Tests', () => {
        test('should correctly identify protein sequences', () => {
            const proteinSequence = 'MKRISTTITTIITIIGNCGADS';
            
            const isProtein = (analysisTool as any).isProteinSequence(proteinSequence);
            
            assert.strictEqual(isProtein, true);
        });

        test('should correctly identify nucleotide sequences', () => {
            const dnaSequence = 'ATCGATCGATCGATCG';
            
            const isProtein = (analysisTool as any).isProteinSequence(dnaSequence);
            
            assert.strictEqual(isProtein, false);
        });

        test('should handle mixed sequences', () => {
            const mixedSequence = 'ATCGATCGMKRISTTITTIITIIGNCGADS';
            
            const isProtein = (analysisTool as any).isProteinSequence(mixedSequence);
            
            // Should be determined by protein character ratio
            assert.strictEqual(isProtein, true);
        });
    });

    suite('Repeat Type Normalization Tests', () => {
        test('should normalize repeat types correctly', () => {
            const testCases = [
                { input: 'tandem', expected: 'tandem' },
                { input: 'inverted', expected: 'inverted' },
                { input: 'palindromic', expected: 'inverted' },
                { input: 'direct', expected: 'direct' },
                { input: 'unknown', expected: 'tandem' } // Default
            ];

            testCases.forEach(testCase => {
                const normalized = (analysisTool as any).normalizeRepeatType(testCase.input);
                assert.strictEqual(normalized, testCase.expected, 
                    `Failed for input: ${testCase.input}`);
            });
        });
    });

    suite('Error Handling Tests', () => {
        test('should handle empty sequences gracefully', async () => {
            try {
                await analysisTool.analyze('');
                assert.fail('Should have thrown an error for empty sequence');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Sequence analysis failed'));
            }
        });

        test('should handle very short sequences', async () => {
            const shortSequence = 'AT'; // Only 2 bp
            
            try {
                await analysisTool.analyze(shortSequence);
                assert.fail('Should have thrown an error for short sequence');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Sequence analysis failed'));
            }
        });

        test('should handle invalid characters in sequence', async () => {
            const invalidSequence = 'ATCG123XYZ'; // Contains numbers and invalid letters
            
            try {
                await analysisTool.analyze(invalidSequence);
                assert.fail('Should have thrown an error for invalid characters');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Sequence analysis failed'));
            }
        });

        test('should handle very long sequences', async () => {
            const veryLongSequence = 'ATCG'.repeat(300000); // 1.2M characters
            
            try {
                await analysisTool.analyze(veryLongSequence);
                assert.fail('Should have thrown an error for sequence too long');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Sequence analysis failed'));
            }
        });
    });

    suite('Performance Tests', () => {
        test('should handle moderately large sequences efficiently', async () => {
            const largeSequence = 'ATCGATCG'.repeat(10000); // 80kb sequence
            
            const startTime = Date.now();
            
            const results = await analysisTool.analyze(largeSequence);
            
            const endTime = Date.now();
            
            // Should complete within reasonable time
            assert.ok(endTime - startTime < 5000, 'Analysis should complete within 5 seconds');
            assert.strictEqual(results.sequence, largeSequence);
            assert.strictEqual(results.length, largeSequence.length);
        });

        test('should calculate GC content efficiently for large sequences', () => {
            const largeSequence = 'ATCGATCG'.repeat(100000); // 800kb
            
            const startTime = Date.now();
            
            const gcContent = analysisTool.calculateGCContent(largeSequence);
            
            const endTime = Date.now();
            
            assert.ok(endTime - startTime < 1000, 'GC calculation should be fast');
            assert.strictEqual(gcContent, 50); // ATCGATCG is 50% GC
        });
    });

    suite('Integration Tests', () => {
        test('should integrate all analysis components correctly', async () => {
            const testSequence = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG';
            
            const results = await analysisTool.analyze(testSequence);
            
            // Verify all components are present and valid
            assert.ok(results.sequence);
            assert.ok(typeof results.length === 'number');
            assert.ok(results.composition);
            assert.ok(typeof results.gcContent === 'number');
            assert.ok(results.melting);
            assert.ok(results.molecular);
            assert.ok(Array.isArray(results.restrictions));
            assert.ok(Array.isArray(results.repeats));
            assert.ok(results.timestamp instanceof Date);
            
            // Verify data consistency
            assert.strictEqual(results.sequence, testSequence);
            assert.strictEqual(results.length, testSequence.length);
            
            // GC content should be reasonable (0-100)
            assert.ok(results.gcContent >= 0 && results.gcContent <= 100);
            
            // Melting temperature should be reasonable
            assert.ok(results.melting.tm > 0 && results.melting.tm < 200);
            
            // Molecular weight should be positive
            assert.ok(results.molecular.molecularWeight > 0);
        });
    });
});