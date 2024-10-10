TS_NODE_PROJECT			:= tsconfig.json
BRANCH					:= $(shell git symbolic-ref --short -q HEAD | sed 's/[\.\/]/-/g')
ENVIRONMENT				?= dev
BROWSER					?= chrome


build/provider:
ifeq ($(ENVIRONMENT), dev)
	@echo "Building in development mode"
	npx webpack --config ./webpack/webpack.provider.dev.js
	npx webpack --config ./webpack/webpack.content.dev.js
else
	@echo "Building in production mode"
	npx webpack --config ./webpack/webpack.provider.js
	npx webpack --config ./webpack/webpack.content.js
endif
ifeq ($(BROWSER), firefox)
	@mkdir -p ../../dist-firefox
	@cp  ../../dist/content.js ../../dist-firefox/content.js
	@cp  ../../dist/blankProvider.js ../../dist-firefox/blankProvider.js
endif

test/provider:
	yarn nyc -a --reporter=html --reporter=text mocha './test' --require esm --require isomorphic-fetch --require jsdom-global/register --require ts-node/register  --require tsconfig-paths/register 'test/**/*.test.ts' --timeout 10000 --exit

version/patch:
	@yarn version --patch

version/minor:
	@yarn version --minor

version/major:
	@yarn version --major
