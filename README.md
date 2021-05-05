# Blank Wallet Extension

# Guideline

See [guideline](docs/guideline.md)
# TL;DR

```bash
git clone git@github.com:Blank-Wallet/extension.git
cd extension
git submodule update --init --recursive
make git/branch/checkout BRANCH=master
cd packages/background && cp env.orig .env
```

> 👉 Complete the variables value inside .env

## FAQ

- ### git@github.com: Permission denied (publickey)

  - Create an ssh key opening a terminal and using ```ssh-keygen``` (you can press enter for every input).
  - In a terminal type ```cat ~/.ssh/id_rsa.pub``` and copy the content.
  - Add the ssh key to github following this [guide](https://docs.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account) from step 2.

