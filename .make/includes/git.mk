### Get the current status of all packages (make git/branch/show).
git/status:

	@for F in $(MODULES); do echo "---"; echo "$(PURPLE)Checking status in $(GREEN)$$F ..$(RESET)" && cd $(PWD)/$(MODULES_DIR)/$$F && git status; done || true
	@echo "---"
	@echo "$(GREEN)Checking status in this monorepo ..$(RESET)"
	@git status

### Create or replace a new git tag for a single package.
git/tag: guard-MOD guard-TAG guard-MSG

	@echo "Tagging $(GREEN)$(MOD)$(RESET) with tag $(GREEN)$(TAG)$(RESET).."
	@cd $(MODULES_DIR)/$(MOD) && git tag -f -m"$(MSG)" $(TAG) && git push origin --tags -f

### Create or replace a new git tag for a ALL packages.
git/tag/all: guard-TAG guard-MSG

	@for MODULE in $(MODULES); do \
		$(MAKE) MODULE=$$MODULE git/tag; \
	done

### Delete a tag for a single package.
git/tag/delete: guard-MOD guard-TAG

	@echo "Deleting tag for $(GREEN)$(MOD)$(RESET) with tag $(GREEN)$(TAG)$(RESET).."
	@cd $(MODULES_DIR)/$(MOD) && git tag -d $(TAG) && git push --delete origin $(TAG)

### Delete git tag for a ALL packages.
git/tag/delete/all: guard-TAG

	@for MODULE in $(MODULES); do \
		$(MAKE) MODULE=$$MODULE git/tag/delete; \
	done

### Commit changes across all packages (does not push!).
git/commit/all: guard-MSG

	@for F in $(MODULES); do echo "$(YELLOW)Committing in $$F$(BLUE)" && cd $(PWD)/$(MODULES_DIR)/$$F && git add . && git commit -am'$(MSG)' && git push origin; done

### Commit and push all changes for module (make git/commit-push PKG=some-package-name MSG="my changes").
git/commit-push: guard-PKG guard-MSG

	@echo "$(GREEN)Committing changes for $(YELLOW)$$MODULE$(RESET) ..";
	@cd $(PWD)/$(MODULES_DIR)/$(PKG) && git add . && git commit -am "$(BRANCH) - $(MSG)" || true;
	@echo
	@echo "$(GREEN)Pushing up changes for $(YELLOW)$$MODULE$(RESET) ..";
	@cd $(PWD)/$(MODULES_DIR)/$(PKG) && git push origin $(BRANCH)
	@echo
	@echo "$(GREEN)Committing changes for $(YELLOW).make$(RESET) ..";
	@cd $(PWD)/.make && git commit -am "$(BRANCH) - $(MSG)" || true
	@echo
	@echo "$(GREEN)Pushing up changes for $(YELLOW)monorepo$(RESET) ..";
	@cd $(PWD)/.make && git push origin $(BRANCH)|| true
	@echo
	@echo "$(GREEN)Committing changes for $(YELLOW)monorepo$(RESET) ..";
	@git commit -am "$(BRANCH) - $(MSG)" || true
	@echo
	@echo "$(GREEN)Pushing up changes for $(YELLOW)monorepo$(RESET) ..";
	@git push origin $(BRANCH)|| true

### Commit and push all changes for all submodules (make git/commit-push/all MSG="my changes").
git/commit-push/all: guard-MSG

	@for F in $(MODULES); do echo "$(GREEN)Committing $$F ..$(RESET)" && cd $(PWD)/$(MODULES_DIR)/$$F && git add . && git commit -am "`git rev-parse --symbolic-full-name --abbrev-ref HEAD` - $(MSG)"; git push origin `git rev-parse --symbolic-full-name --abbrev-ref HEAD`; done || true

	@echo "Committing $(PURPLE)`git rev-parse --symbolic-full-name --abbrev-ref HEAD`$(RESET) in $(PURPLE)monorepo$(RESET).."
	@git commit -am "`git rev-parse --symbolic-full-name --abbrev-ref HEAD` - $(MSG)" || true
	@git push origin `git rev-parse --symbolic-full-name --abbrev-ref HEAD` || true

### Create a new branch across all modules (make git/new BRANCH=awesome-branch).
git/new: guard-BRANCH

	@[ -z `git rev-parse --verify --quiet $(BRANCH)` ] && git checkout -b $(BRANCH) || echo "Branch exists.. skipping.."
	@git push -u origin $(BRANCH)
	@for F in $(MODULES); do echo "$(GREEN)Creating new branch in $(RESET)$(PURPLE)$$F$(RESET) on branch $(GREEN)$(BRANCH)$(RESET)"; cd $(PWD)/$(MODULES_DIR)/$$F; [ -z `git rev-parse --verify --quiet $(BRANCH)` ] && git checkout -b $(BRANCH) && git fetch; git push -u origin $(BRANCH); echo; done

### Checkout an EXISTING branch (make git/checkout BRANCH=master).
git/checkout:

	@echo "Checking out $(PURPLE)$$BRANCH$(RESET) in $(PURPLE)monorepo$(RESET).."
	@git checkout $(BRANCH)
	@for F in $(MODULES); do echo "$(PURPLE)Checking out $(PURPLE)$$BRANCH$(RESET) in $(GREEN)$$F$(RESET) .." && cd $(PWD)/$(MODULES_DIR)/$$F && git fetch && git checkout $$BRANCH && git status; done || true

### Merge an EXISTING branch (make git/merge BRANCH=master).
git/merge: guard-BRANCH

	@for F in $(MODULES); do echo "$(PURPLE)Merging $(PURPLE)$$BRANCH$(RESET) in $(GREEN)$$F$(RESET) .." && cd $(PWD)/$(MODULES_DIR)/$$F && git merge $$BRANCH; done || true

	@echo "Merging $(PURPLE)$$BRANCH$(RESET) in $(PURPLE)monorepo$(RESET).."
	@git merge $(BRANCH)

	@echo "\nMerge complete! Do you want to.. $(YELLOW)make git/commit-and-push/all MSG=\"change this\"$(RESET) next?\n"

## Checkout and pull changes from an EXISTING branch (make git/pull BRANCH=master).
update: guard-BRANCH

	@echo "Checking out $(PURPLE)$$BRANCH$(RESET) in $(PURPLE)monorepo$(RESET).."
	@git checkout $(BRANCH)
	@echo "Pulling changes from $(PURPLE)$$BRANCH$(RESET) in $(PURPLE)monorepo$(RESET).."
	@git pull origin $(BRANCH)
	@for F in $(MODULES); do echo "$(PURPLE)Checking out & pulling changes from $(PURPLE)$$BRANCH$(RESET) in $(GREEN)$$F$(RESET) .." && cd $(PWD)/$(MODULES_DIR)/$$F && git fetch && git checkout $$BRANCH && git pull origin $$BRANCH && git status; done || true

