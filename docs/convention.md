# Convention

This convention applies for the commit messages and branch names within this repository. Also, there's stage in the GitHub Workflow that ensures this convention.

# Objective

Using a semantic Git commit method can greatly improve the readability 
of Git logs and help to organize the scope of individual commits.

# Description

## Commit messages

Semantic Git commits start with a semantic tag and use an imperative voice. Git commit messages should be prefixed with one the following tags:

```
feat: implement new features for endusers

fix: bug fix for endusers (not a build-process fix)

docs: update to project documentation

style: update code formatting (indentation, tabs vs spaces, etc.)

refactor: refactoring of code

test: adding or updating tests

chore: updates to build process
```

### feat

The feat: tag should be used to identify new features or changes to production code that endusers will see. An example might be adding a method to sort posts based on popularity. It does not include changes to build process code, such as adding HTML minification in the build process pipeline.

Example

```"feat: add ability to view most popular posts"```

### fix
The fix: tag should be used to identify any bug fixes to production code. This includes any fix that would effect the enduser, not the build process.

Example

```"fix: check if file exists before attempting to unlink"```

### docs
The docs: tag is fairly straightforward and should be used to identify changes to the project documentation, either internal or client-facing.

Example

```"docs: add detailed installation instructions for Ubuntu"```

### style
The style: tag should be used to identify changes made to the code style, which do not effect the enduser. Note that this is separate from the styling of user interfaces, which does effect the enduser. For example, a style change may indicate a change from using tab indentation to spaces.

For style updates that would effect the enduser, such as CSS changes, use the feat: tag instead.

Example

```"style: convert from 4 space indentation to 2 spaces"```

### refactor
The refactor: tag should be used to identify refactoring in the codebase. This includes changing variable names, combining or simplifying code, etc.

Example

```"refactor: rename ArticleController to PostController"```

### test
The test: tag should be used to identify changes surrounding tests.

Example

```"test: add assertions for Collection update and destroy methods"```

### chore
The chore: tag should be used to identify changes to build scripts and other updates that do not alter production code. This might include dependency package updates or build script configuration edits.

Example

```"chore: update build script to webpack 4"```


## Branch names

Based on the previous standard, the branch names must start with the following preffixes:

```
feat/: implement new features for endusers
fix/: bug fix for endusers (not a build-process fix)
docs/: update to project documentation
style/: update code formatting (indentation, tabs vs spaces, etc.)
refactor/: refactoring of code
test/: adding or updating tests
chore/: updates to build process
release/: updates related to a new release. This is only used by our Release workflow.
dependabot/: branch use by the Dependabot
```

# Workflow

There's a GitHub workflow called **Convention** with a *validation* stage that checks commit messages and branch names when there's a new Pull Request using *master* branch as a target.

## Fix 

### Commits messages

There are several ways to update old commit messages. The easiest way to do it is using an *amend* or *rebase*. More information here https://thoughtbot.com/blog/git-interactive-rebase-squash-amend-rewriting-history.


### Branch name

The easiest way to fix a branch name is to rename it locally, delete the remote branch with the wrong name and then push the renamed branch. More information here https://www.w3docs.com/snippets/git/how-to-rename-git-local-and-remote-branches.html.
