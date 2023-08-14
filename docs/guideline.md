# Table of contents

- [Table of contents](#table-of-contents)
- [Monorepo guideline](#monorepo-guideline)
  - [Explanation](#explanation)
    - [🧰 What is a Monorepo?](#-what-is-a-monorepo)
    - [⚙️ Why are we using a Monorepo?](#️-why-are-we-using-a-monorepo)
    - [⬆ Block extension structure](#-block-extension-structure)
  - [⛓ How do I work with the Monorepo?](#-how-do-i-work-with-the-monorepo)
    - [🚉 Getting Started](#-getting-started)
    - [🆕 Creating a new branch](#-creating-a-new-branch)
    - [⤴ Committing changes](#-committing-changes)
    - [⤴ Open a Pull Request](#-open-a-pull-request)

# Monorepo guideline

## Explanation

### 🧰 What is a Monorepo?

A monorepo is a single repository that stores all of your code for every project, said code generally depends on each other.

### ⚙️ Why are we using a Monorepo?

We decided to use the monorepo structure to achieve the following:

- Improve code readability.
- Make Testing and code maintenance simpler, improving code quality.
- Provide us with complete, functional and tested releases ready to be used by their related dependencies
- Diminish CI/CD execution time.

### ⬆ Block extension structure

- extension (monorepo)
- packages
  - background
  - ui
  - provider

## ⛓ How do I work with the Monorepo?

### 🚉 Getting Started

When getting started for the first time run the following:

```bash
git clone https://github.com/block-wallet/extension
cd extension
```

### 🆕 Creating a new branch

When you are working on something that does not relate to an existing branch, create one from master. Remember to follow the [convention](convention.md) for the branch names.

### ⤴ Committing changes

To commit your change(s) just add your file/s and then commit your changes with a message that follows the [convention](convention.md).


### ⤴ Open a Pull Request

Once your changes are ready please open a Pull Request and complete the template. The reviewer team will check your PR and when it's approved you'll be able to merge it. In case you want to do an external contribution please create an Issue with your proposal. 
