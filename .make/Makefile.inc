TIME             := $(shell date +"%Y-%m-%d_%H%M%S")
SELF_DIR         := $(dir $(lastword $(MAKEFILE_LIST)))
export

include $(SELF_DIR)/includes/pre.mk
include $(SELF_DIR)/includes/colors.mk
include $(SELF_DIR)/includes/help.mk
include $(SELF_DIR)/includes/git.mk
include $(SELF_DIR)/includes/guard.mk
# include $(SELF_DIR)/includes/nodejs.mk