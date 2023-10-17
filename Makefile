ENVIRONMENT				?= dev
BROWSER					?= chrome

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
	@echo "Installing Background package..."
	@cd packages/background && yarn install
	@echo "Installing UI package"
	@cd packages/ui && yarn install
	@echo "Installing Provider package"
	@cd packages/provider && yarn install

install/ci:
	@cd packages/background && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1
	@cd packages/ui && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1
	@cd packages/provider && yarn install --prefer-offline --frozen-lockfile --network-concurrency 1

build/ui:
	@cd packages/ui && BROWSER=$(BROWSER) $(MAKE) build/ui --no-print-directory

build/background:
	@cd packages/background && BROWSER=$(BROWSER) $(MAKE) build/background --no-print-directory

build/provider:
	@cd packages/provider && BROWSER=$(BROWSER) $(MAKE) build/provider --no-print-directory

cp/release-notes:
ifeq ($(BROWSER), firefox)
	@cp release-notes.json dist-firefox
else
	@cp release-notes.json dist
endif

build:
	@rm -Rf dist-firefox
	@rm -Rf dist
	@$(MAKE) ENVIRONMENT=$(ENVIRONMENT) build/background --no-print-directory
	@$(MAKE) ENVIRONMENT=$(ENVIRONMENT) build/provider --no-print-directory
	@$(MAKE) build/ui --no-print-directory
ifeq ($(BROWSER), firefox)
	@mkdir -p dist-firefox && cp -r dist/* dist-firefox/
	@rm -Rf dist
endif
	@$(MAKE) BROWSER=$(BROWSER) build/manifest --no-print-directory
	@$(MAKE) BROWSER=$(BROWSER) cp/release-notes --no-print-directory

build/prod:
	@rm -Rf dist/
	@rm -Rf dist-firefox/
	@$(MAKE) ENVIRONMENT=prod build/background --no-print-directory
	@$(MAKE) ENVIRONMENT=prod build/provider --no-print-directory
	@$(MAKE) GENERATE_SOURCEMAP=false build/ui --no-print-directory
	@mkdir dist-firefox && cp -r dist/* dist-firefox/
	@$(MAKE) BROWSER=chrome build/manifest --no-print-directory
	@$(MAKE) BROWSER=firefox build/manifest --no-print-directory
	@cp release-notes.json dist
	@cp release-notes.json dist-firefox


build/manifest:
	@cd packages/ui && BROWSER=$(BROWSER) $(MAKE) build/manifest --no-print-directory

build/prod-zip:
	@rm -Rf dist/
	@$(MAKE) ENVIRONMENT=prod build/prod
	@zip -r -D block-extension-chrome.zip dist/
	@zip -r -D block-extension-firefox.zip dist-firefox/