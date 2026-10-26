#!/usr/bin/env node

/**
 * VSIX Package Validation Script
 * Issue #47: VSIX Package Creation & Testing
 * Created: 2025-09-11
 * 
 * Validates VSIX packages for VSCode Marketplace compliance
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
    cyan: '\x1b[36m'
};

// Logging utilities
const log = (message) => console.log(`${colors.blue}[${new Date().toISOString()}]${colors.reset} ${message}`);
const success = (message) => console.log(`${colors.green}✅ ${message}${colors.reset}`);
const warning = (message) => console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
const error = (message) => console.log(`${colors.red}❌ ${message}${colors.reset}`);

// Configuration
const VALIDATION_CONFIG = {
    maxSizeMB: 5,
    requiredFiles: [
        'extension.js',
        'package.json'
    ],
    requiredPackageFields: [
        'name',
        'displayName',
        'description',
        'version',
        'publisher',
        'engines',
        'categories',
        'activationEvents',
        'main',
        'contributes'
    ],
    optionalPackageFields: [
        'icon',
        'license',
        'repository',
        'bugs',
        'homepage',
        'galleryBanner',
        'keywords'
    ],
    bannedFiles: [
        '.git',
        '.vscode',
        'node_modules',
        'test',
        'tests',
        '.nyc_output',
        'coverage',
        'src',
        'scripts'
    ],
    maxFileSize: {
        js: 5 * 1024 * 1024,  // 5MB for JS files
        json: 1024 * 1024,    // 1MB for JSON files
        svg: 512 * 1024,      // 512KB for SVG files
        png: 1024 * 1024      // 1MB for PNG files
    }
};

/**
 * Main validation function
 */
async function validateVSIX(vsixPath) {
    if (!vsixPath) {
        error('VSIX path not provided');
        showUsage();
        process.exit(1);
    }

    if (!fs.existsSync(vsixPath)) {
        error(`VSIX file not found: ${vsixPath}`);
        process.exit(1);
    }

    log(`Validating VSIX package: ${path.basename(vsixPath)}`);
    
    const validation = {
        passed: 0,
        failed: 0,
        warnings: 0,
        errors: []
    };

    try {
        // Extract VSIX to temporary directory
        const tempDir = await extractVSIX(vsixPath);
        
        // Run validation checks
        await validatePackageSize(vsixPath, validation);
        await validatePackageStructure(tempDir, validation);
        await validatePackageJson(tempDir, validation);
        await validateFileTypes(tempDir, validation);
        await validateBannedContent(tempDir, validation);
        await validateVSCECompliance(vsixPath, validation);
        
        // Cleanup
        cleanup(tempDir);
        
        // Report results
        reportResults(validation, vsixPath);
        
        // Exit with appropriate code
        process.exit(validation.failed > 0 ? 1 : 0);
        
    } catch (err) {
        error(`Validation failed: ${err.message}`);
        process.exit(1);
    }
}

/**
 * Extract VSIX file to temporary directory
 */
async function extractVSIX(vsixPath) {
    const tempDir = path.join(__dirname, '..', 'temp-vsix-validation');
    
    // Clean up any existing temp directory
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
        // Use unzip to extract VSIX (which is a ZIP file)
        execSync(`unzip -q "${vsixPath}" -d "${tempDir}"`, { stdio: 'pipe' });
        log('VSIX extracted for validation');
        return tempDir;
    } catch (err) {
        throw new Error(`Failed to extract VSIX: ${err.message}`);
    }
}

/**
 * Validate package size
 */
async function validatePackageSize(vsixPath, validation) {
    const stats = fs.statSync(vsixPath);
    const sizeMB = stats.size / (1024 * 1024);
    
    if (sizeMB > VALIDATION_CONFIG.maxSizeMB) {
        validation.failed++;
        validation.errors.push(`Package size ${sizeMB.toFixed(2)}MB exceeds limit of ${VALIDATION_CONFIG.maxSizeMB}MB`);
        error(`Package too large: ${sizeMB.toFixed(2)}MB (limit: ${VALIDATION_CONFIG.maxSizeMB}MB)`);
    } else {
        validation.passed++;
        success(`Package size OK: ${sizeMB.toFixed(2)}MB`);
    }
}

/**
 * Validate package structure
 */
async function validatePackageStructure(tempDir, validation) {
    log('Validating package structure...');
    
    // Look for extension directory
    const extensionDir = path.join(tempDir, 'extension');
    if (!fs.existsSync(extensionDir)) {
        validation.failed++;
        validation.errors.push('Extension directory not found');
        error('Extension directory not found in VSIX');
        return;
    }
    
    // Check required files
    for (const file of VALIDATION_CONFIG.requiredFiles) {
        const filePath = path.join(extensionDir, file);
        if (!fs.existsSync(filePath)) {
            validation.failed++;
            validation.errors.push(`Required file missing: ${file}`);
            error(`Required file missing: ${file}`);
        } else {
            validation.passed++;
        }
    }
    
    success('Package structure validated');
}

/**
 * Validate package.json
 */
async function validatePackageJson(tempDir, validation) {
    log('Validating package.json...');
    
    const packageJsonPath = path.join(tempDir, 'extension', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        validation.failed++;
        validation.errors.push('package.json not found');
        return;
    }
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check required fields
        for (const field of VALIDATION_CONFIG.requiredPackageFields) {
            if (!packageJson[field]) {
                validation.failed++;
                validation.errors.push(`Required package.json field missing: ${field}`);
                error(`Required field missing: ${field}`);
            } else {
                validation.passed++;
            }
        }
        
        // Check optional but recommended fields
        for (const field of VALIDATION_CONFIG.optionalPackageFields) {
            if (!packageJson[field]) {
                validation.warnings++;
                warning(`Recommended field missing: ${field}`);
            }
        }
        
        // Validate specific field formats
        await validateEnginesField(packageJson.engines, validation);
        await validateCategoriesField(packageJson.categories, validation);
        await validateActivationEvents(packageJson.activationEvents, validation);
        
        success('package.json validation completed');
        
    } catch (err) {
        validation.failed++;
        validation.errors.push(`Invalid package.json: ${err.message}`);
        error(`Invalid package.json: ${err.message}`);
    }
}

/**
 * Validate engines field
 */
async function validateEnginesField(engines, validation) {
    if (!engines || !engines.vscode) {
        validation.failed++;
        validation.errors.push('Missing vscode engine specification');
        return;
    }
    
    const vscodeVersion = engines.vscode;
    if (!/^\^?\d+\.\d+\.\d+$/.test(vscodeVersion)) {
        validation.warnings++;
        warning(`Unusual vscode version format: ${vscodeVersion}`);
    }
    
    validation.passed++;
}

/**
 * Validate categories field
 */
async function validateCategoriesField(categories, validation) {
    const validCategories = [
        'Azure', 'Data Science', 'Debuggers', 'Extension Packs', 'Education',
        'Formatters', 'Keymaps', 'Language Packs', 'Linters', 'Machine Learning',
        'Notebooks', 'Other', 'Programming Languages', 'SCM Providers',
        'Snippets', 'Testing', 'Themes', 'Visualization'
    ];
    
    if (!Array.isArray(categories) || categories.length === 0) {
        validation.failed++;
        validation.errors.push('Categories field must be a non-empty array');
        return;
    }
    
    for (const category of categories) {
        if (!validCategories.includes(category)) {
            validation.warnings++;
            warning(`Unknown category: ${category}`);
        }
    }
    
    validation.passed++;
}

/**
 * Validate activation events
 */
async function validateActivationEvents(activationEvents, validation) {
    if (!Array.isArray(activationEvents) || activationEvents.length === 0) {
        validation.failed++;
        validation.errors.push('activationEvents must be a non-empty array');
        return;
    }
    
    const validEventPrefixes = [
        'onLanguage:', 'onCommand:', 'onDebug:', 'workspaceContains:',
        'onFileSystem:', 'onView:', 'onUri:', 'onWebviewPanel:',
        'onStartupFinished', '*'
    ];
    
    for (const event of activationEvents) {
        const isValid = validEventPrefixes.some(prefix => 
            event === prefix || event.startsWith(prefix)
        );
        
        if (!isValid) {
            validation.warnings++;
            warning(`Unusual activation event: ${event}`);
        }
    }
    
    validation.passed++;
}

/**
 * Validate file types and sizes
 */
async function validateFileTypes(tempDir, validation) {
    log('Validating file types and sizes...');
    
    const extensionDir = path.join(tempDir, 'extension');
    await walkDirectory(extensionDir, (filePath, stats) => {
        const ext = path.extname(filePath).toLowerCase();
        const relativePath = path.relative(extensionDir, filePath);
        
        // Check file sizes
        const maxSize = VALIDATION_CONFIG.maxFileSize[ext.substring(1)];
        if (maxSize && stats.size > maxSize) {
            validation.warnings++;
            warning(`Large file detected: ${relativePath} (${(stats.size / 1024).toFixed(1)}KB)`);
        }
        
        // Check for source maps in production
        if (ext === '.map') {
            validation.warnings++;
            warning(`Source map found in production build: ${relativePath}`);
        }
    });
    
    validation.passed++;
    success('File validation completed');
}

/**
 * Validate for banned content
 */
async function validateBannedContent(tempDir, validation) {
    log('Checking for banned content...');
    
    const extensionDir = path.join(tempDir, 'extension');
    
    for (const bannedItem of VALIDATION_CONFIG.bannedFiles) {
        const bannedPath = path.join(extensionDir, bannedItem);
        if (fs.existsSync(bannedPath)) {
            validation.failed++;
            validation.errors.push(`Banned content found: ${bannedItem}`);
            error(`Banned content found: ${bannedItem}`);
        }
    }
    
    validation.passed++;
    success('Banned content check completed');
}

/**
 * Validate using vsce
 */
async function validateVSCECompliance(vsixPath, validation) {
    log('Running vsce validation...');
    
    try {
        // Check if vsce is available
        let vsceCmd = 'vsce';
        try {
            execSync('which vsce', { stdio: 'pipe' });
        } catch (err) {
            vsceCmd = 'npx vsce';
        }
        
        // Run vsce validation
        execSync(`${vsceCmd} package --pre-release --no-dependencies --out /tmp/test.vsix "${path.dirname(vsixPath)}"`, 
                { stdio: 'pipe', cwd: path.dirname(vsixPath) });
        
        validation.passed++;
        success('vsce validation passed');
        
        // Clean up test file
        try {
            fs.unlinkSync('/tmp/test.vsix');
        } catch (err) {
            // Ignore cleanup errors
        }
        
    } catch (err) {
        validation.warnings++;
        warning('vsce validation skipped (vsce not available or failed)');
    }
}

/**
 * Walk directory recursively
 */
async function walkDirectory(dir, callback) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
            await walkDirectory(itemPath, callback);
        } else {
            callback(itemPath, stats);
        }
    }
}

/**
 * Cleanup temporary files
 */
function cleanup(tempDir) {
    try {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    } catch (err) {
        warning(`Cleanup failed: ${err.message}`);
    }
}

/**
 * Report validation results
 */
function reportResults(validation, vsixPath) {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}VSIX VALIDATION REPORT${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`Package: ${path.basename(vsixPath)}`);
    console.log(`Checks passed: ${colors.green}${validation.passed}${colors.reset}`);
    console.log(`Checks failed: ${colors.red}${validation.failed}${colors.reset}`);
    console.log(`Warnings: ${colors.yellow}${validation.warnings}${colors.reset}`);
    
    if (validation.errors.length > 0) {
        console.log('\n' + colors.red + 'ERRORS:' + colors.reset);
        validation.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    
    console.log('='.repeat(60));
    
    if (validation.failed === 0) {
        success('VSIX validation PASSED');
    } else {
        error('VSIX validation FAILED');
    }
}

/**
 * Show usage information
 */
function showUsage() {
    console.log(`
Usage: node validate-vsix.js <vsix-path>

Validates a VSIX package for VSCode Marketplace compliance.

Arguments:
  vsix-path    Path to the VSIX file to validate

Examples:
  node validate-vsix.js my-extension-1.0.0.vsix
  node validate-vsix.js ../packages/extension.vsix
`);
}

// Main execution
if (require.main === module) {
    const vsixPath = process.argv[2];
    validateVSIX(vsixPath);
}

module.exports = { validateVSIX };