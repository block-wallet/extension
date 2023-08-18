INLINE_RUNTIME_CHUNK	:= false
BROWSER					?= chrome


test/ui:
	yarn test --testTimeout 10000

build/ui:
	@echo 'Building BlockWallet UI'
	@rm -rf dist
	@yarn build:tailwind
	@node webpack/scripts/build.js
	@mkdir -p ../../dist
	@cp -r build/* ../../dist
	@cp ../../dist/index.html ../../dist/tab.html
	@mv ../../dist/index.html ../../dist/popup.html
	@rm -rf build


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
