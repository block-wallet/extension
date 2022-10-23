TS_NODE_PROJECT			 := ./tsconfig.json
TS_NODE_COMPILER_OPTIONS := $(shell echo {\"module\": \"commonjs\" })
BRANCH					 := $(shell git symbolic-ref --short -q HEAD | sed 's/[\.\/]/-/g')
TS_CONFIG_PATHS 		 := true
ENVIRONMENT				 ?= dev
export

#test:
#	yarn nyc --reporter=text mocha './test' --require esm  --require isomorphic-fetch --require jsdom-global/register --require ts-node/register 'test/**/*.test.ts' --exit

test/background:
	yarn nyc -a \
		--reporter=html \
		--reporter=text mocha './test' \
		--require esm \
		--require isomorphic-fetch \
		--require jsdom-global/register \
		--require ts-node/register 'test/**/*.test.ts' \
		--require tsconfig-paths/register \
		--require './test/mocks/sinonChrome.js' \
		--timeout 10000 \
		--exit

build/background:
ifeq ($(ENVIRONMENT), dev)
	@echo "Building in development mode"
	npx webpack --config ./webpack/webpack.dev.js
else
	@echo "Building in production mode"
	npx webpack --config ./webpack/webpack.config.js


depcheck:
	@npx depcheck

version/patch: 
	@yarn version --patch

version/minor: 
	@yarn version --minor

version/major:
	@yarn version --major
