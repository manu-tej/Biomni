/**
 * Centralized build configuration for production builds
 * Stream F: Production Build Pipeline & Testing
 */

const path = require('path');
const os = require('os');

/**
 * Environment-specific configuration
 */
const environments = {
    development: {
        minify: false,
        sourcemap: 'cheap-module-source-map',
        bundleAnalyzer: false,
        optimization: 'basic'
    },
    production: {
        minify: true,
        sourcemap: 'source-map',
        bundleAnalyzer: false,
        optimization: 'advanced'
    },
    analyze: {
        minify: true,
        sourcemap: 'source-map',
        bundleAnalyzer: true,
        optimization: 'advanced'
    }
};

/**
 * Build optimization presets
 */
const optimizationPresets = {
    basic: {
        treeshaking: true,
        concatenateModules: false,
        splitChunks: false,
        compression: false
    },
    advanced: {
        treeshaking: true,
        concatenateModules: true,
        splitChunks: true,
        compression: true
    }
};

/**
 * Feature flags for production builds
 */
const featureFlags = {
    // Performance monitoring integration
    performanceMonitoring: true,
    // Cache manager integration
    cacheManager: true,
    // Asset optimization
    assetOptimization: true,
    // Bundle size validation
    bundleSizeValidation: true,
    // VSIX package validation
    vsixValidation: true,
    // Security scanning
    securityScan: true,
    // Performance benchmarks
    performanceBenchmarks: true
};

/**
 * Build limits and thresholds
 */
const limits = {
    // VSCode extension bundle size limit (5MB)
    maxBundleSize: 5 * 1024 * 1024,
    // Warning threshold (4MB)
    bundleSizeWarning: 4 * 1024 * 1024,
    // Maximum build time (30 seconds)
    maxBuildTime: 30 * 1000,
    // Warning build time (20 seconds)
    buildTimeWarning: 20 * 1000,
    // Minimum test coverage
    minTestCoverage: 80,
    // Maximum dependency count
    maxDependencies: 100
};

/**
 * Path configuration
 */
const paths = {
    root: __dirname,
    src: path.resolve(__dirname, 'src'),
    dist: path.resolve(__dirname, 'dist'),
    out: path.resolve(__dirname, 'out'),
    test: path.resolve(__dirname, 'test'),
    scripts: path.resolve(__dirname, 'scripts'),
    reports: path.resolve(__dirname, 'reports'),
    nodeModules: path.resolve(__dirname, 'node_modules'),
    temp: path.resolve(os.tmpdir(), 'biomni-vscode-build')
};

/**
 * Tool configuration
 */
const tools = {
    webpack: {
        configPath: path.resolve(__dirname, 'webpack.config.js'),
        statsOptions: {
            colors: true,
            modules: false,
            chunks: false,
            chunkModules: false
        }
    },
    typescript: {
        configPath: path.resolve(__dirname, 'tsconfig.json'),
        compilerOptions: {
            strict: true,
            noImplicitReturns: true,
            noImplicitAny: true
        }
    },
    eslint: {
        configPath: path.resolve(__dirname, '.eslintrc.json'),
        extensions: ['ts', 'js']
    },
    jest: {
        configPath: path.resolve(__dirname, 'jest.config.js'),
        testPattern: '**/*.test.ts'
    },
    vsce: {
        packageOptions: {
            out: path.resolve(__dirname, 'packages'),
            baseContentUrl: 'https://github.com/biomni/vscode-extension',
            baseImagesUrl: 'https://github.com/biomni/vscode-extension/raw/main'
        }
    }
};

/**
 * Performance monitoring configuration
 */
const performance = {
    monitoring: {
        enabled: featureFlags.performanceMonitoring,
        metrics: ['buildTime', 'bundleSize', 'testCoverage', 'memoryUsage'],
        thresholds: {
            buildTime: limits.maxBuildTime,
            bundleSize: limits.maxBundleSize,
            testCoverage: limits.minTestCoverage
        }
    },
    caching: {
        enabled: featureFlags.cacheManager,
        types: ['webpack', 'typescript', 'eslint', 'test'],
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        maxSize: 500 * 1024 * 1024 // 500MB
    }
};

/**
 * Validation configuration
 */
const validation = {
    bundle: {
        enabled: featureFlags.bundleSizeValidation,
        maxSize: limits.maxBundleSize,
        warnSize: limits.bundleSizeWarning,
        checkDuplicates: true,
        checkUnused: true
    },
    vsix: {
        enabled: featureFlags.vsixValidation,
        validateManifest: true,
        validateFiles: true,
        validateSize: true
    },
    security: {
        enabled: featureFlags.securityScan,
        auditDependencies: true,
        scanVulnerabilities: true,
        checkLicenses: true
    }
};

/**
 * Get configuration for specific environment
 * @param {string} env - Environment name
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig(env = 'production') {
    return environments[env] || environments.production;
}

/**
 * Get optimization preset
 * @param {string} preset - Preset name
 * @returns {Object} Optimization configuration
 */
function getOptimizationPreset(preset = 'advanced') {
    return optimizationPresets[preset] || optimizationPresets.advanced;
}

/**
 * Get build configuration for specific stage
 * @param {string} stage - Build stage (development, production, analyze)
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Complete build configuration
 */
function getBuildConfig(stage = 'production', overrides = {}) {
    const envConfig = getEnvironmentConfig(stage);
    const optimizationConfig = getOptimizationPreset(envConfig.optimization);
    
    return {
        environment: stage,
        ...envConfig,
        optimization: optimizationConfig,
        featureFlags,
        limits,
        paths,
        tools,
        performance,
        validation,
        ...overrides
    };
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // Check required paths exist
    const requiredPaths = ['src', 'dist', 'test'];
    requiredPaths.forEach(pathKey => {
        if (!config.paths[pathKey]) {
            errors.push(`Missing required path: ${pathKey}`);
        }
    });
    
    // Check limits are reasonable
    if (config.limits.maxBundleSize > 10 * 1024 * 1024) {
        warnings.push('Bundle size limit is very high (>10MB)');
    }
    
    if (config.limits.maxBuildTime > 60 * 1000) {
        warnings.push('Build time limit is very high (>60s)');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    environments,
    optimizationPresets,
    featureFlags,
    limits,
    paths,
    tools,
    performance,
    validation,
    getBuildConfig,
    getEnvironmentConfig,
    getOptimizationPreset,
    validateConfig
};