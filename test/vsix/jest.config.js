/**
 * Jest Configuration for VSIX Tests
 * Issue #47: VSIX Package Creation & Testing
 */

module.exports = {
    displayName: 'VSIX Tests',
    rootDir: '../../',
    testMatch: [
        '<rootDir>/test/vsix/**/*.test.js'
    ],
    testEnvironment: 'node',
    testTimeout: 60000, // 60 seconds for installation tests
    setupFilesAfterEnv: [
        '<rootDir>/test/vsix/setup.js'
    ],
    collectCoverageFrom: [
        'scripts/build-vsix.sh',
        'scripts/validate-vsix.js',
        'scripts/test-vsix-install.sh'
    ],
    coverageDirectory: '<rootDir>/reports/vsix/coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],
    reporters: [
        'default',
        ['jest-html-reporters', {
            publicPath: '<rootDir>/reports/vsix',
            filename: 'test-report.html',
            pageTitle: 'VSIX Test Report',
            expand: true,
            hideIcon: false,
            testCommand: 'npm run test:vsix'
        }]
    ],
    verbose: true,
    bail: false, // Continue running tests even if some fail
    maxWorkers: 1, // Run tests sequentially for VSCode installation tests
    forceExit: true,
    detectOpenHandles: true,
    globals: {
        'vsix-test-config': {
            timeout: 60000,
            retryAttempts: 2,
            cleanupAfterTests: true
        }
    }
};