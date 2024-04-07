# Release guideline

## I don't want to read this whole thing I just have a question

We have an official website board with detailed [articles](https://blockwallet.io/docs) with helpful advices if you have questions .

## Did you find a bug?

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/block-wallet/extension-background/issues).

## Did you write a patch that fixes a bug?

- Open a new GitHub pull request with the patch.
- Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.

## Do you intend to add a new feature or change an existing one?

- Suggest your change in an email to info@blockwallet.io
- Do not open an issue on GitHub until you have collected positive feedback about the change. GitHub issues are primarily intended for bug reports and fixes.

## Did you fix whitespace, format code, or make a purely cosmetic patch?

We are using ESlint to format the code, you can see the configuration inside the [editorconfig](https://github.com/block-wallet/extension-background/blob/master/.editorconfig) file, so changes that are cosmetic in nature and do not add anything substantial to the stability or functionality won't be accepted.

## How to release a new version?

- Create a pull request.
- Assign your reviewers and create a conversation thread if it's needed.
- run [tag](https://github.com/block-wallet/extension-background/actions/workflows/tag.yml) workflow specifying a tag and optionally the commit and a message
