#!/usr/bin/env node

/**
 * JavaScript Optimization Script for VSCode Extension Webview Assets
 * Minifies and optimizes JS files for production
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
 * Simple JavaScript minification (without external dependencies)
 */
function minifyJs(js) {
    return js
        // Remove single-line comments (but not URLs)
        .replace(/\/\/(?![^\n]*https?:).*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around operators
        .replace(/\s*([{}();,:])\s*/g, '$1')
        // Remove unnecessary semicolons
        .replace(/;+/g, ';')
        .replace(/;}/g, '}')
        // Remove trailing semicolons
        .replace(/;$/, '')
        // Trim
        .trim();
}

/**
 * Advanced JavaScript optimizations
 */
function optimizeJs(js) {
    let optimized = js;
    
    // Replace console.log with empty function in production
    optimized = optimized
        .replace(/console\.log\([^)]*\);?/g, '')
        .replace(/console\.debug\([^)]*\);?/g, '')
        .replace(/console\.info\([^)]*\);?/g, '')
        // Keep console.error and console.warn for debugging
        
        // Optimize boolean literals
        .replace(/\btrue\b/g, '!0')
        .replace(/\bfalse\b/g, '!1')
        
        // Optimize undefined
        .replace(/\bundefined\b/g, 'void 0')
        
        // Remove unnecessary parentheses in return statements
        .replace(/return\s*\(\s*([^)]+)\s*\)\s*;/g, 'return $1;')
        
        // Optimize object property access
        .replace(/\['([a-zA-Z_$][a-zA-Z0-9_$]*)'\]/g, '.$1')
        
        // Remove unnecessary quotes from object properties
        .replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
    
    return optimized;
}

/**
 * Create lazy loading wrapper for JavaScript modules
 */
function createLazyLoadingWrapper(js, moduleName) {
    return `
// Lazy loading wrapper for ${moduleName}
(function() {
    'use strict';
    
    let moduleLoaded = false;
    let moduleExports = null;
    
    function loadModule() {
        if (moduleLoaded) return moduleExports;
        
        moduleLoaded = true;
        moduleExports = (function() {
            ${js}
            return typeof module !== 'undefined' && module.exports || {};
        })();
        
        return moduleExports;
    }
    
    // Auto-load if DOM is ready, otherwise load on demand
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadModule);
    } else {
        // Load immediately for small modules
        if (${js.length} < 10000) {
            loadModule();
        }
    }
    
    // Expose load function globally for manual loading
    window.load${moduleName.replace(/[^a-zA-Z0-9]/g, '')} = loadModule;
})();`.trim();
}

/**
 * Split large JavaScript files for better caching
 */
function splitJsFile(filePath, maxChunkSize = 30000) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath, '.js');
        const dir = path.dirname(filePath);
        
        if (content.length <= maxChunkSize) {
            return [{ path: filePath, content, size: content.length }];
        }
        
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = '';
        let chunkIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
                // Save current chunk
                const chunkPath = path.join(dir, `${filename}.chunk${chunkIndex}.js`);
                chunks.push({
                    path: chunkPath,
                    content: currentChunk.trim(),
                    size: currentChunk.length
                });
                
                currentChunk = line + '\n';
                chunkIndex++;
            } else {
                currentChunk += line + '\n';
            }
        }
        
        // Save remaining content
        if (currentChunk.trim()) {
            const chunkPath = path.join(dir, `${filename}.chunk${chunkIndex}.js`);
            chunks.push({
                path: chunkPath,
                content: currentChunk.trim(),
                size: currentChunk.length
            });
        }
        
        return chunks;
    } catch (error) {
        log.error(`Failed to split ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Optimize a single JavaScript file
 */
function optimizeJsFile(filePath, options = {}) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');
        
        const {
            createMinified = true,
            enableLazyLoading = false,
            splitLargeFiles = true,
            maxChunkSize = 30000
        } = options;
        
        // Apply minification and optimizations
        let optimized = minifyJs(content);
        optimized = optimizeJs(optimized);
        
        const optimizedSize = Buffer.byteLength(optimized, 'utf8');
        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
        
        const filename = path.basename(filePath, '.js');
        const dir = path.dirname(filePath);
        
        // Create backup of original
        const backupPath = filePath + '.backup';
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, content);
            log.info(`Created backup: ${path.basename(backupPath)}`);
        }
        
        // Create minified version
        if (createMinified) {
            const minifiedPath = path.join(dir, `${filename}.min.js`);
            fs.writeFileSync(minifiedPath, optimized);
            log.success(`Created minified version: ${path.basename(minifiedPath)} (${optimizedSize}B)`);
        }
        
        // Create lazy loading version if requested
        if (enableLazyLoading && optimizedSize > 10000) {
            const lazyWrapper = createLazyLoadingWrapper(optimized, filename);
            const lazyPath = path.join(dir, `${filename}.lazy.js`);
            fs.writeFileSync(lazyPath, lazyWrapper);
            log.success(`Created lazy loading version: ${path.basename(lazyPath)}`);
        }
        
        // Split large files if requested
        if (splitLargeFiles && optimizedSize > maxChunkSize) {
            const chunks = splitJsFile(filePath, maxChunkSize);
            if (chunks.length > 1) {
                log.info(`Split ${path.basename(filePath)} into ${chunks.length} chunks`);
                
                // Create a loader file
                const loaderContent = `
// Chunk loader for ${filename}
(function() {
    'use strict';
    const chunks = [${chunks.map((_, i) => `'${filename}.chunk${i}.js'`).join(', ')}];
    
    async function loadChunks() {
        for (const chunk of chunks) {
            try {
                const script = document.createElement('script');
                script.src = './' + chunk;
                script.async = false;
                document.head.appendChild(script);
                await new Promise(resolve => script.onload = resolve);
            } catch (error) {
                console.error('Failed to load chunk:', chunk, error);
            }
        }
    }
    
    // Load chunks when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChunks);
    } else {
        loadChunks();
    }
})();`.trim();
                
                const loaderPath = path.join(dir, `${filename}.loader.js`);
                fs.writeFileSync(loaderPath, loaderContent);
                log.success(`Created chunk loader: ${path.basename(loaderPath)}`);
            }
        }
        
        // Also create optimized version in assets/js directory if it's a webview file
        if (filePath.includes('webview') && !filePath.includes('assets')) {
            const assetsJsDir = path.join(path.dirname(filePath), 'assets', 'js');
            if (fs.existsSync(assetsJsDir)) {
                const optimizedPath = path.join(assetsJsDir, `${filename}.min.js`);
                fs.writeFileSync(optimizedPath, optimized);
                log.success(`Created optimized version in assets: ${path.relative(path.dirname(path.dirname(filePath)), optimizedPath)}`);
            }
        }
        
        log.success(`${path.basename(filePath)}: ${originalSize}B → ${optimizedSize}B (${savingsPercent}% reduction)`);
        
        return { originalSize, optimizedSize, savings };
    } catch (error) {
        log.error(`Failed to optimize ${filePath}: ${error.message}`);
        return { originalSize: 0, optimizedSize: 0, savings: 0 };
    }
}

/**
 * Find all JavaScript files to optimize
 */
function findJsFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        log.warn(`Directory not found: ${dir}`);
        return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...findJsFiles(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.js' && 
                !entry.name.includes('.min.') && 
                !entry.name.includes('.backup') &&
                !entry.name.includes('.chunk') &&
                !entry.name.includes('.lazy') &&
                !entry.name.includes('.loader')) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Main optimization function
 */
function optimizeJsFiles(options = {}) {
    log.info('Starting JavaScript optimization...');
    
    const rootDir = path.resolve(__dirname, '..');
    const jsDirs = [
        path.join(rootDir, 'src', 'webview')
    ];
    
    let totalFiles = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const dir of jsDirs) {
        log.info(`Scanning directory: ${path.relative(rootDir, dir)}`);
        
        const jsFiles = findJsFiles(dir);
        
        if (jsFiles.length === 0) {
            log.warn(`No JavaScript files found in ${path.relative(rootDir, dir)}`);
            continue;
        }
        
        log.info(`Found ${jsFiles.length} JavaScript files`);
        
        for (const file of jsFiles) {
            const result = optimizeJsFile(file, options);
            totalOriginalSize += result.originalSize;
            totalOptimizedSize += result.optimizedSize;
            totalFiles++;
        }
    }
    
    if (totalFiles > 0) {
        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const totalSavingsPercent = totalOriginalSize > 0 ? ((totalSavings / totalOriginalSize) * 100).toFixed(1) : '0';
        
        log.success(`\nJavaScript optimization complete!`);
        log.success(`Files processed: ${totalFiles}`);
        log.success(`Total size: ${totalOriginalSize}B → ${totalOptimizedSize}B`);
        log.success(`Total savings: ${totalSavings}B (${totalSavingsPercent}%)`);
    } else {
        log.warn('No JavaScript files found to optimize');
    }
}

// Run optimization if this script is executed directly
if (require.main === module) {
    try {
        const options = {
            createMinified: true,
            enableLazyLoading: true,
            splitLargeFiles: true,
            maxChunkSize: 30000
        };
        optimizeJsFiles(options);
    } catch (error) {
        log.error(`JavaScript optimization failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { optimizeJsFiles, optimizeJsFile, minifyJs, optimizeJs };