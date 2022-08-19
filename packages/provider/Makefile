TS_NODE_PROJECT			:= tsconfig.json
BRANCH					:= $(shell git symbolic-ref --short -q HEAD | sed 's/[\.\/]/-/g')
ENVIRONMENT				?= dev

build/provider:
	@if [ "$(ENVIRONMENT)" == "dev" ]; then \
		npx webpack --config ./webpack/webpack.dev.js; \
	else \
		npx webpack --config ./webpack/webpack.config.js; \
	fi

test/provider:
	yarn nyc -a --reporter=html --reporter=text mocha './test' --require esm --require isomorphic-fetch --require jsdom-global/register --require ts-node/register  --require tsconfig-paths/register 'test/**/*.test.ts' --timeout 10000 --exit