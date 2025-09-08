#!/usr/bin/env node

/**
 * CSS Optimization Script for VSCode Extension Webview Assets
 * Minifies and optimizes CSS files for production
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
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

/**
 * Simple CSS minification (without external dependencies)
 */
function minifyCss(css) {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around specific characters
        .replace(/\s*{\s*/g, '{')
        .replace(/;\s*/g, ';')
        .replace(/:\s*/g, ':')
        .replace(/,\s*/g, ',')
        .replace(/}\s*/g, '}')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove empty rules
        .replace(/[^{}]+{\s*}/g, '')
        // Trim
        .trim();
}

/**
 * Advanced CSS optimizations
 */
function optimizeCss(css) {
    let optimized = css;
    
    // Convert color values to shorter forms
    optimized = optimized
        // Convert hex colors to shorter form where possible
        .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3')
        // Convert rgb(0,0,0) to #000
        .replace(/rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/gi, '#000')
        // Convert rgb(255,255,255) to #fff
        .replace(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/gi, '#fff')
        // Remove unnecessary zeros
        .replace(/0\.(\d+)/g, '.$1')
        .replace(/(\d)\.0(?=\D)/g, '$1')
        // Remove unnecessary units for zero values
        .replace(/0(?:px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in|pt|pc)/gi, '0')
        // Optimize font weights
        .replace(/font-weight\s*:\s*normal/gi, 'font-weight:400')
        .replace(/font-weight\s*:\s*bold/gi, 'font-weight:700')
        // Remove quotes from font family names where possible
        .replace(/font-family\s*:\s*"([^"]+)"/gi, (match, family) => {
            return /[^a-zA-Z0-9\-_\s]/.test(family) ? match : `font-family:${family}`;
        });
    
    return optimized;
}

/**
 * Optimize a single CSS file
 */
function optimizeCssFile(filePath, outputPath = null) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');
        
        // Apply minification and optimizations
        let optimized = minifyCss(content);
        optimized = optimizeCss(optimized);
        
        const optimizedSize = Buffer.byteLength(optimized, 'utf8');
        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
        
        // Write to output file or overwrite original
        const outputFile = outputPath || filePath;
        
        // Create backup of original if overwriting
        if (!outputPath && originalSize !== optimizedSize) {
            const backupPath = filePath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
                log.info(`Created backup: ${path.basename(backupPath)}`);
            }
        }
        
        // Create optimized version in assets/css directory
        const webviewAssetsDir = path.join(path.dirname(path.dirname(filePath)), 'webview', 'assets', 'css');
        if (path.basename(filePath) === 'style.css' && fs.existsSync(webviewAssetsDir)) {
            const optimizedPath = path.join(webviewAssetsDir, 'style.min.css');
            fs.writeFileSync(optimizedPath, optimized);
            log.success(`Created optimized version: ${path.relative(path.dirname(path.dirname(filePath)), optimizedPath)}`);
        }
        
        fs.writeFileSync(outputFile, optimized);
        
        if (savings > 0) {
            log.success(`${path.basename(filePath)}: ${originalSize}B → ${optimizedSize}B (${savingsPercent}% reduction)`);
        } else {
            log.info(`${path.basename(filePath)}: Already optimized (${originalSize}B)`);
        }
        
        return { originalSize, optimizedSize, savings };
    } catch (error) {
        log.error(`Failed to optimize ${filePath}: ${error.message}`);
        return { originalSize: 0, optimizedSize: 0, savings: 0 };
    }
}

/**
 * Find all CSS files to optimize
 */
function findCssFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        log.warn(`Directory not found: ${dir}`);
        return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...findCssFiles(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.css' && !entry.name.includes('.min.') && !entry.name.includes('.backup')) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Main optimization function
 */
function optimizeCssFiles() {
    log.info('Starting CSS optimization...');
    
    const rootDir = path.resolve(__dirname, '..');
    const cssDirs = [
        path.join(rootDir, 'src', 'webview'),
        path.join(rootDir, 'src', 'webview', 'assets', 'css')
    ];
    
    let totalFiles = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const dir of cssDirs) {
        log.info(`Scanning directory: ${path.relative(rootDir, dir)}`);
        
        const cssFiles = findCssFiles(dir);
        
        if (cssFiles.length === 0) {
            log.warn(`No CSS files found in ${path.relative(rootDir, dir)}`);
            continue;
        }
        
        log.info(`Found ${cssFiles.length} CSS files`);
        
        for (const file of cssFiles) {
            const result = optimizeCssFile(file);
            totalOriginalSize += result.originalSize;
            totalOptimizedSize += result.optimizedSize;
            totalFiles++;
        }
    }
    
    if (totalFiles > 0) {
        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const totalSavingsPercent = totalOriginalSize > 0 ? ((totalSavings / totalOriginalSize) * 100).toFixed(1) : '0';
        
        log.success(`\nCSS optimization complete!`);
        log.success(`Files processed: ${totalFiles}`);
        log.success(`Total size: ${totalOriginalSize}B → ${totalOptimizedSize}B`);
        log.success(`Total savings: ${totalSavings}B (${totalSavingsPercent}%)`);
    } else {
        log.warn('No CSS files found to optimize');
    }
}

// Run optimization if this script is executed directly
if (require.main === module) {
    try {
        optimizeCssFiles();
    } catch (error) {
        log.error(`CSS optimization failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { optimizeCssFiles, optimizeCssFile, minifyCss, optimizeCss };