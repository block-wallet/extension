INLINE_RUNTIME_CHUNK	:= false


test/ui:
	yarn test --testTimeout 10000

build/ui:
	@echo 'Building app...'
	@rm -rf dist
	@yarn build:tailwind
	@node webpack/scripts/build.js
	@mkdir -p ../../dist
	@cp -r build/* ../../dist
	@rm -rf build
	@cp ../../dist/index.html ../../dist/tab.html
	@mv ../../dist/index.html ../../dist/popup.html

depcheck:
	@npx depcheck

version/patch: 
	@yarn version --patch

version/minor: 
	@yarn version --minor

version/major:
	@yarn version --major
