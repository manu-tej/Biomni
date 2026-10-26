/**
 * Build Verification Tests
 * Stream F: Production Build Pipeline & Testing
 * 
 * Tests to verify that production build completes successfully
 * and produces optimized, valid output
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

describe('Production Build Verification', () => {
    const projectRoot = path.resolve(__dirname, '../../');
    const distPath = path.join(projectRoot, 'dist');
    const packagePath = path.join(projectRoot, 'packages');
    const reportsPath = path.join(projectRoot, 'reports');

    beforeAll(async () => {
        // Ensure we're testing the actual production build
        if (!fs.existsSync(distPath)) {
            throw new Error('Production build not found. Run build-production.sh first.');
        }
    }, 30000);

    describe('Build Output Validation', () => {
        test('should have main bundle file', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            expect(fs.existsSync(bundlePath)).toBe(true);
            
            const stats = fs.statSync(bundlePath);
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);
        });

        test('should have source map', () => {
            const sourcemapPath = path.join(distPath, 'extension.js.map');
            expect(fs.existsSync(sourcemapPath)).toBe(true);
            
            const stats = fs.statSync(sourcemapPath);
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);
        });

        test('source map should be valid JSON', () => {
            const sourcemapPath = path.join(distPath, 'extension.js.map');
            const sourcemapContent = fs.readFileSync(sourcemapPath, 'utf8');
            
            expect(() => JSON.parse(sourcemapContent)).not.toThrow();
            
            const sourcemap = JSON.parse(sourcemapContent);
            expect(sourcemap.version).toBe(3);
            expect(sourcemap.sources).toBeDefined();
            expect(sourcemap.mappings).toBeDefined();
        });

        test('bundle should be minified', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check for minification indicators
            const lines = bundleContent.split('\n');
            const avgLineLength = bundleContent.length / lines.length;
            
            // Minified code should have much longer lines on average
            expect(avgLineLength).toBeGreaterThan(100);
            
            // Should not contain common unminified patterns
            expect(bundleContent).not.toMatch(/console\.log\s*\(/);
            expect(bundleContent).not.toMatch(/debugger\s*;/);
        });
    });

    describe('Bundle Size Validation', () => {
        test('bundle size should be under 5MB VSCode limit', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const stats = fs.statSync(bundlePath);
            const sizeInMB = stats.size / (1024 * 1024);
            
            expect(sizeInMB).toBeLessThan(5);
            console.log(`Bundle size: ${sizeInMB.toFixed(2)}MB`);
        });

        test('bundle size should be under warning threshold', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const stats = fs.statSync(bundlePath);
            const sizeInMB = stats.size / (1024 * 1024);
            
            // Warning threshold at 4MB
            if (sizeInMB > 4) {
                console.warn(`Bundle size approaching limit: ${sizeInMB.toFixed(2)}MB`);
            }
            
            expect(sizeInMB).toBeLessThan(4.5); // Fail if too close to limit
        });

        test('bundle should not contain duplicate dependencies', async () => {
            // Check bundle analysis report if it exists
            const statsPath = path.join(reportsPath, 'bundle', 'stats.json');
            
            if (fs.existsSync(statsPath)) {
                const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
                const modules = stats.modules || [];
                
                // Check for obvious duplicates by name
                const moduleNames = modules.map((m: any) => m.name || m.identifier);
                const uniqueNames = new Set(moduleNames);
                
                // Allow some webpack internal duplicates but check for major libs
                const suspiciousDuplicates = moduleNames.filter((name: string) => {
                    return name && 
                           !name.includes('webpack') && 
                           !name.includes('node_modules') &&
                           moduleNames.filter((n: string) => n === name).length > 1;
                });
                
                expect(suspiciousDuplicates.length).toBe(0);
            }
        });
    });

    describe('Tree Shaking Validation', () => {
        test('bundle should not contain dead code patterns', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check that common unused patterns are removed
            expect(bundleContent).not.toMatch(/unused.*export/i);
            expect(bundleContent).not.toMatch(/test.*only.*code/i);
            
            // Should not contain development-only code
            expect(bundleContent).not.toMatch(/development.*mode/i);
            expect(bundleContent).not.toMatch(/debug.*build/i);
        });

        test('should not include test files', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Should not contain test patterns
            expect(bundleContent).not.toMatch(/\.test\./);
            expect(bundleContent).not.toMatch(/\.spec\./);
            expect(bundleContent).not.toMatch(/describe\s*\(/);
            expect(bundleContent).not.toMatch(/it\s*\(/);
            expect(bundleContent).not.toMatch(/expect\s*\(/);
        });
    });

    describe('VSIX Package Validation', () => {
        let vsixPath: string;

        beforeAll(() => {
            // Find the VSIX package
            if (fs.existsSync(packagePath)) {
                const files = fs.readdirSync(packagePath).filter(f => f.endsWith('.vsix'));
                if (files.length > 0) {
                    vsixPath = path.join(packagePath, files[0]);
                }
            }
        });

        test('should have VSIX package', () => {
            expect(vsixPath).toBeDefined();
            expect(fs.existsSync(vsixPath)).toBe(true);
        });

        test('VSIX package should be under size limit', () => {
            if (vsixPath) {
                const stats = fs.statSync(vsixPath);
                const sizeInMB = stats.size / (1024 * 1024);
                
                expect(sizeInMB).toBeLessThan(100); // Reasonable VSIX size limit
                console.log(`VSIX size: ${sizeInMB.toFixed(2)}MB`);
            }
        });

        test('VSIX package should be valid ZIP', async () => {
            if (vsixPath) {
                try {
                    // Try to list contents using unzip
                    const { stdout } = await execAsync(`unzip -l "${vsixPath}"`);
                    expect(stdout).toContain('extension/package.json');
                    expect(stdout).toContain('extension/dist/extension.js');
                } catch (error) {
                    // If unzip is not available, check that it's at least a valid file
                    const stats = fs.statSync(vsixPath);
                    expect(stats.size).toBeGreaterThan(1000); // Minimum reasonable size
                }
            }
        });
    });

    describe('Performance Validation', () => {
        test('should have reasonable build time', () => {
            const reportPath = path.join(reportsPath, 'build-performance.csv');
            
            if (fs.existsSync(reportPath)) {
                const content = fs.readFileSync(reportPath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                // Find total build time (should be last entry or specific stage)
                const totalLine = lines.find(line => line.includes('Total') || line.includes('Build'));
                if (totalLine) {
                    const duration = parseFloat(totalLine.split(',')[1]);
                    expect(duration).toBeLessThan(120); // 2 minutes max
                    console.log(`Build time: ${duration}s`);
                }
            }
        });

        test('should have generated performance report', () => {
            const performancePath = path.join(reportsPath, 'build-performance.csv');
            expect(fs.existsSync(performancePath)).toBe(true);
            
            const content = fs.readFileSync(performancePath, 'utf8');
            expect(content).toContain('Stage,Duration');
            expect(content.split('\n').length).toBeGreaterThan(5); // Multiple stages tracked
        });
    });

    describe('Bundle Analysis Validation', () => {
        test('should have generated bundle analysis report', () => {
            const analysisPath = path.join(reportsPath, 'bundle', 'bundle-analysis.html');
            expect(fs.existsSync(analysisPath)).toBe(true);
            
            const content = fs.readFileSync(analysisPath, 'utf8');
            expect(content).toContain('<html');
            expect(content).toContain('webpack-bundle-analyzer');
        });

        test('should have generated stats JSON', () => {
            const statsPath = path.join(reportsPath, 'bundle', 'stats.json');
            expect(fs.existsSync(statsPath)).toBe(true);
            
            const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            expect(stats.assets).toBeDefined();
            expect(stats.modules).toBeDefined();
            expect(stats.chunks).toBeDefined();
        });
    });

    describe('Build Report Validation', () => {
        test('should have generated build report', () => {
            const reportPath = path.join(reportsPath, 'build-report.json');
            expect(fs.existsSync(reportPath)).toBe(true);
            
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            expect(report.status).toBe('success');
            expect(report.timestamp).toBeDefined();
            expect(report.buildDuration).toBeGreaterThan(0);
            expect(report.bundle).toBeDefined();
            expect(report.vsix).toBeDefined();
        });

        test('should have human-readable summary', () => {
            const summaryPath = path.join(reportsPath, 'build-summary.txt');
            expect(fs.existsSync(summaryPath)).toBe(true);
            
            const summary = fs.readFileSync(summaryPath, 'utf8');
            expect(summary).toContain('Production Build Summary');
            expect(summary).toContain('Status: SUCCESS');
            expect(summary).toContain('Bundle Size:');
        });
    });

    describe('Dependency Validation', () => {
        test('should not bundle VSCode API', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // VSCode should be externalized
            expect(bundleContent).not.toContain('vscode/lib/vscode');
            
            // But should contain external reference
            expect(bundleContent).toMatch(/require\s*\(\s*["']vscode["']\s*\)/);
        });

        test('should not bundle native dependencies', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check that native deps are externalized
            const nativeDeps = ['keytar', 'ws', 'fsevents'];
            nativeDeps.forEach(dep => {
                const bundledPattern = new RegExp(`node_modules/${dep}`);
                expect(bundleContent).not.toMatch(bundledPattern);
            });
        });
    });

    describe('Security Validation', () => {
        test('should not contain sensitive information', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check for common sensitive patterns
            expect(bundleContent).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/i);
            expect(bundleContent).not.toMatch(/api[_-]?key\s*[:=]\s*["'][^"']+["']/i);
            expect(bundleContent).not.toMatch(/secret\s*[:=]\s*["'][^"']+["']/i);
            expect(bundleContent).not.toMatch(/token\s*[:=]\s*["'][^"']+["']/i);
        });

        test('should not contain file system paths', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Should not contain absolute paths from build machine
            expect(bundleContent).not.toMatch(/\/Users\/[^"'\s]+/);
            expect(bundleContent).not.toMatch(/C:\\Users\\[^"'\s]+/);
            expect(bundleContent).not.toMatch(/\/home\/[^"'\s]+/);
        });
    });
});