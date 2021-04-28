const path = require('path')
const webpack = require('webpack')
const Dotenv = require('dotenv-webpack')

process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

const plugins = [
  new Dotenv(
    {
      path: "./packages/background/.env"
    }
  ),
  new webpack.IgnorePlugin(/^worker_threads$/),
  new webpack.IgnorePlugin(/^fs$/),
  new webpack.BannerPlugin({
    banner: 'var window = self;',
    raw: true,
    entryOnly: true,
    test: /\.worker.js?$/,
  }),
]

module.exports = {
  mode: 'production',
  entry: './packages/background/src/background.ts',
  output: {
    path: path.resolve(__dirname, '../../dist'),
    filename: 'background.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve(__dirname, '../../packages/background/src/'),
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, '../../packages/background/tsconfig.json'),
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins,
}
