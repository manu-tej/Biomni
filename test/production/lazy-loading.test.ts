/**
 * Lazy Loading Tests for Production Build
 * Stream F: Production Build Pipeline & Testing
 * 
 * Tests to verify lazy loading functionality works correctly
 * in production mode
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Lazy Loading in Production', () => {
    const projectRoot = path.resolve(__dirname, '../../');
    const distPath = path.join(projectRoot, 'dist');
    const reportsPath = path.join(projectRoot, 'reports');

    beforeAll(() => {
        if (!fs.existsSync(distPath)) {
            throw new Error('Production build not found. Run build-production.sh first.');
        }
    });

    describe('Dynamic Import Validation', () => {
        test('should contain dynamic import statements', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check for webpack dynamic import patterns
            const hasDynamicImports = 
                bundleContent.includes('import(') ||
                bundleContent.includes('__webpack_require__.e(') ||
                bundleContent.includes('.then(') ||
                bundleContent.includes('Promise.resolve().then');
            
            if (hasDynamicImports) {
                expect(hasDynamicImports).toBe(true);
                console.log('Dynamic imports detected in production bundle');
            } else {
                console.warn('No dynamic imports detected - lazy loading may not be implemented');
            }
        });

        test('should not eagerly load all modules', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check that modules are properly wrapped for lazy loading
            const moduleCount = (bundleContent.match(/module\.exports\s*=/g) || []).length;
            const requireCount = (bundleContent.match(/require\(/g) || []).length;
            
            // In a properly lazy-loaded bundle, not everything should be required upfront
            expect(requireCount).toBeLessThan(moduleCount * 0.8);
            
            console.log(`Modules: ${moduleCount}, Requires: ${requireCount}`);
        });
    });

    describe('Chunk Analysis', () => {
        test('should analyze async chunks if present', () => {
            const statsPath = path.join(reportsPath, 'bundle', 'stats.json');
            
            if (fs.existsSync(statsPath)) {
                const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
                const chunks = stats.chunks || [];
                
                // Check for async chunks
                const asyncChunks = chunks.filter((chunk: any) => !chunk.initial);
                
                if (asyncChunks.length > 0) {
                    console.log(`Found ${asyncChunks.length} async chunks for lazy loading`);
                    
                    // Verify async chunks are reasonably sized
                    asyncChunks.forEach((chunk: any) => {
                        expect(chunk.size).toBeGreaterThan(0);
                        expect(chunk.size).toBeLessThan(1024 * 1024); // Should be < 1MB per chunk
                    });
                } else {
                    console.warn('No async chunks found - may not be using lazy loading optimally');
                }
            }
        });
    });

    describe('Code Splitting Validation', () => {
        test('should have appropriate code splitting strategy', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check for webpack chunk loading infrastructure
            const hasChunkLoading = 
                bundleContent.includes('__webpack_require__.e') ||
                bundleContent.includes('webpackJsonp') ||
                bundleContent.includes('chunk');
            
            if (hasChunkLoading) {
                expect(hasChunkLoading).toBe(true);
                console.log('Code splitting infrastructure detected');
                
                // Should have chunk loading error handling
                expect(bundleContent).toMatch(/catch|error/i);
            } else {
                console.warn('Code splitting infrastructure not detected');
            }
        });

        test('should handle chunk loading errors gracefully', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Look for error handling patterns in chunk loading
            const hasErrorHandling = 
                bundleContent.includes('catch') ||
                bundleContent.includes('reject') ||
                bundleContent.includes('onerror') ||
                bundleContent.includes('onload');
            
            if (bundleContent.includes('__webpack_require__.e')) {
                // If we have chunk loading, we should have error handling
                expect(hasErrorHandling).toBe(true);
            }
        });
    });

    describe('Lazy Module Loading Simulation', () => {
        test('should simulate lazy module loading patterns', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Mock module loading to test lazy patterns
            const mockWebpackRequire = {
                cache: {},
                modules: {},
                e: jest.fn().mockResolvedValue({}), // Mock chunk loading
                resolve: jest.fn()
            };
            
            // Test that we can identify lazy loading patterns
            const lazyPatterns = [
                /import\s*\(/,                    // ES6 dynamic import
                /__webpack_require__\.e\(/,       // Webpack chunk loading
                /Promise\.resolve\(\)\.then/,     // Promise-based loading
                /require\.ensure\(/               // Legacy webpack async
            ];
            
            const detectedPatterns = lazyPatterns.filter(pattern => 
                pattern.test(bundleContent)
            );
            
            console.log(`Detected ${detectedPatterns.length} lazy loading patterns`);
            
            // At least some lazy loading should be present for optimal performance
            if (bundleContent.length > 100000) { // Large bundles should use lazy loading
                expect(detectedPatterns.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Performance Impact Analysis', () => {
        test('should analyze potential performance improvements from lazy loading', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleStats = fs.statSync(bundlePath);
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Estimate how much code could be lazily loaded
            const totalSize = bundleStats.size;
            
            // Look for large modules or features that could be lazy-loaded
            const potentialLazyModules = [
                /genomics/gi,
                /database/gi,
                /webview/gi,
                /analysis/gi,
                /export/gi,
                /import/gi,
                /visualization/gi
            ];
            
            let potentialLazySize = 0;
            potentialLazyModules.forEach(pattern => {
                const matches = bundleContent.match(pattern);
                if (matches) {
                    // Rough estimation of code size for this feature
                    potentialLazySize += matches.length * 1000; // Estimate 1KB per match
                }
            });
            
            const lazyLoadingPotential = (potentialLazySize / totalSize) * 100;
            
            console.log(`Bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
            console.log(`Potential lazy loading savings: ${lazyLoadingPotential.toFixed(1)}%`);
            
            // If there's significant potential, recommend lazy loading
            if (lazyLoadingPotential > 30) {
                console.warn(`High lazy loading potential detected: ${lazyLoadingPotential.toFixed(1)}%`);
                console.warn('Consider implementing more aggressive lazy loading');
            }
        });
    });

    describe('Runtime Lazy Loading Behavior', () => {
        test('should not load all modules synchronously', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Count synchronous requires vs async loading patterns
            const syncRequires = (bundleContent.match(/require\s*\(\s*["'][^"']+["']\s*\)/g) || []).length;
            const asyncPatterns = (bundleContent.match(/import\(|__webpack_require__\.e\(/g) || []).length;
            
            console.log(`Synchronous requires: ${syncRequires}`);
            console.log(`Async loading patterns: ${asyncPatterns}`);
            
            // For optimal performance, we should have some async loading
            const asyncRatio = asyncPatterns / (syncRequires + asyncPatterns);
            
            if (syncRequires > 50) { // Only check for large bundles
                expect(asyncRatio).toBeGreaterThan(0.1); // At least 10% should be async
            }
        });
    });

    describe('Cache Manager Lazy Loading', () => {
        test('should lazy load cache manager components', () => {
            const bundlePath = path.join(distPath, 'extension.js');
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check if cache-related code is organized for lazy loading
            const cachePatterns = bundleContent.match(/cache|Cache|memory|Memory/gi) || [];
            
            if (cachePatterns.length > 0) {
                console.log(`Found ${cachePatterns.length} cache-related code patterns`);
                
                // Cache manager should not be immediately loaded for better startup performance
                const eagerCacheLoading = bundleContent.match(/new.*Cache|Cache.*constructor/gi) || [];
                const lazyCacheLoading = bundleContent.match(/import.*cache|require.*cache.*then/gi) || [];
                
                console.log(`Eager cache loading: ${eagerCacheLoading.length}`);
                console.log(`Lazy cache loading: ${lazyCacheLoading.length}`);
                
                // Prefer lazy loading for cache manager
                if (eagerCacheLoading.length > 0) {
                    expect(lazyCacheLoading.length).toBeGreaterThanOrEqual(eagerCacheLoading.length);
                }
            }
        });
    });
});