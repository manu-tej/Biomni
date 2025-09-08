#!/usr/bin/env node

/**
 * Image Optimization Script for VSCode Extension Assets
 * Optimizes SVG icons and other image assets for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Optimize SVG files using built-in SVG optimization
 */
function optimizeSvg(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');
        
        // Basic SVG optimization
        let optimized = content
            // Remove XML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Remove unnecessary whitespace
            .replace(/>\s+</g, '><')
            // Remove empty groups
            .replace(/<g[^>]*>\s*<\/g>/g, '')
            // Remove unused attributes
            .replace(/\s+id="[^"]*"/g, '')
            .replace(/\s+class=""/g, '')
            // Trim whitespace
            .trim();
        
        const optimizedSize = Buffer.byteLength(optimized, 'utf8');
        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
        
        if (savings > 0) {
            fs.writeFileSync(filePath, optimized);
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
 * Find all image files to optimize
 */
function findImageFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        log.warn(`Directory not found: ${dir}`);
        return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...findImageFiles(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Main optimization function
 */
function optimizeImages() {
    log.info('Starting image optimization...');
    
    const rootDir = path.resolve(__dirname, '..');
    const imageDirs = [
        path.join(rootDir, 'images'),
        path.join(rootDir, 'src', 'webview', 'assets', 'images')
    ];
    
    let totalFiles = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const dir of imageDirs) {
        log.info(`Scanning directory: ${path.relative(rootDir, dir)}`);
        
        const imageFiles = findImageFiles(dir);
        
        if (imageFiles.length === 0) {
            log.warn(`No image files found in ${path.relative(rootDir, dir)}`);
            continue;
        }
        
        log.info(`Found ${imageFiles.length} image files`);
        
        for (const file of imageFiles) {
            const ext = path.extname(file).toLowerCase();
            
            if (ext === '.svg') {
                const result = optimizeSvg(file);
                totalOriginalSize += result.originalSize;
                totalOptimizedSize += result.optimizedSize;
                totalFiles++;
            } else {
                // For other image types, we'll just report their sizes
                const stats = fs.statSync(file);
                totalOriginalSize += stats.size;
                totalOptimizedSize += stats.size;
                totalFiles++;
                log.info(`${path.basename(file)}: ${stats.size}B (no optimization available)`);
            }
        }
    }
    
    if (totalFiles > 0) {
        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const totalSavingsPercent = totalOriginalSize > 0 ? ((totalSavings / totalOriginalSize) * 100).toFixed(1) : '0';
        
        log.success(`\nOptimization complete!`);
        log.success(`Files processed: ${totalFiles}`);
        log.success(`Total size: ${totalOriginalSize}B → ${totalOptimizedSize}B`);
        log.success(`Total savings: ${totalSavings}B (${totalSavingsPercent}%)`);
    } else {
        log.warn('No images found to optimize');
    }
}

// Run optimization if this script is executed directly
if (require.main === module) {
    try {
        optimizeImages();
    } catch (error) {
        log.error(`Optimization failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { optimizeImages, optimizeSvg };