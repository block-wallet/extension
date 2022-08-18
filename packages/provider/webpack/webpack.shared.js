const path = require('path');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const Dotenv = require('dotenv-webpack');

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
            ['@block-wallet/background']: path.resolve(
                __dirname,
                '../../background/src'
            ),
        },
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new ESLintWebpackPlugin({
            extensions: ['ts'],
            eslintPath: require.resolve('eslint'),
        }),
        new Dotenv({
            path: './.env',
        }),
    ],
});
