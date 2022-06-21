### Upgrade package in package.json to the latest version.
npm/upgrade: guard-MOD guard-PKG

	@cd $(MODULES_DIR)/$(MOD) && npm install $(PACKAGE)@latest

### Upgrade package in package.json in ALL modules to the latest version.
npm/upgrade/all: guard-PKG

	@for MODULE in $(MOD); do \
		if [ -f "$(PWD)/$(MODULES_DIR)/$$MODULE/package.json" ]; then \
			echo; \
			echo "Upgrading NPM package $(GREEN)$(PACKAGE)$(RESET)@$(YELLOW)latest$(RESET) version for $(PURPLE)$$MODULE$(RESET).."; \
			echo; \
			cd $(PWD)/$(MODULES_DIR)/$$MODULE && pnpm install "$$PACKAGE@latest"; \
			echo; \
		fi \
	done \
