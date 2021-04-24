include .make/Makefile.inc
BRANCH					:= $(shell git symbolic-ref --short -q HEAD | sed 's/[\.\/]/-/g')
MODULES_DIR 			:= packages
MODULES					:= $(shell ls $(MODULES_DIR))
INLINE_RUNTIME_CHUNK	:= false
GENERATE_SOURCEMAP		:= false
TS_NODE_PROJECT			:= tsconfig.json


test:
	$(MAKE) test/background

test/background:
	#@nyc --reporter=text mocha
	cd packages/background/ && yarn nyc -a --reporter=html --reporter=text mocha './test' --require esm  --require isomorphic-fetch --require jsdom-global/register --require ts-node/register 'test/**/*.test.ts' --exit

install:
	@yarn install

cp/snarks:
	mkdir -p dist/snarks/tornado
	cp utils/tornado/* dist/snarks/tornado
	
### build background
build/background:
	if [ $(BRANCH) != "master" ]; then \
		npx webpack --config ./scripts/background/webpack.dev.js; \
	else \
		npx webpack --config ./scripts/background/webpack.config.js; \
	fi

build:
	echo 'Building app...'
	rm -rf dist
	cd packages/ui/ && yarn build:tailwind
	cd packages/ui/ && node ../../scripts/ui/scripts/build.js
	mkdir -p dist
	cp -r build/* dist
	rm -rf build
	cp dist/index.html dist/tab.html
	mv dist/index.html dist/popup.html

	@$(MAKE) build/background
	@$(MAKE) cp/snarks