const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
// const BundleAnalyzerPlugin =
//     require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const plugins = [
    new Dotenv({
        path: './.env',
    }),
    new webpack.IgnorePlugin(/^worker_threads$/),
    new webpack.IgnorePlugin(/^fs$/),
    new webpack.BannerPlugin({
        banner: 'var window = self;',
        raw: true,
        entryOnly: true,
        test: /\.worker.js?$/,
    }),
    new ESLintWebpackPlugin({
        extensions: ['ts'],
        eslintPath: require.resolve('eslint'),
    }),
    // new BundleAnalyzerPlugin({
    //     analyzerMode: 'static',
    //     reportFilename: '../packages/background/bundle_size_report.html',
    // }),
];

module.exports = (entry) => ({
    mode: 'production',
    entry,
    output: {
        filename: '[name].js',
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
    },
    plugins,
});
