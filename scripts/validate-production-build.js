#!/usr/bin/env node

/**
 * Post-Build Validation Tool
 * Stream F: Production Build Pipeline & Testing
 * 
 * Comprehensive validation of production build output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUILD_CONFIG_PATH = path.join(PROJECT_ROOT, 'build.config.js');
const DIST_PATH = path.join(PROJECT_ROOT, 'dist');
const PACKAGES_PATH = path.join(PROJECT_ROOT, 'packages');
const REPORTS_PATH = path.join(PROJECT_ROOT, 'reports');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.reset;
    console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`);
}

/**
 * Validation result structure
 */
class ValidationResult {
    constructor() {
        this.passed = [];
        this.warnings = [];
        this.errors = [];
        this.metrics = {};
    }
    
    addPassed(test, details = '') {
        this.passed.push({ test, details });
        log('info', `✅ ${test}${details ? ': ' + details : ''}`);
    }
    
    addWarning(test, message) {
        this.warnings.push({ test, message });
        log('warn', `⚠️  ${test}: ${message}`);
    }
    
    addError(test, message) {
        this.errors.push({ test, message });
        log('error', `❌ ${test}: ${message}`);
    }
    
    addMetric(name, value, unit = '') {
        this.metrics[name] = { value, unit };
        log('info', `📊 ${name}: ${value}${unit}`);
    }
    
    isValid() {
        return this.errors.length === 0;
    }
    
    getSummary() {
        return {
            passed: this.passed.length,
            warnings: this.warnings.length,
            errors: this.errors.length,
            metrics: this.metrics,
            valid: this.isValid()
        };
    }
}

/**
 * File System Validation
 */
function validateFileSystem(result) {
    log('info', 'Validating file system structure...');
    
    // Check dist directory
    if (!fs.existsSync(DIST_PATH)) {
        result.addError('dist-directory', 'dist directory does not exist');
        return;
    }
    
    // Check main bundle
    const bundlePath = path.join(DIST_PATH, 'extension.js');
    if (!fs.existsSync(bundlePath)) {
        result.addError('main-bundle', 'extension.js not found in dist directory');
        return;
    }
    
    const bundleStats = fs.statSync(bundlePath);
    result.addMetric('bundle-size', Math.round(bundleStats.size / 1024), 'KB');
    result.addPassed('main-bundle', `${Math.round(bundleStats.size / 1024)}KB`);
    
    // Check source map
    const sourcemapPath = path.join(DIST_PATH, 'extension.js.map');
    if (fs.existsSync(sourcemapPath)) {
        result.addPassed('source-map', 'Source map generated');
    } else {
        result.addWarning('source-map', 'Source map not found');
    }
    
    // Check packages directory
    if (fs.existsSync(PACKAGES_PATH)) {
        const vsixFiles = fs.readdirSync(PACKAGES_PATH).filter(f => f.endsWith('.vsix'));
        if (vsixFiles.length > 0) {
            const vsixPath = path.join(PACKAGES_PATH, vsixFiles[0]);
            const vsixStats = fs.statSync(vsixPath);
            result.addMetric('vsix-size', Math.round(vsixStats.size / 1024), 'KB');
            result.addPassed('vsix-package', `${vsixFiles[0]} (${Math.round(vsixStats.size / 1024)}KB)`);
        } else {
            result.addWarning('vsix-package', 'No VSIX files found');
        }
    }
    
    // Check reports directory
    if (!fs.existsSync(REPORTS_PATH)) {
        result.addWarning('reports', 'Reports directory not found');
    } else {
        result.addPassed('reports', 'Reports directory exists');
    }
}

/**
 * Bundle Content Validation
 */
function validateBundleContent(result) {
    log('info', 'Validating bundle content...');
    
    const bundlePath = path.join(DIST_PATH, 'extension.js');
    if (!fs.existsSync(bundlePath)) {
        result.addError('bundle-content', 'Bundle file not found');
        return;
    }
    
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const bundleSize = bundleContent.length;
    
    // Check minification
    const lines = bundleContent.split('\n');
    const avgLineLength = bundleSize / lines.length;
    if (avgLineLength > 100) {
        result.addPassed('minification', `Average line length: ${Math.round(avgLineLength)}`);
    } else {
        result.addWarning('minification', 'Bundle may not be properly minified');
    }
    
    // Check for console.log removal
    const consoleLogCount = (bundleContent.match(/console\.log/g) || []).length;
    if (consoleLogCount === 0) {
        result.addPassed('console-removal', 'Console.log statements removed');
    } else {
        result.addWarning('console-removal', `${consoleLogCount} console.log statements found`);
    }
    
    // Check for debugger removal
    if (!bundleContent.includes('debugger')) {
        result.addPassed('debugger-removal', 'Debugger statements removed');
    } else {
        result.addWarning('debugger-removal', 'Debugger statements found in production bundle');
    }
    
    // Check for test code
    const testPatterns = [/\.test\./, /\.spec\./, /describe\s*\(/, /it\s*\(/, /expect\s*\(/];
    const testCode = testPatterns.some(pattern => pattern.test(bundleContent));
    if (!testCode) {
        result.addPassed('test-code-removal', 'Test code properly excluded');
    } else {
        result.addWarning('test-code-removal', 'Test code may be included in bundle');
    }
    
    // Check external dependencies
    const vscodeBundled = bundleContent.includes('vscode/lib/vscode');
    if (!vscodeBundled) {
        result.addPassed('vscode-external', 'VSCode API properly externalized');
    } else {
        result.addError('vscode-external', 'VSCode API appears to be bundled');
    }
}

/**
 * Bundle Size Validation
 */
function validateBundleSize(result) {
    log('info', 'Validating bundle size limits...');
    
    const buildConfig = require(BUILD_CONFIG_PATH);
    const config = buildConfig.getBuildConfig('production');
    
    const bundlePath = path.join(DIST_PATH, 'extension.js');
    if (!fs.existsSync(bundlePath)) {
        result.addError('size-check', 'Bundle file not found');
        return;
    }
    
    const bundleStats = fs.statSync(bundlePath);
    const bundleSize = bundleStats.size;
    
    // Check against VSCode limit
    if (bundleSize < config.limits.maxBundleSize) {
        const percentage = (bundleSize / config.limits.maxBundleSize * 100).toFixed(1);
        result.addPassed('size-limit', `${percentage}% of VSCode limit`);
    } else {
        result.addError('size-limit', `Bundle exceeds VSCode limit: ${bundleSize} bytes`);
    }
    
    // Check against warning threshold
    if (bundleSize < config.limits.bundleSizeWarning) {
        result.addPassed('size-warning', 'Under warning threshold');
    } else {
        result.addWarning('size-warning', 'Approaching size limit');
    }
}

/**
 * Source Map Validation
 */
function validateSourceMap(result) {
    log('info', 'Validating source map...');
    
    const sourcemapPath = path.join(DIST_PATH, 'extension.js.map');
    if (!fs.existsSync(sourcemapPath)) {
        result.addWarning('sourcemap', 'Source map file not found');
        return;
    }
    
    try {
        const sourcemapContent = fs.readFileSync(sourcemapPath, 'utf8');
        const sourcemap = JSON.parse(sourcemapContent);
        
        // Validate sourcemap structure
        if (sourcemap.version === 3) {
            result.addPassed('sourcemap-version', 'Valid source map version 3');
        } else {
            result.addError('sourcemap-version', `Invalid source map version: ${sourcemap.version}`);
        }
        
        if (sourcemap.sources && sourcemap.sources.length > 0) {
            result.addPassed('sourcemap-sources', `${sourcemap.sources.length} source files mapped`);
        } else {
            result.addError('sourcemap-sources', 'No source files in source map');
        }
        
        if (sourcemap.mappings && sourcemap.mappings.length > 0) {
            result.addPassed('sourcemap-mappings', 'Source mappings present');
        } else {
            result.addError('sourcemap-mappings', 'No source mappings found');
        }
        
    } catch (error) {
        result.addError('sourcemap-parse', `Source map parsing failed: ${error.message}`);
    }
}

/**
 * VSIX Package Validation
 */
function validateVSIXPackage(result) {
    log('info', 'Validating VSIX package...');
    
    if (!fs.existsSync(PACKAGES_PATH)) {
        result.addWarning('vsix', 'Packages directory not found');
        return;
    }
    
    const vsixFiles = fs.readdirSync(PACKAGES_PATH).filter(f => f.endsWith('.vsix'));
    if (vsixFiles.length === 0) {
        result.addWarning('vsix', 'No VSIX files found');
        return;
    }
    
    const vsixPath = path.join(PACKAGES_PATH, vsixFiles[0]);
    
    // Check VSIX size
    const vsixStats = fs.statSync(vsixPath);
    const vsixSizeMB = vsixStats.size / (1024 * 1024);
    
    if (vsixSizeMB < 100) { // Reasonable limit
        result.addPassed('vsix-size', `${vsixSizeMB.toFixed(2)}MB`);
    } else {
        result.addWarning('vsix-size', `Large VSIX package: ${vsixSizeMB.toFixed(2)}MB`);
    }
    
    // Try to validate VSIX structure
    try {
        const tempDir = path.join(PROJECT_ROOT, 'temp-vsix-validation');
        
        // Clean up any existing temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        
        fs.mkdirSync(tempDir);
        
        // Extract VSIX (it's a ZIP file)
        try {
            execSync(`cd "${tempDir}" && unzip -q "${vsixPath}"`);
            
            // Check for required files
            const extensionDir = path.join(tempDir, 'extension');
            if (fs.existsSync(extensionDir)) {
                result.addPassed('vsix-structure', 'Valid VSIX structure');
                
                // Check manifest
                const manifestPath = path.join(extensionDir, 'package.json');
                if (fs.existsSync(manifestPath)) {
                    result.addPassed('vsix-manifest', 'Manifest present');
                } else {
                    result.addError('vsix-manifest', 'No manifest in VSIX');
                }
                
                // Check bundle
                const bundleInVsix = path.join(extensionDir, 'dist', 'extension.js');
                if (fs.existsSync(bundleInVsix)) {
                    result.addPassed('vsix-bundle', 'Bundle included in VSIX');
                } else {
                    result.addError('vsix-bundle', 'Bundle not found in VSIX');
                }
            } else {
                result.addError('vsix-structure', 'Invalid VSIX structure');
            }
            
        } catch (unzipError) {
            result.addWarning('vsix-validation', 'Could not extract VSIX for validation');
        }
        
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        
    } catch (error) {
        result.addWarning('vsix-validation', `VSIX validation failed: ${error.message}`);
    }
}

/**
 * Security Validation
 */
function validateSecurity(result) {
    log('info', 'Validating security aspects...');
    
    const bundlePath = path.join(DIST_PATH, 'extension.js');
    if (!fs.existsSync(bundlePath)) {
        result.addError('security', 'Bundle file not found');
        return;
    }
    
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Check for sensitive patterns
    const sensitivePatterns = [
        { name: 'passwords', pattern: /password\s*[:=]\s*["'][^"']+["']/gi },
        { name: 'api-keys', pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi },
        { name: 'secrets', pattern: /secret\s*[:=]\s*["'][^"']+["']/gi },
        { name: 'tokens', pattern: /token\s*[:=]\s*["'][^"']+["']/gi }
    ];
    
    let securityIssues = 0;
    sensitivePatterns.forEach(({ name, pattern }) => {
        const matches = bundleContent.match(pattern);
        if (matches && matches.length > 0) {
            result.addError('security-sensitive', `Potential ${name} found in bundle`);
            securityIssues++;
        }
    });
    
    if (securityIssues === 0) {
        result.addPassed('security-sensitive', 'No sensitive information detected');
    }
    
    // Check for file system paths
    const pathPatterns = [
        /\/Users\/[^"'\s]+/g,
        /C:\\Users\\[^"'\s]+/g,
        /\/home\/[^"'\s]+/g
    ];
    
    let pathLeaks = 0;
    pathPatterns.forEach(pattern => {
        const matches = bundleContent.match(pattern);
        if (matches && matches.length > 0) {
            pathLeaks += matches.length;
        }
    });
    
    if (pathLeaks === 0) {
        result.addPassed('security-paths', 'No file system paths leaked');
    } else {
        result.addWarning('security-paths', `${pathLeaks} potential file system path leaks`);
    }
}

/**
 * Performance Validation
 */
function validatePerformance(result) {
    log('info', 'Validating performance metrics...');
    
    const buildConfig = require(BUILD_CONFIG_PATH);
    const config = buildConfig.getBuildConfig('production');
    
    // Check build performance report
    const performancePath = path.join(REPORTS_PATH, 'build-performance.csv');
    if (fs.existsSync(performancePath)) {
        const csv = fs.readFileSync(performancePath, 'utf8');
        const lines = csv.split('\n').filter(l => l.trim());
        
        let totalBuildTime = 0;
        for (let i = 1; i < lines.length; i++) {
            const [stage, duration] = lines[i].split(',');
            if (stage && duration) {
                const time = parseFloat(duration);
                totalBuildTime += time;
                
                // Check individual stage times
                if (time > 30) { // 30s threshold for individual stages
                    result.addWarning('performance-stage', `${stage} took ${time}s`);
                }
            }
        }
        
        result.addMetric('build-time', totalBuildTime, 's');
        
        // Check against build time limits
        if (totalBuildTime < config.limits.maxBuildTime / 1000) {
            result.addPassed('performance-build-time', `${totalBuildTime}s (under ${config.limits.maxBuildTime / 1000}s limit)`);
        } else {
            result.addWarning('performance-build-time', `Build time ${totalBuildTime}s exceeds ${config.limits.maxBuildTime / 1000}s limit`);
        }
        
    } else {
        result.addWarning('performance', 'No performance data available');
    }
}

/**
 * Bundle Analysis Validation
 */
function validateBundleAnalysis(result) {
    log('info', 'Validating bundle analysis...');
    
    const analysisPath = path.join(REPORTS_PATH, 'bundle', 'bundle-analysis.html');
    if (fs.existsSync(analysisPath)) {
        result.addPassed('bundle-analysis', 'Bundle analysis report generated');
    } else {
        result.addWarning('bundle-analysis', 'No bundle analysis report found');
    }
    
    const statsPath = path.join(REPORTS_PATH, 'bundle', 'stats.json');
    if (fs.existsSync(statsPath)) {
        try {
            const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            
            if (stats.assets && stats.assets.length > 0) {
                result.addPassed('bundle-stats', `${stats.assets.length} assets analyzed`);
            }
            
            if (stats.modules && stats.modules.length > 0) {
                result.addMetric('module-count', stats.modules.length);
            }
            
            // Check for duplicate modules
            if (stats.modules) {
                const moduleNames = stats.modules.map(m => m.name).filter(Boolean);
                const uniqueNames = new Set(moduleNames);
                const duplicates = moduleNames.length - uniqueNames.size;
                
                if (duplicates === 0) {
                    result.addPassed('bundle-duplicates', 'No duplicate modules detected');
                } else {
                    result.addWarning('bundle-duplicates', `${duplicates} potential duplicate modules`);
                }
            }
            
        } catch (error) {
            result.addError('bundle-stats', `Failed to parse stats: ${error.message}`);
        }
    } else {
        result.addWarning('bundle-stats', 'No bundle stats JSON found');
    }
}

/**
 * Generate Validation Report
 */
function generateReport(result) {
    log('info', 'Generating validation report...');
    
    const reportPath = path.join(REPORTS_PATH, 'validation-report.json');
    const summaryPath = path.join(REPORTS_PATH, 'validation-summary.txt');
    
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_PATH)) {
        fs.mkdirSync(REPORTS_PATH, { recursive: true });
    }
    
    // Generate detailed JSON report
    const report = {
        timestamp: new Date().toISOString(),
        summary: result.getSummary(),
        details: {
            passed: result.passed,
            warnings: result.warnings,
            errors: result.errors
        },
        metrics: result.metrics
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    let summary = 'Production Build Validation Summary\n';
    summary += '=====================================\n\n';
    summary += `Timestamp: ${report.timestamp}\n`;
    summary += `Status: ${result.isValid() ? 'PASSED' : 'FAILED'}\n\n`;
    summary += `Tests Passed: ${result.passed.length}\n`;
    summary += `Warnings: ${result.warnings.length}\n`;
    summary += `Errors: ${result.errors.length}\n\n`;
    
    if (Object.keys(result.metrics).length > 0) {
        summary += 'Metrics:\n';
        Object.entries(result.metrics).forEach(([name, { value, unit }]) => {
            summary += `  ${name}: ${value}${unit}\n`;
        });
        summary += '\n';
    }
    
    if (result.errors.length > 0) {
        summary += 'Errors:\n';
        result.errors.forEach(error => {
            summary += `  ❌ ${error.test}: ${error.message}\n`;
        });
        summary += '\n';
    }
    
    if (result.warnings.length > 0) {
        summary += 'Warnings:\n';
        result.warnings.forEach(warning => {
            summary += `  ⚠️  ${warning.test}: ${warning.message}\n`;
        });
        summary += '\n';
    }
    
    summary += 'Passed Tests:\n';
    result.passed.forEach(test => {
        summary += `  ✅ ${test.test}${test.details ? ': ' + test.details : ''}\n`;
    });
    
    fs.writeFileSync(summaryPath, summary);
    
    log('info', `Validation report saved to: ${reportPath}`);
    log('info', `Validation summary saved to: ${summaryPath}`);
    
    return report;
}

/**
 * Main validation function
 */
async function validateProduction() {
    console.log('🔍 Starting Production Build Validation...\n');
    
    const result = new ValidationResult();
    const startTime = Date.now();
    
    try {
        // Run all validations
        validateFileSystem(result);
        validateBundleContent(result);
        validateBundleSize(result);
        validateSourceMap(result);
        validateVSIXPackage(result);
        validateSecurity(result);
        validatePerformance(result);
        validateBundleAnalysis(result);
        
        // Generate report
        const report = generateReport(result);
        
        const endTime = Date.now();
        const validationTime = (endTime - startTime) / 1000;
        
        console.log('\n📊 Validation Complete');
        console.log('======================');
        console.log(`Time: ${validationTime.toFixed(2)}s`);
        console.log(`Status: ${result.isValid() ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Tests: ${result.passed.length} passed, ${result.warnings.length} warnings, ${result.errors.length} errors`);
        
        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(warning => {
                console.log(`  - ${warning.test}: ${warning.message}`);
            });
        }
        
        if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.message}`);
            });
        }
        
        // Exit with appropriate code
        process.exit(result.isValid() ? 0 : 1);
        
    } catch (error) {
        log('error', `Validation failed with exception: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run validation if called directly
if (require.main === module) {
    validateProduction();
}

module.exports = {
    validateProduction,
    ValidationResult
};