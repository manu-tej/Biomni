import * as assert from 'assert';
import * as vscode from 'vscode';
import { BlastTool } from '../../src/tools/genomics/blast';
import { BlastParams, BlastResults } from '../../src/tools/genomics/index';

/**
 * Test suite for BLAST tool functionality
 */
suite('BLAST Tool Tests', () => {
    let blastTool: BlastTool;
    let mockMcpProvider: any;

    suiteSetup(() => {
        // Create mock MCP provider
        mockMcpProvider = {
            invoke: async (method: string, params: any) => {
                // Mock BLAST search response
                if (method === 'biomni.blast_search') {
                    return {
                        hits: [
                            {
                                id: 'sp|P00698|LYSC_CHICK',
                                description: 'Lysozyme C (EC 3.2.1.17) - Gallus gallus',
                                accession: 'P00698',
                                length: 147,
                                evalue: 1.2e-88,
                                bit_score: 258.4,
                                score: 658,
                                identity: 129,
                                positive: 129,
                                gaps: 0,
                                query_start: 1,
                                query_end: 129,
                                subject_start: 19,
                                subject_end: 147,
                                query_sequence: 'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
                                subject_sequence: 'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
                                alignment: '||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||'
                            }
                        ],
                        statistics: {
                            search_space: 55080,
                            effective_length: 129,
                            kappa: 0.041,
                            lambda: 0.267,
                            entropy: 0.14
                        }
                    };
                } else if (method === 'biomni.blast_databases') {
                    return {
                        databases: ['nr', 'nt', 'refseq_protein', 'swissprot', 'pdb']
                    };
                }
                throw new Error(`Unknown method: ${method}`);
            }
        };

        blastTool = new BlastTool(mockMcpProvider);
    });

    suite('BLAST Search Tests', () => {
        test('should perform successful BLAST search with valid parameters', async () => {
            const params: BlastParams = {
                sequence: 'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
                database: 'swissprot',
                program: 'blastp',
                evalue: 10.0,
                maxTargetSeqs: 100
            };

            const results = await blastTool.search(params);

            assert.strictEqual(results.querySequence, params.sequence);
            assert.strictEqual(results.database, params.database);
            assert.strictEqual(results.program, params.program);
            assert.strictEqual(results.hits.length, 1);
            assert.strictEqual(results.hits[0].id, 'sp|P00698|LYSC_CHICK');
            assert.strictEqual(results.hits[0].evalue, 1.2e-88);
            assert.ok(results.timestamp instanceof Date);
        });

        test('should validate BLAST parameters correctly', () => {
            const validParams: BlastParams = {
                sequence: 'ATCGATCGATCG',
                database: 'nt',
                program: 'blastn'
            };

            const errors = blastTool.validateParameters(validParams);
            assert.strictEqual(errors.length, 0);
        });

        test('should reject invalid BLAST parameters', () => {
            const invalidParams: BlastParams = {
                sequence: '',
                database: 'nt',
                program: 'blastn',
                evalue: -1,
                maxTargetSeqs: 0
            };

            const errors = blastTool.validateParameters(invalidParams);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(error => error.includes('Sequence is required')));
            assert.ok(errors.some(error => error.includes('E-value must be')));
            assert.ok(errors.some(error => error.includes('Maximum target sequences')));
        });

        test('should suggest appropriate BLAST program for nucleotide sequence', () => {
            const nucleotideSequence = 'ATCGATCGATCGATCGATCGATCG';
            const suggestions = blastTool.suggestBlastProgram(nucleotideSequence);
            
            assert.ok(suggestions.includes('blastn'));
            assert.ok(suggestions.includes('blastx'));
            assert.ok(suggestions.includes('tblastx'));
        });

        test('should suggest appropriate BLAST program for protein sequence', () => {
            const proteinSequence = 'MVLSEGEWQLVLHVWAKVEADVAGHGQDILIRLFKSHPETLEKFDRFKHLKTEAEMKASEDLKKHGVTVLTALGAILKKKGHHEAELKPLAQSHATKHKIPIKYLEFISEAIIHVLHSRHPGDFGADAQGAMTKALELFRNDIAAKYKELGFQG';
            const suggestions = blastTool.suggestBlastProgram(proteinSequence);
            
            assert.ok(suggestions.includes('blastp'));
            assert.ok(suggestions.includes('tblastn'));
        });

        test('should get default parameters for different BLAST programs', () => {
            const blastnDefaults = blastTool.getDefaultParameters('blastn');
            assert.strictEqual(blastnDefaults.evalue, 10.0);
            assert.strictEqual(blastnDefaults.maxTargetSeqs, 100);
            assert.strictEqual(blastnDefaults.wordSize, 11);

            const blastpDefaults = blastTool.getDefaultParameters('blastp');
            assert.strictEqual(blastpDefaults.evalue, 10.0);
            assert.strictEqual(blastnDefaults.maxTargetSeqs, 100);
            assert.strictEqual(blastpDefaults.matrix, 'BLOSUM62');
        });
    });

    suite('BLAST Results Processing Tests', () => {
        test('should calculate identity percentage correctly', () => {
            const hit = {
                id: 'test_hit',
                description: 'Test hit',
                accession: 'TEST001',
                length: 100,
                evalue: 1e-10,
                bitScore: 200,
                score: 500,
                identity: 85,
                positive: 90,
                gaps: 5,
                queryStart: 1,
                queryEnd: 100,
                subjectStart: 1,
                subjectEnd: 100,
                querySequence: 'A'.repeat(100),
                subjectSequence: 'A'.repeat(100),
                alignmentString: '|'.repeat(100)
            };

            const identityPercent = blastTool.calculateIdentity(hit);
            assert.strictEqual(identityPercent, 85);
        });

        test('should format alignment correctly', () => {
            const hit = {
                id: 'test_hit',
                description: 'Test hit',
                accession: 'TEST001',
                length: 20,
                evalue: 1e-10,
                bitScore: 50,
                score: 100,
                identity: 18,
                positive: 20,
                gaps: 0,
                queryStart: 1,
                queryEnd: 20,
                subjectStart: 1,
                subjectEnd: 20,
                querySequence: 'ATCGATCGATCGATCGATCG',
                subjectSequence: 'ATCGATCGATCGATCGATCG',
                alignmentString: '||||||||||||||||||||'
            };

            const alignment = blastTool.formatAlignment(hit, 10);
            assert.ok(alignment.includes('Query  1'));
            assert.ok(alignment.includes('Sbjct  1'));
            assert.ok(alignment.includes('ATCGATCGATCGATCGATCG'));
        });

        test('should assign appropriate E-value colors', () => {
            assert.strictEqual(blastTool.getEValueColor(1e-100), '#ff0000'); // Red for highly significant
            assert.strictEqual(blastTool.getEValueColor(1e-20), '#ff8000'); // Orange for significant
            assert.strictEqual(blastTool.getEValueColor(1e-8), '#ffff00'); // Yellow for moderate
            assert.strictEqual(blastTool.getEValueColor(0.1), '#80ff80'); // Light green for marginal
            assert.strictEqual(blastTool.getEValueColor(5.0), '#c0c0c0'); // Gray for not significant
        });
    });

    suite('BLAST Database Tests', () => {
        test('should retrieve available databases', async () => {
            const databases = await blastTool.getAvailableDatabases();
            
            assert.ok(Array.isArray(databases));
            assert.ok(databases.length > 0);
            assert.ok(databases.includes('nr'));
            assert.ok(databases.includes('nt'));
            assert.ok(databases.includes('swissprot'));
        });

        test('should handle database retrieval failure gracefully', async () => {
            // Create tool with failing MCP provider
            const failingProvider = {
                invoke: async () => {
                    throw new Error('Database retrieval failed');
                }
            };
            
            const failingBlastTool = new BlastTool(failingProvider);
            const databases = await failingBlastTool.getAvailableDatabases();
            
            // Should return default databases on failure
            assert.ok(databases.includes('nr'));
            assert.ok(databases.includes('nt'));
        });
    });

    suite('Error Handling Tests', () => {
        test('should handle MCP provider failures gracefully', async () => {
            const failingProvider = {
                invoke: async () => {
                    throw new Error('MCP call failed');
                }
            };
            
            const failingBlastTool = new BlastTool(failingProvider);
            
            const params: BlastParams = {
                sequence: 'ATCGATCG',
                database: 'nt',
                program: 'blastn'
            };

            try {
                await failingBlastTool.search(params);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('BLAST search failed'));
            }
        });

        test('should validate sequence length limits', () => {
            const tooLongParams: BlastParams = {
                sequence: 'A'.repeat(200000), // 200k characters
                database: 'nt',
                program: 'blastn'
            };

            const errors = blastTool.validateParameters(tooLongParams);
            assert.ok(errors.some(error => error.includes('too long')));
        });

        test('should validate E-value range', () => {
            const invalidEvalueParams: BlastParams = {
                sequence: 'ATCGATCGATCG',
                database: 'nt',
                program: 'blastn',
                evalue: 2000 // Too high
            };

            const errors = blastTool.validateParameters(invalidEvalueParams);
            assert.ok(errors.some(error => error.includes('E-value must be')));
        });
    });

    suite('Performance Tests', () => {
        test('should handle large result sets efficiently', () => {
            // Create mock result with many hits
            const manyHits = Array.from({ length: 1000 }, (_, i) => ({
                id: `hit_${i}`,
                description: `Test hit ${i}`,
                accession: `ACC${i.toString().padStart(6, '0')}`,
                length: 100,
                evalue: Math.pow(10, -i % 20),
                bit_score: 100 - i * 0.1,
                score: 200 - i * 0.2,
                identity: 90 - i % 10,
                positive: 95 - i % 10,
                gaps: i % 5,
                query_start: 1,
                query_end: 100,
                subject_start: 1,
                subject_end: 100,
                query_sequence: 'A'.repeat(100),
                subject_sequence: 'A'.repeat(100),
                alignment: '|'.repeat(100)
            }));

            // Test that processing many hits doesn't take too long
            const startTime = Date.now();
            
            manyHits.forEach(hit => {
                blastTool.calculateIdentity(hit);
                blastTool.getEValueColor(hit.evalue);
            });
            
            const endTime = Date.now();
            assert.ok(endTime - startTime < 1000, 'Processing should complete within 1 second');
        });
    });

    suite('Integration Tests', () => {
        test('should integrate properly with mock MCP provider', async () => {
            const params: BlastParams = {
                sequence: 'KVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQINSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
                database: 'swissprot',
                program: 'blastp'
            };

            // Should complete without throwing errors
            const results = await blastTool.search(params);
            
            // Results should have expected structure
            assert.ok(results);
            assert.ok(results.hits);
            assert.ok(results.statistics);
            assert.ok(results.timestamp);
            assert.strictEqual(typeof results.querySequence, 'string');
            assert.strictEqual(typeof results.database, 'string');
            assert.strictEqual(typeof results.program, 'string');
        });
    });
});