const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

/** @type {import('webpack').Configuration} */
const config = {
    target: 'node',
    mode: 'production',
    
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: true, // Clean dist directory before each build
        pathinfo: false // Disable path info for better performance
    },
    
    externals: {
        vscode: 'commonjs vscode',
        // Add other node modules that should not be bundled
        'keytar': 'commonjs keytar'
        // Note: ws is removed from externals so it gets bundled
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        },
        // Optimize module resolution for production
        symlinks: false,
        cacheWithContext: false
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true, // Faster compilation
                            compilerOptions: {
                                module: 'esnext', // Enable tree shaking
                                moduleResolution: 'node' // Fix moduleResolution issue
                            }
                        }
                    }
                ]
            },
            // Asset optimization rules for webview assets
            {
                test: /\.(png|jpe?g|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/images/[name].[contenthash][ext]'
                },
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // Inline assets smaller than 8kb
                    }
                }
            },
            {
                test: /\.svg$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/images/[name].[contenthash][ext]'
                },
                use: [
                    {
                        loader: 'svgo-loader',
                        options: {
                            configFile: false,
                            plugins: [
                                {
                                    name: 'preset-default',
                                    params: {
                                        overrides: {
                                            removeViewBox: false,
                                            cleanupIds: false
                                        }
                                    }
                                },
                                'removeDimensions'
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.css$/i,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    'autoprefixer',
                                    'cssnano'
                                ]
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/fonts/[name].[contenthash][ext]'
                }
            }
        ]
    },
    
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,    // Remove console.log statements
                        drop_debugger: true,   // Remove debugger statements
                        pure_funcs: ['console.info', 'console.debug', 'console.warn'], // Remove specific console methods
                        passes: 2              // Run compression twice for better results
                    },
                    mangle: {
                        keep_classnames: false,
                        keep_fnames: false
                    },
                    format: {
                        comments: false        // Remove comments
                    }
                },
                extractComments: false        // Don't create separate license file
            })
        ],
        
        // Enable tree shaking for ES modules
        usedExports: true,
        sideEffects: false,
        
        // For VSCode extensions, we typically want a single bundle
        // splitChunks disabled to avoid multiple output files
        splitChunks: {
            chunks: 'async',  // Only split async chunks, not the main entry
            minSize: 50000,   // Only split very large chunks
        },
        
        // Optimize module concatenation (ModuleConcatenationPlugin)
        concatenateModules: true
    },
    
    // Production-optimized source maps
    devtool: 'source-map',
    
    // Performance optimization settings
    performance: {
        hints: 'warning',
        maxEntrypointSize: 5000000,   // 5MB limit for VSCode extensions
        maxAssetSize: 5000000
    },
    
    // Plugins for production optimization and analysis
    plugins: [
        // Generate bundle analysis only when ANALYZE environment variable is set
        ...(process.env.ANALYZE ? [
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                reportFilename: 'bundle-analysis.html',
                openAnalyzer: false,
                generateStatsFile: true,
                statsFilename: 'stats.json'
            })
        ] : [])
    ],
    
    // Reduce build logging in production
    stats: {
        errorDetails: false,
        colors: true,
        modules: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false,
        assets: true
    },
    
    infrastructureLogging: {
        level: "error",               // Only show errors in production
    },
};

module.exports = config;