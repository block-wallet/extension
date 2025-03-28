const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
/*
const BundleAnalyzerPlugin =
    require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
*/

process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const plugins = [
    /*
    TODO: If you need to import async components, uncomment this and run: 'yarn add webpack-target-webextension'
    new WebExtension({
        background: {
            entry: 'background',
            // !! Add this to support manifest v3
            manifest: 3,
        },
    }),
    */
    new Dotenv({
        path: './.env',
    }),
    new webpack.IgnorePlugin({ resourceRegExp: /^worker_threads$/ }),
    new webpack.IgnorePlugin({ resourceRegExp: /^fs$/ }),
    new ESLintWebpackPlugin({
        extensions: ['ts'],
        eslintPath: require.resolve('eslint'),
    }),
    /*
    new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: '../packages/background/bundle_size_report.html',
    }),
    */
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
];

module.exports = (entry) => ({
    mode: 'production',
    entry,
    // Explicitly set target to webworker to ensure compatibility with service worker
    target: 'webworker',
    output: {
        filename: '[name].js',
        globalObject: 'this',
        // Remove chunkLoading comment as it's not needed and could cause issues
        path: path.resolve(__dirname, '../../../dist'),
        // Ensure we're not using ES modules in the output
        module: false,
        // Disable code splitting for service worker context
        chunkLoading: false,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: path.resolve(__dirname, '../tsconfig.json'),
                    },
                },
            },
        ],
    },
    resolve: {
        alias: {
            ['@block-wallet/provider']: path.resolve(
                __dirname,
                '../../provider/src'
            ),
        },
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer/'),
        },
    },
    experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true,
    },
    optimization: {
        // Ensure all modules are included in the main bundle for service worker context
        splitChunks: false,
    },
    plugins,
});
