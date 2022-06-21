import React from "react"
import classnames from "classnames"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { isHardwareWallet } from "../../util/account"
import Icon, { IconName } from "../ui/Icon"

export enum AccountMenuOptionType {
    REMOVE_ACCOUNT = "REMOVE_ACCOUNT",
    REMOVE_CONTACT = "REMOVE_CONTACT",
    EDIT = "EDIT",
    HIDE_ACCOUNT = "HIDE_ACCOUNT",
    UNHIDE_ACCOUNT = "UNHIDE_ACCOUNT",
    CUSTOM = "CUSTOM",
}

export interface AccountDisplayMenuOption {
    optionType: AccountMenuOptionType
    handler?: (accountAddress: string) => void
    component?: React.ComponentType<any>
    disabled?: boolean
}

const RemoveOption: React.FC<any> = ({ onClick }) => {
    return (
        <div
            onClick={onClick}
            className="flex flex-row space-x-2 items-center text-red-500"
        >
            <Icon name={IconName.TRASH_BIN} profile="danger" />
            <span>Remove</span>
        </div>
    )
}

const EditOption: React.FC<any> = ({ onClick }) => {
    return (
        <div
            className="flex flex-row space-x-2 items-center text-black"
            onClick={onClick}
        >
            <div className="pr-3">
                <Icon name={IconName.PENCIL} />
            </div>
            <span>Edit</span>
        </div>
    )
}

const HideAccountOption: React.FC<any> = ({ onClick, disabled }) => {
    return (
        <div
            className={classnames(
                "flex flex-row space-x-2 items-center text-black",
                disabled && "opacity-50 pointer-events-none"
            )}
            onClick={onClick}
        >
            <Icon name={IconName.CROSSED_OUT_EYE} />
            <span>Hide</span>
        </div>
    )
}

const UnHideAccountOption: React.FC<any> = ({ onClick, disabled }) => {
    return (
        <div
            className={classnames(
                "flex flex-row space-x-2 items-center text-black",
                disabled && "opacity-50 pointer-events-none"
            )}
            onClick={onClick}
        >
            <Icon name={IconName.EYE} />
            <span>Unhide</span>
        </div>
    )
}

const MENU_ITEM_BY_OPTION = {
    [AccountMenuOptionType.CUSTOM]: null,
    [AccountMenuOptionType.REMOVE_CONTACT]: RemoveOption,
    [AccountMenuOptionType.REMOVE_ACCOUNT]: RemoveOption,
    [AccountMenuOptionType.EDIT]: EditOption,
    [AccountMenuOptionType.HIDE_ACCOUNT]: HideAccountOption,
    [AccountMenuOptionType.UNHIDE_ACCOUNT]: UnHideAccountOption,
}

export interface AccountMenuOptionMetadata {
    requiresConfirmation: boolean
    Component: React.ComponentType<any>
    handler: (accountAddress: string) => void
    confirmationTitle?: string
    confirmationMessage?: string
}

export const getAccountMenuOptionMetadata = (
    menuItem: AccountDisplayMenuOption,
    account: AccountInfo
): AccountMenuOptionMetadata => {
    let defaultConfig = {
        Component:
            MENU_ITEM_BY_OPTION[menuItem.optionType] || menuItem.component!,
        handler: menuItem.handler!,
        requiresConfirmation: false,
    }
    switch (menuItem.optionType) {
        case AccountMenuOptionType.REMOVE_CONTACT: {
            return {
                ...defaultConfig,
                requiresConfirmation: true,
                confirmationTitle: "Remove contact",
                confirmationMessage: `Are you sure you want to remove this contact: ${account.name}?`,
            }
        }
        case AccountMenuOptionType.HIDE_ACCOUNT: {
            return {
                ...defaultConfig,
                requiresConfirmation: true,
                confirmationTitle: "Hide Account",
                confirmationMessage: `Hiding this account will remove it from your account list. All data, including assets and activities, will be deleted. You can access or re-add this account in the “My Accounts” page at any time.`,
            }
        }
        case AccountMenuOptionType.REMOVE_ACCOUNT: {
            return {
                ...defaultConfig,
                requiresConfirmation: true,
                confirmationTitle: "Remove External Account",
                confirmationMessage: isHardwareWallet(account.accountType)
                    ? "Removing an external account deletes all connected data from BlockWallet. You can re-connect your hardware wallet account at any time. Are you sure you want to remove this hardware wallet account?"
                    : "Removing an external account deletes all connected data from BlockWallet. You can re-add your external account at any time using your private key. Are you sure you want to remove this external account?",
            }
        }
    }
    return defaultConfig
}
