ENVIRONMENT				?= dev

depcheck:
	@cd packages/background && npx depcheck
	@cd packages/ui && npx depcheck

test/background:
	@cd packages/background && $(MAKE) test/background

test/ui:
	@cd packages/ui && $(MAKE) test/ui

test/provider:
	@cd packages/provider && $(MAKE) test/provider

test:
	$(MAKE) test/background
	$(MAKE) test/ui
	$(MAKE) test/provider

lint:
	@cd packages/background && yarn lint
	@cd packages/ui && yarn lint
	@cd packages/provider && yarn lint

install:
	@cd packages/background && rm -rf node_modules
	@cd packages/ui && rm -rf node_modules
	@cd packages/provider && rm -rf node_modules
	@cd packages/background && yarn install
	@cd packages/ui && yarn install
	@cd packages/provider && yarn install

install/ci:
	@cd packages/background && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1
	@cd packages/ui && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1
	@cd packages/provider && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1

build/ui:
	@cd packages/ui && $(MAKE) build/ui --no-print-directory

build/background:
	@cd packages/background && $(MAKE) build/background --no-print-directory

build/provider:
	@cd packages/provider && $(MAKE) build/provider --no-print-directory

cp/release-notes:
	@cp release-notes.json dist

build:
	@rm -Rf dist/
	@$(MAKE) ENVIRONMENT=$(ENVIRONMENT) build/background --no-print-directory
	@$(MAKE) ENVIRONMENT=$(ENVIRONMENT) build/provider --no-print-directory
	@$(MAKE) build/ui --no-print-directory
	@$(MAKE) cp/release-notes --no-print-directory

build/prod:
	@rm -Rf dist/
	@$(MAKE) ENVIRONMENT=prod build/background --no-print-directory
	@$(MAKE) ENVIRONMENT=prod build/provider --no-print-directory
	@$(MAKE) GENERATE_SOURCEMAP=false build/ui --no-print-directory
	@$(MAKE) cp/release-notes --no-print-directory

build/prod-zip:
	@rm -Rf dist/
	@$(MAKE) ENVIRONMENT=prod build/background --no-print-directory
	@$(MAKE) ENVIRONMENT=prod build/provider --no-print-directory
	@$(MAKE) build/ui --no-print-directory
	@$(MAKE) cp/release-notes --no-print-directory
	@zip -r -D block-extension.zip dist/