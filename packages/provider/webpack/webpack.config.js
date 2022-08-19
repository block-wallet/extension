const createConfig = require('./webpack.shared.js');

module.exports = createConfig({
    content: './src/content.ts',
    blankProvider: './src/index.ts',
});
