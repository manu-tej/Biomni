#!/usr/bin/env node

/**
 * Asset Performance Testing Script
 * Measures and reports asset optimization improvements
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    header: (msg) => console.log(`${colors.bold}${colors.cyan}${msg}${colors.reset}`)
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

/**
 * Analyze asset files and compare original vs optimized
 */
function analyzeAssets() {
    log.header('\n🚀 Asset Optimization Performance Report');
    log.header('=' .repeat(50));
    
    const rootDir = path.resolve(__dirname, '..');
    const results = {
        images: { original: 0, optimized: 0, files: [] },
        css: { original: 0, optimized: 0, files: [] },
        js: { original: 0, optimized: 0, files: [] },
        total: { original: 0, optimized: 0 }
    };
    
    // Analyze images
    log.header('\n📸 Image Assets');
    const imagesDir = path.join(rootDir, 'images');
    if (fs.existsSync(imagesDir)) {
        const imageFiles = fs.readdirSync(imagesDir).filter(f => /\.(svg|png|jpg|jpeg|gif)$/i.test(f));
        
        for (const file of imageFiles) {
            const filePath = path.join(imagesDir, file);
            const stats = fs.statSync(filePath);
            
            // For SVGs, we optimized them in place, so we need to check for backups
            const backupPath = filePath + '.backup';
            let originalSize = stats.size;
            
            if (fs.existsSync(backupPath)) {
                originalSize = fs.statSync(backupPath).size;
            }
            
            const optimizedSize = stats.size;
            const savings = originalSize - optimizedSize;
            const savingsPercent = originalSize > 0 ? (savings / originalSize * 100) : 0;
            
            results.images.original += originalSize;
            results.images.optimized += optimizedSize;
            results.images.files.push({
                name: file,
                original: originalSize,
                optimized: optimizedSize,
                savings,
                savingsPercent
            });
            
            if (savings > 0) {
                log.success(`${file}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${formatPercent(savingsPercent)} reduction)`);
            } else {
                log.info(`${file}: ${formatBytes(originalSize)} (no optimization needed)`);
            }
        }
    }
    
    // Analyze CSS
    log.header('\n🎨 CSS Assets');
    const webviewDir = path.join(rootDir, 'src', 'webview');
    const cssFiles = ['style.css'];
    
    for (const file of cssFiles) {
        const originalPath = path.join(webviewDir, file);
        const backupPath = originalPath + '.backup';
        const minifiedPath = path.join(webviewDir, 'assets', 'css', file.replace('.css', '.min.css'));
        
        if (fs.existsSync(originalPath)) {
            let originalSize = fs.statSync(originalPath).size;
            
            if (fs.existsSync(backupPath)) {
                originalSize = fs.statSync(backupPath).size;
            }
            
            let optimizedSize = fs.statSync(originalPath).size;
            
            if (fs.existsSync(minifiedPath)) {
                optimizedSize = Math.min(optimizedSize, fs.statSync(minifiedPath).size);
            }
            
            const savings = originalSize - optimizedSize;
            const savingsPercent = originalSize > 0 ? (savings / originalSize * 100) : 0;
            
            results.css.original += originalSize;
            results.css.optimized += optimizedSize;
            results.css.files.push({
                name: file,
                original: originalSize,
                optimized: optimizedSize,
                savings,
                savingsPercent
            });
            
            log.success(`${file}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${formatPercent(savingsPercent)} reduction)`);
        }
    }
    
    // Analyze JavaScript
    log.header('\n⚡ JavaScript Assets');
    const jsFiles = ['main.js', 'webview-client.js', 'lazy-loader.js', 'asset-cache.js'];
    
    for (const file of jsFiles) {
        const originalPath = path.join(webviewDir, file.includes('assets') ? file : `assets/js/${file}`);
        const fallbackPath = path.join(webviewDir, file);
        const actualPath = fs.existsSync(originalPath) ? originalPath : fallbackPath;
        
        if (!fs.existsSync(actualPath)) continue;
        
        const backupPath = actualPath + '.backup';
        const minifiedPath = actualPath.replace('.js', '.min.js');
        
        let originalSize = fs.statSync(actualPath).size;
        
        if (fs.existsSync(backupPath)) {
            originalSize = fs.statSync(backupPath).size;
        }
        
        let optimizedSize = fs.statSync(actualPath).size;
        
        if (fs.existsSync(minifiedPath)) {
            optimizedSize = Math.min(optimizedSize, fs.statSync(minifiedPath).size);
        }
        
        const savings = originalSize - optimizedSize;
        const savingsPercent = originalSize > 0 ? (savings / originalSize * 100) : 0;
        
        results.js.original += originalSize;
        results.js.optimized += optimizedSize;
        results.js.files.push({
            name: file,
            original: originalSize,
            optimized: optimizedSize,
            savings,
            savingsPercent
        });
        
        if (savings > 0) {
            log.success(`${file}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${formatPercent(savingsPercent)} reduction)`);
        } else {
            log.info(`${file}: ${formatBytes(originalSize)} (already optimized)`);
        }
    }
    
    // Calculate totals
    results.total.original = results.images.original + results.css.original + results.js.original;
    results.total.optimized = results.images.optimized + results.css.optimized + results.js.optimized;
    const totalSavings = results.total.original - results.total.optimized;
    const totalSavingsPercent = results.total.original > 0 ? (totalSavings / results.total.original * 100) : 0;
    
    // Summary
    log.header('\n📊 Optimization Summary');
    log.header('-' .repeat(30));
    
    log.info(`Images: ${formatBytes(results.images.original)} → ${formatBytes(results.images.optimized)} (${formatPercent((results.images.original - results.images.optimized) / results.images.original * 100)} reduction)`);
    log.info(`CSS:    ${formatBytes(results.css.original)} → ${formatBytes(results.css.optimized)} (${formatPercent((results.css.original - results.css.optimized) / results.css.original * 100)} reduction)`);
    log.info(`JS:     ${formatBytes(results.js.original)} → ${formatBytes(results.js.optimized)} (${formatPercent((results.js.original - results.js.optimized) / results.js.original * 100)} reduction)`);
    
    log.header('\n🎯 Total Results');
    log.success(`Original Size: ${formatBytes(results.total.original)}`);
    log.success(`Optimized Size: ${formatBytes(results.total.optimized)}`);
    log.success(`Total Savings: ${formatBytes(totalSavings)} (${formatPercent(totalSavingsPercent)})`);
    
    // Performance impact estimation
    log.header('\n⚡ Performance Impact Estimation');
    log.info(`Load time improvement (3G): ~${Math.round(totalSavings / 1024 * 0.8)}ms faster`);
    log.info(`Load time improvement (4G): ~${Math.round(totalSavings / 1024 * 0.3)}ms faster`);
    log.info(`Bandwidth savings per user: ${formatBytes(totalSavings)}`);
    
    // Check if targets are met
    log.header('\n🎯 Optimization Targets');
    const targets = {
        totalSize: 5 * 1024 * 1024, // 5MB target from requirements
        jsSize: 100 * 1024,        // 100KB per JS file target
        cssSize: 20 * 1024          // 20KB CSS target
    };
    
    if (results.total.optimized < targets.totalSize) {
        log.success(`✅ Total asset size under ${formatBytes(targets.totalSize)} target`);
    } else {
        log.warn(`⚠️  Total asset size exceeds ${formatBytes(targets.totalSize)} target`);
    }
    
    const largestJs = Math.max(...results.js.files.map(f => f.optimized));
    if (largestJs < targets.jsSize) {
        log.success(`✅ JavaScript files under ${formatBytes(targets.jsSize)} target`);
    } else {
        log.warn(`⚠️  Some JavaScript files exceed ${formatBytes(targets.jsSize)} target`);
    }
    
    if (results.css.optimized < targets.cssSize) {
        log.success(`✅ CSS files under ${formatBytes(targets.cssSize)} target`);
    } else {
        log.warn(`⚠️  CSS files exceed ${formatBytes(targets.cssSize)} target`);
    }
    
    log.header('\n🏁 Optimization Complete!');
    
    return results;
}

// Run analysis if this script is executed directly
if (require.main === module) {
    try {
        analyzeAssets();
    } catch (error) {
        log.error(`Performance analysis failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { analyzeAssets };