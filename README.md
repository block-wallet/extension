[![CI](https://github.com/block-wallet/extension/actions/workflows/ci.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/ci.yml) [![Release (manual)](https://github.com/block-wallet/extension/actions/workflows/build.yaml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/build.yaml) [![Release (automated)](https://github.com/block-wallet/extension/actions/workflows/release.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/release.yml)

# Block Wallet Extension

The most private, non-custodial cryptocurrency wallet
The first crypto wallet protecting you on Web3 without any compromises. Stay safe with BlockWallet.

Supporting Ethereum, BNB Chain, Polygon, Avalanche, Fantom, and Arbitrum.

BlockWallet is for you if:

- You frequently use DApps and DEXes.
- You want your tools working smoothly, every time.
- You care about your personal data and security online.
- You are tired of overly-cluttered and confusing crypto wallets.

## Getting Started

See the [guideline](docs/guideline.md)

### Prerequisites

- Node.js: version at [.nvmrc](.nvmrc)
- Yarn
- Make

### Installing

To install all the dependencies run the command

```
make install
```

### Build

Once you installed everything run the command

```
make build
```

## Running the tests

Once you build the extension run the command

```
make test
```

## Coding style

Every [package](packages) has it own coding style. In order to check the styles run the command

```
make lint
```

## Release

The release process uses a combination of two GitHub workflows called [build](.github/workflows/build.yml) and [release](.github/workflows/release.yml) and finally a manual step to upload the new extension version to the [Chrome Web Store](https://chrome.google.com/webstore/detail/blockwallet/bopcbmipnjdcdfflfgjdgdjejmgpoaab). See the [GitHub releases](https://github.com/block-wallet/extension/releases)

## Built With

* [Node.js](https://nodejs.org/)
* [Typescript](https://www.typescriptlang.org/)
* [React.js](https://reactjs.org/)

## Contributing

Please read [CONTRIBUTING.md](docs/contributing.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/block-wallet/extension/tags). 

## Authors

See the list of [contributors](https://github.com/block-wallet/extension/graphs/contributors) who participated in this project.

## License

See the [LICENSE](LICENSE) file for details

## Acknowledgments

See the [Acknowledgments](docs/acknowledgments.md) file for details

# Socials

[Web](https://blockwallet.io/)

[Medium](http://blockwallet.medium.com/)

[Github](https://github.com/block-wallet)

[Twitter](https://twitter.com/GetBlockWallet)

[Telegram](https://t.me/blockwallet)

[LinkedIn](https://www.linkedin.com/company/block-wallet/)

[Mail](mailto:hello@blockwallet.io)
