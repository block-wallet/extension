# [Block wallet](https://blockwallet.io/) ethereum provider

[![CI](../../workflows/Tests/badge.svg)](../../actions?query=Test)

This package will output the content script and the BlockWallet provider itself to the monorepo `dist` folder.

The content script is mainly used to relay messages to the background, and check if the source of these is genuine. On init, it's used to load the script to the page.

The BlockWallet provider is a class compliant with the EIP-1193 that communicates with any dapp that needs access to the ethereum network and the user's accounts.

## 🚀 Quick Start

### Node Version

If you already have nvm installed, just type `nvm use` to set the node version.

### Environment

Make sure to have the .env file following the same format as the env.orig file.

### Build

The build scripts output to the default monorepo dist folder.

```bash
yarn build
```

For more information about how to build the complete extension refer to the following [guideline](https://github.com/block-wallet/extension/blob/master/docs/guideline.md)

### Test

This packages supports the [Mocha Test Explorer Extension](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter) for VS Code!

But you can also run:

```bash
yarn test
```

The test will output a report that you can find in the `coverage` folder!
