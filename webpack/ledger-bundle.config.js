const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './webpack/ledger-bundle.js',
    output: {
        filename: 'ledger-bundle.js',
        path: path.resolve(__dirname, '../dist'),
        library: 'LedgerBundle',
        libraryTarget: 'window'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        fallback: {
            'crypto': require.resolve('crypto-browserify'),
            'stream': require.resolve('stream-browserify'),
            'buffer': require.resolve('buffer/'),
            'events': require.resolve('events/'),
            'process': require.resolve('process/browser')
        }
    },
    plugins: [
        // Provide Buffer globally
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        // Provide process globally
        new webpack.DefinePlugin({
            'process.env': JSON.stringify({})
        }),
        new webpack.ProvidePlugin({
            process: 'process'
        })
    ]
}; 