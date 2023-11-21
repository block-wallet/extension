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
    // target: ['webworker','es6'],
    output: {
        filename: '[name].js',
        globalObject: 'this',
        // chunkLoading: 'import',
        path: path.resolve(__dirname, '../../../dist'),
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
            http: require.resolve('stream-http'),
            https: require.resolve('https-browserify'),
            zlib: require.resolve('browserify-zlib'),
            url: require.resolve('url/')
        },
    },
    experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true,
    },
    plugins,
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/](@block-wallet)/,
                    name: 'bw-libs',
                    chunks: 'initial'
                }
            }
        }
    }
});
