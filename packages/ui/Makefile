INLINE_RUNTIME_CHUNK	:= false
BROWSER					?= chrome


test/ui:
	yarn test --testTimeout 10000

build/ui:
	@echo 'Building BlockWallet UI'
	@rm -rf dist
	@yarn build:tailwind
	@node webpack/scripts/build.js
ifeq ($(BROWSER), firefox)
	$(MAKE) copy/firefox --no-print-directory
else
	$(MAKE) copy/chrome --no-print-directory
endif
	@rm -rf build


copy/firefox:
	@mkdir -p ../../dist-firefox
	@cp -r build/* ../../dist-firefox
	@cp ../../dist-firefox/index.html ../../dist-firefox/tab.html
	@mv ../../dist-firefox/index.html ../../dist-firefox/popup.html

copy/chrome:
	@mkdir -p ../../dist
	@cp -r build/* ../../dist
	@cp ../../dist/index.html ../../dist/tab.html
	@mv ../../dist/index.html ../../dist/popup.html

build/manifest:
	@echo 'Generating manifest.json for $(BROWSER)...'
	@node webpack/scripts/manifest.js $(BROWSER)

depcheck:
	@npx depcheck

version/patch:
	@yarn version --patch

version/minor:
	@yarn version --minor

version/major:
	@yarn version --major
