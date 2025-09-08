#!/usr/bin/env node

/**
 * Bundle Analyzer Script for VSCode Extension
 * 
 * This script provides comprehensive bundle analysis capabilities including:
 * - Size tracking and comparison
 * - Visual bundle analysis
 * - Automated size limit validation
 * - Report generation for CI/CD
 * - Bundle composition metrics
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.distPath = path.join(this.projectRoot, 'dist');
        this.reportsDir = path.join(this.projectRoot, 'reports', 'bundle');
        this.configPath = path.join(this.projectRoot, 'webpack.config.js');
        this.sizeLimits = {
            totalSize: 5 * 1024 * 1024, // 5MB limit from requirements
            mainBundle: 3 * 1024 * 1024, // 3MB for main bundle
            vendorBundle: 2 * 1024 * 1024 // 2MB for vendor bundle
        };
    }

    /**
     * Main analysis entry point
     */
    async analyze(options = {}) {
        const {
            visual = false,
            compare = false,
            report = true,
            validate = true,
            output = 'console'
        } = options;

        console.log('🔍 Starting bundle analysis...\n');

        try {
            // Ensure reports directory exists
            await this.ensureReportsDirectory();

            // Build the project first if needed
            if (!await this.bundleExists()) {
                console.log('📦 Bundle not found, building project...');
                await this.buildProject();
            }

            // Collect bundle metrics
            const metrics = await this.collectMetrics();
            
            // Generate visual analysis if requested
            if (visual) {
                await this.generateVisualAnalysis();
            }

            // Compare with previous analysis if requested
            let comparison = null;
            if (compare) {
                comparison = await this.compareWithPrevious(metrics);
            }

            // Generate reports
            if (report) {
                await this.generateReport(metrics, comparison);
            }

            // Validate size limits
            if (validate) {
                await this.validateSizeLimits(metrics);
            }

            // Output results
            this.outputResults(metrics, comparison, output);

            return { success: true, metrics, comparison };

        } catch (error) {
            console.error('❌ Bundle analysis failed:', error.message);
            if (options.verbose) {
                console.error(error.stack);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Ensure reports directory structure exists
     */
    async ensureReportsDirectory() {
        try {
            await fs.access(this.reportsDir);
        } catch {
            await fs.mkdir(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Check if bundle exists
     */
    async bundleExists() {
        try {
            await fs.access(path.join(this.distPath, 'extension.js'));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Build the project
     */
    async buildProject() {
        try {
            execSync('npm run build', { 
                cwd: this.projectRoot, 
                stdio: 'inherit' 
            });
        } catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }

    /**
     * Collect bundle metrics
     */
    async collectMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            files: {},
            totalSize: 0,
            gzippedSize: 0,
            moduleBreakdown: [],
            dependencies: {}
        };

        try {
            // Analyze all files in dist directory
            const files = await fs.readdir(this.distPath);
            
            for (const file of files) {
                const filePath = path.join(this.distPath, file);
                const stat = await fs.stat(filePath);
                
                if (stat.isFile()) {
                    const size = stat.size;
                    const gzippedSize = await this.getGzippedSize(filePath);
                    
                    metrics.files[file] = {
                        size,
                        gzippedSize,
                        path: filePath,
                        percentage: 0 // Will calculate after total
                    };
                    
                    metrics.totalSize += size;
                    metrics.gzippedSize += gzippedSize;
                }
            }

            // Calculate percentages
            Object.keys(metrics.files).forEach(file => {
                metrics.files[file].percentage = 
                    (metrics.files[file].size / metrics.totalSize * 100);
            });

            // Analyze dependencies
            metrics.dependencies = await this.analyzeDependencies();

            // Get module breakdown from webpack stats if available
            metrics.moduleBreakdown = await this.getModuleBreakdown();

            return metrics;

        } catch (error) {
            throw new Error(`Failed to collect metrics: ${error.message}`);
        }
    }

    /**
     * Calculate gzipped size of a file
     */
    async getGzippedSize(filePath) {
        try {
            const zlib = require('zlib');
            const content = await fs.readFile(filePath);
            const gzipped = zlib.gzipSync(content);
            return gzipped.length;
        } catch {
            return 0;
        }
    }

    /**
     * Analyze dependencies from package.json
     */
    async analyzeDependencies() {
        try {
            const packageJson = JSON.parse(
                await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8')
            );
            
            return {
                production: Object.keys(packageJson.dependencies || {}),
                development: Object.keys(packageJson.devDependencies || {}),
                total: Object.keys({
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                }).length
            };
        } catch {
            return { production: [], development: [], total: 0 };
        }
    }

    /**
     * Get module breakdown from webpack stats
     */
    async getModuleBreakdown() {
        try {
            // Generate webpack stats
            execSync('npx webpack --json > webpack-stats.json', { 
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            const statsPath = path.join(this.projectRoot, 'webpack-stats.json');
            const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
            
            // Clean up stats file
            await fs.unlink(statsPath);

            // Extract module information
            const modules = stats.modules || [];
            return modules.map(module => ({
                name: this.cleanModuleName(module.name),
                size: module.size || 0,
                chunks: module.chunks || []
            })).filter(module => module.size > 0)
              .sort((a, b) => b.size - a.size)
              .slice(0, 20); // Top 20 modules

        } catch {
            return [];
        }
    }

    /**
     * Clean module name for better readability
     */
    cleanModuleName(name) {
        return name
            .replace(/^\.\//, '')
            .replace(/\?.*$/, '')
            .replace(/node_modules\/([^\/]+).*/, '$1');
    }

    /**
     * Generate visual analysis using webpack-bundle-analyzer
     */
    async generateVisualAnalysis() {
        try {
            console.log('📊 Generating visual bundle analysis...');
            
            // Create temporary webpack config for analysis
            const analyzerConfig = this.createAnalyzerConfig();
            const tempConfigPath = path.join(this.projectRoot, 'webpack.analyzer.config.js');
            
            await fs.writeFile(tempConfigPath, analyzerConfig);
            
            // Run webpack with analyzer plugin
            execSync(`npx webpack --config ${tempConfigPath}`, {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });
            
            // Clean up temporary config
            await fs.unlink(tempConfigPath);
            
            console.log('✅ Visual analysis complete. Check reports/bundle/ directory.');
            
        } catch (error) {
            console.warn('⚠️ Visual analysis failed:', error.message);
        }
    }

    /**
     * Create webpack config with analyzer plugin
     */
    createAnalyzerConfig() {
        return `
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const baseConfig = require('./webpack.config.js');

module.exports = {
    ...baseConfig,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: './reports/bundle/bundle-report.html',
            generateStatsFile: true,
            statsFilename: './reports/bundle/bundle-stats.json'
        })
    ]
};
        `;
    }

    /**
     * Compare metrics with previous analysis
     */
    async compareWithPrevious(currentMetrics) {
        try {
            const historyPath = path.join(this.reportsDir, 'history.json');
            let history = [];
            
            try {
                const historyData = await fs.readFile(historyPath, 'utf8');
                history = JSON.parse(historyData);
            } catch {
                // No previous history
            }

            if (history.length === 0) {
                console.log('📈 No previous analysis found for comparison.');
                return null;
            }

            const previous = history[history.length - 1];
            const comparison = {
                sizeDifference: currentMetrics.totalSize - previous.totalSize,
                sizeChangePercent: ((currentMetrics.totalSize - previous.totalSize) / previous.totalSize * 100),
                gzippedSizeDifference: currentMetrics.gzippedSize - previous.gzippedSize,
                fileChanges: this.compareFiles(currentMetrics.files, previous.files)
            };

            return comparison;

        } catch (error) {
            console.warn('⚠️ Comparison failed:', error.message);
            return null;
        }
    }

    /**
     * Compare file changes between analyses
     */
    compareFiles(current, previous) {
        const changes = {};
        
        // Check for size changes in existing files
        Object.keys(current).forEach(file => {
            if (previous[file]) {
                const sizeDiff = current[file].size - previous[file].size;
                if (sizeDiff !== 0) {
                    changes[file] = {
                        type: 'modified',
                        sizeDifference: sizeDiff,
                        changePercent: (sizeDiff / previous[file].size * 100)
                    };
                }
            } else {
                changes[file] = {
                    type: 'added',
                    size: current[file].size
                };
            }
        });

        // Check for removed files
        Object.keys(previous || {}).forEach(file => {
            if (!current[file]) {
                changes[file] = {
                    type: 'removed',
                    size: previous[file].size
                };
            }
        });

        return changes;
    }

    /**
     * Generate comprehensive report
     */
    async generateReport(metrics, comparison) {
        console.log('📝 Generating bundle analysis report...');

        // Save to history
        await this.saveToHistory(metrics);

        // Generate JSON report
        await this.generateJsonReport(metrics, comparison);

        // Generate human-readable report
        await this.generateTextReport(metrics, comparison);

        console.log('✅ Reports generated successfully.');
    }

    /**
     * Save metrics to history
     */
    async saveToHistory(metrics) {
        const historyPath = path.join(this.reportsDir, 'history.json');
        let history = [];
        
        try {
            const historyData = await fs.readFile(historyPath, 'utf8');
            history = JSON.parse(historyData);
        } catch {
            // New history file
        }

        history.push(metrics);
        
        // Keep only last 10 analyses
        if (history.length > 10) {
            history = history.slice(-10);
        }

        await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    }

    /**
     * Generate JSON report for CI/CD integration
     */
    async generateJsonReport(metrics, comparison) {
        const report = {
            timestamp: metrics.timestamp,
            summary: {
                totalSize: metrics.totalSize,
                gzippedSize: metrics.gzippedSize,
                fileCount: Object.keys(metrics.files).length,
                moduleCount: metrics.moduleBreakdown.length
            },
            files: metrics.files,
            modules: metrics.moduleBreakdown,
            dependencies: metrics.dependencies,
            comparison: comparison,
            limits: this.sizeLimits,
            status: this.getValidationStatus(metrics)
        };

        const reportPath = path.join(this.reportsDir, 'latest-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    }

    /**
     * Generate human-readable text report
     */
    async generateTextReport(metrics, comparison) {
        const report = this.formatTextReport(metrics, comparison);
        const reportPath = path.join(this.reportsDir, 'latest-report.txt');
        await fs.writeFile(reportPath, report);
    }

    /**
     * Format text report
     */
    formatTextReport(metrics, comparison) {
        let report = `
# Bundle Analysis Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Size: ${this.formatSize(metrics.totalSize)}
- Gzipped Size: ${this.formatSize(metrics.gzippedSize)}
- Compression Ratio: ${((1 - metrics.gzippedSize / metrics.totalSize) * 100).toFixed(1)}%
- File Count: ${Object.keys(metrics.files).length}
- Module Count: ${metrics.moduleBreakdown.length}

## Size Breakdown
`;

        // File breakdown
        Object.entries(metrics.files)
            .sort(([,a], [,b]) => b.size - a.size)
            .forEach(([file, data]) => {
                report += `- ${file}: ${this.formatSize(data.size)} (${data.percentage.toFixed(1)}%)\n`;
            });

        // Top modules
        if (metrics.moduleBreakdown.length > 0) {
            report += `\n## Top Modules\n`;
            metrics.moduleBreakdown.slice(0, 10).forEach(module => {
                report += `- ${module.name}: ${this.formatSize(module.size)}\n`;
            });
        }

        // Dependencies
        report += `\n## Dependencies
- Production: ${metrics.dependencies.production.length}
- Development: ${metrics.dependencies.development.length}
- Total: ${metrics.dependencies.total}
`;

        // Comparison
        if (comparison) {
            report += `\n## Changes from Previous Analysis
- Size Change: ${this.formatSizeDifference(comparison.sizeDifference)} (${comparison.sizeChangePercent.toFixed(1)}%)
- Gzipped Change: ${this.formatSizeDifference(comparison.gzippedSizeDifference)}
`;

            if (Object.keys(comparison.fileChanges).length > 0) {
                report += `\n### File Changes:\n`;
                Object.entries(comparison.fileChanges).forEach(([file, change]) => {
                    if (change.type === 'modified') {
                        report += `- ${file}: ${this.formatSizeDifference(change.sizeDifference)} (${change.changePercent.toFixed(1)}%)\n`;
                    } else if (change.type === 'added') {
                        report += `- ${file}: Added (${this.formatSize(change.size)})\n`;
                    } else {
                        report += `- ${file}: Removed (${this.formatSize(change.size)})\n`;
                    }
                });
            }
        }

        // Validation status
        const status = this.getValidationStatus(metrics);
        report += `\n## Validation Status
- Total Size Limit: ${status.totalSize ? '✅ PASS' : '❌ FAIL'} (${this.formatSize(metrics.totalSize)} / ${this.formatSize(this.sizeLimits.totalSize)})
- Overall Status: ${status.overall ? '✅ PASS' : '❌ FAIL'}
`;

        return report;
    }

    /**
     * Validate bundle against size limits
     */
    async validateSizeLimits(metrics) {
        console.log('\n📏 Validating bundle size limits...');
        
        const status = this.getValidationStatus(metrics);
        
        if (status.overall) {
            console.log('✅ All size limits passed!');
        } else {
            console.log('❌ Size limit validation failed:');
            if (!status.totalSize) {
                console.log(`  - Total size: ${this.formatSize(metrics.totalSize)} exceeds limit of ${this.formatSize(this.sizeLimits.totalSize)}`);
            }
        }

        return status;
    }

    /**
     * Get validation status
     */
    getValidationStatus(metrics) {
        const totalSizeOk = metrics.totalSize <= this.sizeLimits.totalSize;
        
        return {
            totalSize: totalSizeOk,
            overall: totalSizeOk
        };
    }

    /**
     * Output results to console or file
     */
    outputResults(metrics, comparison, output) {
        if (output === 'console' || output === 'both') {
            this.printConsoleResults(metrics, comparison);
        }
        
        if (output === 'file' || output === 'both') {
            console.log(`\n📄 Detailed reports saved to: ${this.reportsDir}`);
        }
    }

    /**
     * Print results to console
     */
    printConsoleResults(metrics, comparison) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 BUNDLE ANALYSIS RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\n📦 Bundle Summary:`);
        console.log(`  Total Size: ${this.formatSize(metrics.totalSize)}`);
        console.log(`  Gzipped: ${this.formatSize(metrics.gzippedSize)} (${((1 - metrics.gzippedSize / metrics.totalSize) * 100).toFixed(1)}% compression)`);
        console.log(`  Files: ${Object.keys(metrics.files).length}`);
        console.log(`  Modules: ${metrics.moduleBreakdown.length}`);

        // Top files
        console.log(`\n📁 Largest Files:`);
        Object.entries(metrics.files)
            .sort(([,a], [,b]) => b.size - a.size)
            .slice(0, 5)
            .forEach(([file, data], index) => {
                console.log(`  ${index + 1}. ${file}: ${this.formatSize(data.size)} (${data.percentage.toFixed(1)}%)`);
            });

        // Top modules
        if (metrics.moduleBreakdown.length > 0) {
            console.log(`\n📚 Largest Modules:`);
            metrics.moduleBreakdown.slice(0, 5).forEach((module, index) => {
                console.log(`  ${index + 1}. ${module.name}: ${this.formatSize(module.size)}`);
            });
        }

        // Comparison
        if (comparison) {
            console.log(`\n📈 Changes from Previous:`);
            console.log(`  Size: ${this.formatSizeDifference(comparison.sizeDifference)} (${comparison.sizeChangePercent.toFixed(1)}%)`);
            console.log(`  Gzipped: ${this.formatSizeDifference(comparison.gzippedSizeDifference)}`);
        }

        // Validation
        const status = this.getValidationStatus(metrics);
        console.log(`\n🎯 Validation:`);
        console.log(`  Size Limit: ${status.totalSize ? '✅ PASS' : '❌ FAIL'} (${this.formatSize(metrics.totalSize)} / ${this.formatSize(this.sizeLimits.totalSize)})`);
        
        console.log('\n' + '='.repeat(60));
    }

    /**
     * Format file size for display
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    /**
     * Format size difference for display
     */
    formatSizeDifference(bytes) {
        const sign = bytes >= 0 ? '+' : '';
        return `${sign}${this.formatSize(Math.abs(bytes))}`;
    }
}

// CLI Interface
if (require.main === module) {
    const analyzer = new BundleAnalyzer();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        visual: args.includes('--visual') || args.includes('-v'),
        compare: args.includes('--compare') || args.includes('-c'),
        report: !args.includes('--no-report'),
        validate: !args.includes('--no-validate'),
        output: args.includes('--quiet') ? 'file' : 'console',
        verbose: args.includes('--verbose')
    };

    // Show help
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Bundle Analyzer for VSCode Extension

Usage: node scripts/bundle-analyzer.js [options]

Options:
  -v, --visual       Generate visual bundle analysis (requires webpack-bundle-analyzer)
  -c, --compare      Compare with previous analysis
  --no-report        Skip generating reports
  --no-validate      Skip size limit validation
  --quiet            Only output to files, not console
  --verbose          Show detailed error information
  -h, --help         Show this help message

Examples:
  node scripts/bundle-analyzer.js                    # Basic analysis
  node scripts/bundle-analyzer.js --visual --compare # Visual analysis with comparison
  node scripts/bundle-analyzer.js --quiet            # Silent mode, only files
        `);
        process.exit(0);
    }

    // Run analysis
    analyzer.analyze(options).then(result => {
        if (!result.success) {
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 Unexpected error:', error.message);
        process.exit(1);
    });
}

module.exports = BundleAnalyzer;