/**
 * VSIX Test Setup
 * Issue #47: VSIX Package Creation & Testing
 * 
 * Global setup for VSIX tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Global test configuration
global.VSIX_TEST_CONFIG = {
    timeout: 60000,
    retryAttempts: 2,
    cleanupAfterTests: true,
    projectRoot: path.resolve(__dirname, '../..'),
    reportsDir: path.resolve(__dirname, '../../reports/vsix')
};

// Create reports directory
beforeAll(() => {
    if (!fs.existsSync(global.VSIX_TEST_CONFIG.reportsDir)) {
        fs.mkdirSync(global.VSIX_TEST_CONFIG.reportsDir, { recursive: true });
    }
});

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in VSIX tests:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in VSIX tests:', reason);
});

// Helper functions available to all tests
global.vsixTestHelpers = {
    /**
     * Find the latest VSIX file in the project
     */
    findLatestVSIX: () => {
        const projectRoot = global.VSIX_TEST_CONFIG.projectRoot;
        const vsixFiles = fs.readdirSync(projectRoot)
            .filter(file => file.endsWith('.vsix'))
            .map(file => ({
                file,
                path: path.join(projectRoot, file),
                mtime: fs.statSync(path.join(projectRoot, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        return vsixFiles.length > 0 ? vsixFiles[0].path : null;
    },

    /**
     * Check if VSCode CLI is available
     */
    isVSCodeAvailable: () => {
        try {
            execSync('code --version', { stdio: 'pipe' });
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get extension ID from VSIX
     */
    getExtensionId: (vsixPath) => {
        if (!fs.existsSync(vsixPath)) {
            throw new Error(`VSIX file not found: ${vsixPath}`);
        }

        const tempDir = require('os').tmpdir();
        const extractDir = path.join(tempDir, 'vsix-id-extract-' + Date.now());
        
        execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
        
        const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        // Cleanup
        fs.rmSync(extractDir, { recursive: true, force: true });
        
        return extensionId;
    },

    /**
     * Wait for a specified amount of time
     */
    wait: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry a function with exponential backoff
     */
    retry: async (fn, maxAttempts = 3, delay = 1000) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await global.vsixTestHelpers.wait(delay * Math.pow(2, attempt - 1));
            }
        }
    },

    /**
     * Clean up VSCode extension installation
     */
    cleanupExtension: (extensionId) => {
        try {
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
        } catch (error) {
            // Ignore errors if extension is not installed
        }
    }
};

// Global cleanup after all tests
afterAll(() => {
    if (global.VSIX_TEST_CONFIG.cleanupAfterTests) {
        console.log('Running global VSIX test cleanup...');
        
        // Clean up any temporary files
        const tempPattern = path.join(require('os').tmpdir(), 'vsix-*');
        try {
            execSync(`rm -rf ${tempPattern}`, { stdio: 'pipe' });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
});