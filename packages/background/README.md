# [Block Wallet Extension](https://blockwallet.io/) background

[![CI](../../workflows/Tests/badge.svg)](../../actions?query=Test)

## 🚀 Quick Start

### Node Version

If you already have nvm installed, just type `nvm use` to set the node version.

### Build

```bash
make build/background
```

For more information about how to build the complete extension refer to the following [guideline](https://github.com/block-wallet/extension/blob/master/docs/guideline.md)

### Test

```bash
make test/background
```

## Environment Variables

To correctly build the background script a .env file must be created following the env.orig file content

## State Migrations

Follow this [State Migrations Guide](src/infrastructure/stores/migrator/README.md) in order to correctly transition between state structure updates on version upgrades
