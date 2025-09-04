const path = require('path');
const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
const config = {
    target: 'node',
    mode: 'none',
    
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    
    externals: {
        vscode: 'commonjs vscode',
        // Add other node modules that should not be bundled
        'keytar': 'commonjs keytar',
        'ws': 'commonjs ws'
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    
    devtool: 'nosources-source-map',
    
    infrastructureLogging: {
        level: "log",
    },
};

module.exports = config;