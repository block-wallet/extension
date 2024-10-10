# Workflows

There are some different GitHub in this repository. Each of them with a specific purpose:

## Build

This workflow is used to start a release process. It requires some initial data using a workflow form and it ends opening a GitHub pull request.

## Release

Once the previous pull request is merged this workflow is launched. It creates the GitHub release as a draft with some artifacts attached, like the extension. We change form draft to published when the extension is uploaded to the Chrome Web Store.

## Convention

This workflow runs when a pull request is opened with master as a target branch. It checks that the commit messages and branch name follow our [convention](docs/convention.md)

## CI

This workflow runs on every push:

- Lint: it checks the code style of each [package](packages)
- Test: it runs the tests of each [package](packages)
- Build: it builds the extension
- e2e: it runs some end-to-end tests

## Dependabot

GitHub's Dependabot helps us to maintain our dependencies updated by opening pull requests when it's necessary.
