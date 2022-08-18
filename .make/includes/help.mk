.PHONY: help h
.DEFAULT_GOAL := help

h: help

help: header

	@echo "Usage: ${YELLOW}make${RESET} ${GREEN}<target1 target2..> <SOME_VAR=value..>${RESET}"
	@echo
	@echo " Tools:"
	@echo
	@awk '/^[a-zA-Z\/\-_0-9]+:/ { \
			helpMessage = match(lastLine, /^## (.*)/); \
			if (helpMessage) { \
					helpCommand = substr($$1, 0, index($$1, ":")-1); \
					helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
					printf "  🛠 ${GREEN}%-31s${RESET} ${GRAY}%s${RESET}\n", helpCommand, helpMessage; \
			} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
	@echo
	@echo "Global Module Targets (at the monorepo level):"
	@echo
	@awk '/^[a-zA-Z\/\-_0-9]+:/ { \
			helpMessage = match(lastLine, /^### (.*)/); \
			if (helpMessage) { \
					helpCommand = substr($$1, 0, index($$1, ":")-1); \
					helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
					printf "  👉 ${GREEN}%-30s${RESET} ${GRAY}%s${RESET}\n", helpCommand, helpMessage; \
			} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
	@echo
