const path = require('path');
const webpack = require('webpack');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');

// Separate config specifically for the offscreen document

module.exports = {
    mode: 'development',
    entry: {
        offscreen: path.resolve(__dirname, '../../../public/offscreen.js'),
    },
    target: 'web', // Use 'web' target again
    output: {
        filename: '[name].js', // Output as offscreen.js
        path: path.resolve(__dirname, '../../../dist'),
        // Remove library output config - bundle imports directly
        // library: {
        //     name: 'OffscreenLedgerBundle', // Name for the global variable
        //     type: 'var', // Bundle as a variable accessible in global scope
        // },
        // Use 'module' type for output if needed, or keep default if browser target handles it
        // libraryTarget: 'module', // Potentially needed if using type="module" script tag
    },
    module: {
        rules: [
            // UNCOMMENTED: Add rule for JS files to bundle dependencies
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules\/(?!(|@ledgerhq)\/).*/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    },
                },
            },
            // Add rules for other assets if offscreen.js imports CSS, images, etc.
        ],
    },
    resolve: {
        modules: [path.resolve(__dirname, '../../../node_modules'), 'node_modules'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        // Add necessary fallbacks like in shared config
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer/'), // Already present
        },
    },
    plugins: [
        // Add IgnorePlugin like in shared config
        new webpack.IgnorePlugin({ resourceRegExp: /^worker_threads$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /^fs$/ }),
        // Provide Buffer globally
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        // We might need to remove ESLint temporarily if it conflicts with the bundled output format
        // new ESLintWebpackPlugin({
        //     extensions: ['js'],
        //     eslintPath: require.resolve('eslint'),
        //     context: path.resolve(__dirname, '../../../public') // Set context for ESLint
        // }),
        // Add other plugins if needed (e.g., CleanWebpackPlugin)
    ],
    experiments: {
        // Enable outputModule if using libraryTarget: 'module'
        // outputModule: true,
    },
    optimization: {
        // Keep optimization simple for this single file bundle
        splitChunks: false,
    },
    // Disable devtool or use a production-suitable one like 'source-map' if needed
    devtool: 'inline-source-map',
}; 