
<br /> 
<p align="center">
  <a href="https://blockwallet.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/11839151/188500975-8cd95d07-c419-48aa-bb85-4200a6526f68.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-blockwallet-black.svg" />
      <img src="[https://blockwallet.io/static/images/logo-medium.svg](https://user-images.githubusercontent.com/11839151/188500975-8cd95d07-c419-48aa-bb85-4200a6526f68.svg)" width="300" />
    </picture>
  </a>
</p>


<div align="center" style="text-align:center">

[![CI](https://github.com/block-wallet/extension/actions/workflows/ci.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/ci.yml) [![Release (manual)](https://github.com/block-wallet/extension/actions/workflows/build.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/build.yml) [![Release (automated)](https://github.com/block-wallet/extension/actions/workflows/release.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/release.yml)
[![Convention](https://github.com/block-wallet/extension/actions/workflows/convention.yml/badge.svg)](https://github.com/block-wallet/extension/actions/workflows/convention.yml)

</div>

<hr />

# BlockWallet - Extension

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

#### Prerequisites

You need a GitHub token with read:packages access to the **block-wallet** GitHub organization in order to download some private libraries. There are two options to do that: 

* Create this file ~/.npmrc file with this configuration

```yaml
//npm.pkg.github.com/:_authToken=REGISTRY_AUTH_TOKEN
@block-wallet:registry=https://npm.pkg.github.com/
@block-wallet:always-auth=true
```

where **REGISTRY_AUTH_TOKEN** is a token generated here https://github.com/settings/tokens with at least read access to the packages.


* Another option is to login to the registry using this command every time you want to download the private libraries:

```jsx
npm login --scope=@block-wallet --registry=https://npm.pkg.github.com
```

That command will ask for you GitHub username, your GitHub token and also your email.

#### Install

To install all the dependencies run the command

```
make install
```

### Build

Once you installed everything run the command

```
make build
```

### Running the tests

Once you build the extension run the command

```
make test
```

### Coding style

Every [package](packages) has it own coding style. In order to check the styles run the command

```
make lint
```

### Release

The release process uses a combination of two GitHub workflows called [build](.github/workflows/build.yml) and [release](.github/workflows/release.yml) and finally a manual step to upload the new extension version to the [Chrome Web Store](https://chrome.google.com/webstore/detail/blockwallet/bopcbmipnjdcdfflfgjdgdjejmgpoaab). See the [GitHub releases](https://github.com/block-wallet/extension/releases)

## Built With

* [Node.js](https://nodejs.org/)
* [Typescript](https://www.typescriptlang.org/)
* [React.js](https://reactjs.org/)
* [tailwindcss](https://tailwindcss.com/)

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

<hr />
<br />
<div align="center">
  <a href="https://blockwallet.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="ttps://user-images.githubusercontent.com/11839151/188502875-41a57a7d-6dc2-4b99-9d9e-2b847826d3ed.png" />
      <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/11839151/188502875-41a57a7d-6dc2-4b99-9d9e-2b847826d3ed.png" />
      <img src="https://user-images.githubusercontent.com/11839151/188502875-41a57a7d-6dc2-4b99-9d9e-2b847826d3ed.png" width="32" />
    </picture>
  </a>  
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://blockwallet.medium.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-medium.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-medium-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-medium.svg" width="32" />
    </picture>
  </a>
&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://github.com/block-wallet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-github.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-github-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-github.svg" width="32" />
    </picture>
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://twitter.com/GetBlockWallet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-twitter.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-twitter-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-twitter.svg" width="32" />
    </picture>
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://t.me/blockwallet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-telegram.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-telegram-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-telegram.svg" width="32" />
    </picture>
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.linkedin.com/company/block-wallet/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-linkedin.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-linkedin-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-linkedin-d.svg" width="32" />
    </picture>
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://discord.com/invite/EKVZ2xWXEH">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://blockwallet.io/static/images/logo-discord.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://blockwallet.io/static/images/logo-discord-d.svg" />
      <img src="https://blockwallet.io/static/images/logo-discord.svg" width="32" />
    </picture>
  </a>
</div>



