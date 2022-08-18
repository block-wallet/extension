guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "\n👉 ${YELLOW}Environment variable ${GREEN}$*${YELLOW} not set (make $*=.. target or export $*=..${RESET}"; \
		echo "\n👉 Run ${GREEN}make help${RESET} for options..\n"; \
		exit 1; \
	fi
