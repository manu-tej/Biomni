import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

/**
 * Test runner for genomics tools
 */
export function runGenomicsTests(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create the mocha test instance
        const mocha = new Mocha({
            ui: 'tdd',
            color: true,
            timeout: 30000, // 30 second timeout for genomics operations
            reporter: 'spec'
        });

        const testsRoot = path.resolve(__dirname, 'genomics');

        // Add test files
        const testFiles = [
            'blastTool.test.js',
            'annotationTool.test.js',
            'sequenceAnalysis.test.js',
            'resultsManager.test.js',
            'exportFormats.test.js'
        ];

        testFiles.forEach(file => {
            const testPath = path.join(testsRoot, file);
            mocha.addFile(testPath);
        });

        try {
            // Run the tests
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

// If run directly
if (require.main === module) {
    runGenomicsTests()
        .then(() => {
            console.log('✅ All genomics tests passed!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Genomics tests failed:', err);
            process.exit(1);
        });
}