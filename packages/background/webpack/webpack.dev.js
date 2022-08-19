const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
});
