include .make/Makefile.inc
#include packages/background/Makefile
#include packages/ui/Makefile
BRANCH					:= $(shell git symbolic-ref --short -q HEAD | sed 's/[\.\/]/-/g')
MODULES_DIR 			:= packages
MODULES					:= $(shell ls $(MODULES_DIR))
INLINE_RUNTIME_CHUNK	:= false
GENERATE_SOURCEMAP		:= false
TS_NODE_PROJECT			:= tsconfig.json



test/background:
	@cd packages/background && $(MAKE) test/background

test:
	$(MAKE) test/background


install:
	@cd packages/background && rm -rf node_modules
	@cd packages/ui && rm -rf node_modules
	@cd packages/provider && rm -rf node_modules
	@cd packages/background && yarn install
	@cd packages/ui && yarn install
	@cd packages/provider && yarn install
	

cp/snarks:
	@mkdir -p dist/snarks/tornado
	@cp utils/tornado/* dist/snarks/tornado

build:
	@cd packages/ui && $(MAKE) build/ui --no-print-directory
	@cd packages/background && $(MAKE) build/background --no-print-directory
	@$(MAKE) cp/snarks --no-print-directory