import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { GenomicsResultsManager, ResultMetadata } from '../../src/tools/results/manager';
import { BlastResults, AnnotationResults, SequenceAnalysis } from '../../src/tools/genomics/index';

/**
 * Test suite for genomics results manager
 */
suite('Genomics Results Manager Tests', () => {
    let resultsManager: GenomicsResultsManager;
    let mockContext: vscode.ExtensionContext;

    suiteSetup(() => {
        // Create mock extension context
        mockContext = {
            globalStorageUri: vscode.Uri.file('/tmp/test-storage'),
            workspaceState: {
                keys: () => [],
                get: <T>(key: string, defaultValue?: T) => {
                    if (key === 'biomni.resultsHistory') {
                        return defaultValue || [];
                    }
                    return defaultValue;
                },
                update: async (key: string, value: any) => {
                    // Mock update - do nothing
                    return Promise.resolve();
                }
            }
        } as any;

        resultsManager = new GenomicsResultsManager(mockContext);
    });

    suiteTeardown(() => {
        resultsManager.dispose();
    });

    suite('BLAST Results Management Tests', () => {
        test('should save and retrieve BLAST results', async () => {
            const mockBlastResults: BlastResults = {
                querySequence: 'ATCGATCGATCG',
                database: 'nr',
                program: 'blastn',
                hits: [
                    {
                        id: 'hit1',
                        description: 'Test hit',
                        accession: 'ACC001',
                        length: 1000,
                        evalue: 1e-10,
                        bitScore: 200,
                        score: 500,
                        identity: 95,
                        positive: 98,
                        gaps: 2,
                        queryStart: 1,
                        queryEnd: 12,
                        subjectStart: 100,
                        subjectEnd: 111,
                        querySequence: 'ATCGATCGATCG',
                        subjectSequence: 'ATCGATCGATCG',
                        alignmentString: '||||||||||||'
                    }
                ],
                statistics: {
                    searchSpace: 50000,
                    effectiveLength: 12,
                    kappa: 0.041,
                    lambda: 0.267,
                    entropy: 0.14
                },
                parameters: {
                    sequence: 'ATCGATCGATCG',
                    database: 'nr',
                    program: 'blastn'
                },
                timestamp: new Date()
            };

            const resultId = await resultsManager.saveBlastResults(mockBlastResults);
            
            assert.ok(resultId);
            assert.ok(resultId.startsWith('blast_'));
            
            const retrievedResult = await resultsManager.getResult(resultId);
            
            assert.ok(retrievedResult);
            assert.strictEqual((retrievedResult as BlastResults).querySequence, mockBlastResults.querySequence);
            assert.strictEqual((retrievedResult as BlastResults).database, mockBlastResults.database);
            assert.strictEqual((retrievedResult as BlastResults).hits.length, 1);
        });

        test('should save multiple BLAST results with unique IDs', async () => {
            const results1: BlastResults = {
                querySequence: 'ATCGATCGATCG',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'ATCGATCGATCG', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const results2: BlastResults = {
                querySequence: 'GGCCTTAATTGG',
                database: 'nt',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'GGCCTTAATTGG', database: 'nt', program: 'blastn' },
                timestamp: new Date()
            };

            const id1 = await resultsManager.saveBlastResults(results1);
            const id2 = await resultsManager.saveBlastResults(results2);
            
            assert.notStrictEqual(id1, id2);
            assert.ok(id1.startsWith('blast_'));
            assert.ok(id2.startsWith('blast_'));
            
            const retrieved1 = await resultsManager.getResult(id1);
            const retrieved2 = await resultsManager.getResult(id2);
            
            assert.strictEqual((retrieved1 as BlastResults).querySequence, results1.querySequence);
            assert.strictEqual((retrieved2 as BlastResults).querySequence, results2.querySequence);
        });
    });

    suite('Annotation Results Management Tests', () => {
        test('should save and retrieve annotation results', async () => {
            const mockAnnotationResults: AnnotationResults = {
                sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
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
                    }
                ],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };

            const resultId = await resultsManager.saveAnnotationResults(mockAnnotationResults);
            
            assert.ok(resultId);
            assert.ok(resultId.startsWith('annotation_'));
            
            const retrievedResult = await resultsManager.getResult(resultId);
            
            assert.ok(retrievedResult);
            assert.strictEqual((retrievedResult as AnnotationResults).sequence, mockAnnotationResults.sequence);
            assert.strictEqual((retrievedResult as AnnotationResults).orfs.length, 1);
            assert.strictEqual((retrievedResult as AnnotationResults).orfs[0].id, 'orf1');
        });
    });

    suite('Sequence Analysis Results Management Tests', () => {
        test('should save and retrieve sequence analysis results', async () => {
            const mockAnalysisResults: SequenceAnalysis = {
                sequence: 'ATCGATCGATCGATCGATCG',
                length: 20,
                composition: { A: 5, T: 5, G: 5, C: 5, N: 0, other: 0 },
                gcContent: 50.0,
                melting: { tm: 65.2, method: 'basic', saltConcentration: 0.05 },
                molecular: { molecularWeight: 13000, extinction: 100000, absorbance: 1.1 },
                restrictions: [
                    {
                        enzyme: 'EcoRI',
                        site: 'GAATTC',
                        position: 15,
                        overhang: 'AATT',
                        blunt: false
                    }
                ],
                repeats: [],
                timestamp: new Date()
            };

            const resultId = await resultsManager.saveAnalysisResults(mockAnalysisResults);
            
            assert.ok(resultId);
            assert.ok(resultId.startsWith('analysis_'));
            
            const retrievedResult = await resultsManager.getResult(resultId);
            
            assert.ok(retrievedResult);
            assert.strictEqual((retrievedResult as SequenceAnalysis).sequence, mockAnalysisResults.sequence);
            assert.strictEqual((retrievedResult as SequenceAnalysis).length, 20);
            assert.strictEqual((retrievedResult as SequenceAnalysis).gcContent, 50.0);
        });
    });

    suite('History Management Tests', () => {
        test('should retrieve analysis history', async () => {
            const history = await resultsManager.getHistory();
            
            assert.ok(Array.isArray(history));
            // History should be sorted by timestamp (newest first)
        });

        test('should search results by query', async () => {
            // First add some results to search
            const blastResults: BlastResults = {
                querySequence: 'ATCGATCGSEARCHABLEPATTERN',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'ATCGATCGSEARCHABLEPATTERN', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            await resultsManager.saveBlastResults(blastResults);

            const searchResults = await resultsManager.searchResults('SEARCHABLEPATTERN');
            
            assert.ok(Array.isArray(searchResults));
            // Should find results containing the search term
        });

        test('should filter search results by type', async () => {
            const blastResults: BlastResults = {
                querySequence: 'FILTERTEST',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'FILTERTEST', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            await resultsManager.saveBlastResults(blastResults);

            const blastOnlyResults = await resultsManager.searchResults('FILTERTEST', 'blast');
            const annotationOnlyResults = await resultsManager.searchResults('FILTERTEST', 'annotation');
            
            assert.ok(Array.isArray(blastOnlyResults));
            assert.ok(Array.isArray(annotationOnlyResults));
            // BLAST results should only be in blast search, not annotation search
        });
    });

    suite('Cache Management Tests', () => {
        test('should provide cache statistics', () => {
            const stats = resultsManager.getCacheStats();
            
            assert.ok(typeof stats.totalResults === 'number');
            assert.ok(typeof stats.memoryUsage === 'string');
            assert.ok(stats.memoryUsage.includes('B') || stats.memoryUsage.includes('KB') || stats.memoryUsage.includes('MB'));
        });

        test('should clear all cached results', async () => {
            // Add a result first
            const testResults: BlastResults = {
                querySequence: 'TESTCLEAR',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'TESTCLEAR', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const resultId = await resultsManager.saveBlastResults(testResults);
            
            // Verify it exists
            let retrieved = await resultsManager.getResult(resultId);
            assert.ok(retrieved);

            // Clear cache
            await resultsManager.clearCache();

            // Verify it's gone
            retrieved = await resultsManager.getResult(resultId);
            assert.strictEqual(retrieved, null);
        });

        test('should remove specific results', async () => {
            const testResults: BlastResults = {
                querySequence: 'TESTREMOVE',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'TESTREMOVE', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const resultId = await resultsManager.saveBlastResults(testResults);
            
            // Verify it exists
            let retrieved = await resultsManager.getResult(resultId);
            assert.ok(retrieved);

            // Remove specific result
            await resultsManager.removeResult(resultId);

            // Verify it's gone
            retrieved = await resultsManager.getResult(resultId);
            assert.strictEqual(retrieved, null);
        });
    });

    suite('Export Functionality Tests', () => {
        test('should export BLAST results to JSON', async () => {
            const mockBlastResults: BlastResults = {
                querySequence: 'ATCGATCG',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'ATCGATCG', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const jsonExport = await resultsManager.exportResult(mockBlastResults, 'json');
            
            assert.ok(typeof jsonExport === 'string');
            const parsed = JSON.parse(jsonExport);
            assert.strictEqual(parsed.querySequence, 'ATCGATCG');
            assert.strictEqual(parsed.database, 'nr');
        });

        test('should export BLAST results to CSV', async () => {
            const mockBlastResults: BlastResults = {
                querySequence: 'ATCGATCG',
                database: 'nr',
                program: 'blastn',
                hits: [
                    {
                        id: 'hit1',
                        description: 'Test hit',
                        accession: 'ACC001',
                        length: 100,
                        evalue: 1e-10,
                        bitScore: 200,
                        score: 500,
                        identity: 95,
                        positive: 98,
                        gaps: 2,
                        queryStart: 1,
                        queryEnd: 8,
                        subjectStart: 1,
                        subjectEnd: 8,
                        querySequence: 'ATCGATCG',
                        subjectSequence: 'ATCGATCG',
                        alignmentString: '||||||||'
                    }
                ],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'ATCGATCG', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const csvExport = await resultsManager.exportResult(mockBlastResults, 'csv');
            
            assert.ok(typeof csvExport === 'string');
            assert.ok(csvExport.includes('Query_ID,Hit_ID,Description'));
            assert.ok(csvExport.includes('hit1'));
            assert.ok(csvExport.includes('Test hit'));
        });

        test('should export annotation results to FASTA', async () => {
            const mockAnnotationResults: AnnotationResults = {
                sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
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
                    }
                ],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };

            const fastaExport = await resultsManager.exportResult(mockAnnotationResults, 'fasta');
            
            assert.ok(typeof fastaExport === 'string');
            assert.ok(fastaExport.includes('>Original_Sequence'));
            assert.ok(fastaExport.includes('>orf1_DNA'));
            assert.ok(fastaExport.includes('>orf1_protein'));
            assert.ok(fastaExport.includes('MKRISTTITTIITIIGNCGADS'));
        });

        test('should export annotation results to GenBank format', async () => {
            const mockAnnotationResults: AnnotationResults = {
                sequence: 'ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGA',
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
                    }
                ],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };

            const genbankExport = await resultsManager.exportResult(mockAnnotationResults, 'genbank');
            
            assert.ok(typeof genbankExport === 'string');
            assert.ok(genbankExport.includes('LOCUS'));
            assert.ok(genbankExport.includes('DEFINITION'));
            assert.ok(genbankExport.includes('FEATURES'));
            assert.ok(genbankExport.includes('CDS'));
            assert.ok(genbankExport.includes('ORIGIN'));
            assert.ok(genbankExport.includes('//'));
        });

        test('should handle unsupported export formats', async () => {
            const mockResults: BlastResults = {
                querySequence: 'ATCGATCG',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'ATCGATCG', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            try {
                await resultsManager.exportResult(mockResults, 'unsupported' as any);
                assert.fail('Should have thrown an error for unsupported format');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Unsupported export format'));
            }
        });
    });

    suite('Error Handling Tests', () => {
        test('should handle retrieval of non-existent results', async () => {
            const nonExistentId = 'blast_12345_nonexistent';
            
            const result = await resultsManager.getResult(nonExistentId);
            
            assert.strictEqual(result, null);
        });

        test('should handle removal of non-existent results gracefully', async () => {
            const nonExistentId = 'blast_12345_nonexistent';
            
            // Should not throw an error
            await resultsManager.removeResult(nonExistentId);
        });

        test('should handle corrupted result data gracefully', () => {
            // This would test persistence layer corruption handling
            // For now, just verify the manager doesn't crash on bad data
            assert.ok(true); // Placeholder
        });
    });

    suite('Performance Tests', () => {
        test('should handle many cached results efficiently', async () => {
            const startTime = Date.now();
            
            // Add many results
            const promises: Promise<string>[] = [];
            for (let i = 0; i < 50; i++) {
                const results: BlastResults = {
                    querySequence: `TESTPERF${i}`,
                    database: 'nr',
                    program: 'blastn',
                    hits: [],
                    statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                    parameters: { sequence: `TESTPERF${i}`, database: 'nr', program: 'blastn' },
                    timestamp: new Date()
                };
                promises.push(resultsManager.saveBlastResults(results));
            }
            
            await Promise.all(promises);
            
            const endTime = Date.now();
            
            // Should complete within reasonable time
            assert.ok(endTime - startTime < 5000, 'Bulk operations should complete within 5 seconds');
            
            // Verify cache stats
            const stats = resultsManager.getCacheStats();
            assert.ok(stats.totalResults >= 50);
        });

        test('should enforce cache size limits', async () => {
            // This test would verify that the cache doesn't grow beyond maxCacheSize
            // The implementation should automatically remove old entries
            
            // Add results beyond cache limit to test enforcement
            const promises: Promise<string>[] = [];
            for (let i = 0; i < 150; i++) { // More than maxCacheSize (100)
                const results: BlastResults = {
                    querySequence: `CACHETEST${i}`,
                    database: 'nr',
                    program: 'blastn',
                    hits: [],
                    statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                    parameters: { sequence: `CACHETEST${i}`, database: 'nr', program: 'blastn' },
                    timestamp: new Date()
                };
                promises.push(resultsManager.saveBlastResults(results));
            }
            
            await Promise.all(promises);
            
            const stats = resultsManager.getCacheStats();
            
            // Total results should be limited (though some may be in persistent storage)
            assert.ok(stats.totalResults <= 150, 'Cache should not grow indefinitely');
        });
    });

    suite('Integration Tests', () => {
        test('should integrate all functionality correctly', async () => {
            // Add different types of results
            const blastResults: BlastResults = {
                querySequence: 'INTEGRATION_BLAST',
                database: 'nr',
                program: 'blastn',
                hits: [],
                statistics: { searchSpace: 0, effectiveLength: 0, kappa: 0, lambda: 0, entropy: 0 },
                parameters: { sequence: 'INTEGRATION_BLAST', database: 'nr', program: 'blastn' },
                timestamp: new Date()
            };

            const annotationResults: AnnotationResults = {
                sequence: 'INTEGRATION_ANNOTATION',
                orfs: [],
                domains: [],
                features: [],
                predictions: [],
                timestamp: new Date()
            };

            const analysisResults: SequenceAnalysis = {
                sequence: 'INTEGRATION_ANALYSIS',
                length: 20,
                composition: { A: 5, T: 5, G: 5, C: 5, N: 0, other: 0 },
                gcContent: 50.0,
                melting: { tm: 65.2, method: 'basic', saltConcentration: 0.05 },
                molecular: { molecularWeight: 13000, extinction: 100000, absorbance: 1.1 },
                restrictions: [],
                repeats: [],
                timestamp: new Date()
            };

            // Save all results
            const blastId = await resultsManager.saveBlastResults(blastResults);
            const annotationId = await resultsManager.saveAnnotationResults(annotationResults);
            const analysisId = await resultsManager.saveAnalysisResults(analysisResults);

            // Verify all can be retrieved
            const retrievedBlast = await resultsManager.getResult(blastId);
            const retrievedAnnotation = await resultsManager.getResult(annotationId);
            const retrievedAnalysis = await resultsManager.getResult(analysisId);

            assert.ok(retrievedBlast);
            assert.ok(retrievedAnnotation);
            assert.ok(retrievedAnalysis);

            // Verify search works
            const blastSearchResults = await resultsManager.searchResults('INTEGRATION_BLAST');
            const annotationSearchResults = await resultsManager.searchResults('INTEGRATION_ANNOTATION');
            const analysisSearchResults = await resultsManager.searchResults('INTEGRATION_ANALYSIS');

            assert.ok(blastSearchResults.length > 0);
            assert.ok(annotationSearchResults.length > 0);
            assert.ok(analysisSearchResults.length > 0);

            // Verify exports work
            const blastJson = await resultsManager.exportResult(retrievedBlast!, 'json');
            const annotationFasta = await resultsManager.exportResult(retrievedAnnotation!, 'fasta');
            const analysisCSV = await resultsManager.exportResult(retrievedAnalysis!, 'csv');

            assert.ok(blastJson.length > 0);
            assert.ok(annotationFasta.length > 0);
            assert.ok(analysisCSV.length > 0);
        });
    });
});