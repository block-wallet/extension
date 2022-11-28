import {
    AccountInfo,
    Accounts,
} from "@block-wallet/background/controllers/AccountTrackerController"
import { AccountStatus, AccountType } from "../context/commTypes"

const accountSort = (a: AccountInfo, b: AccountInfo) => {
    return a.index > b.index ? 1 : -1
}

export const getSortedAccounts = (accounts: Accounts): AccountInfo[] => {
    return Object.values(accounts).sort(accountSort)
}

export const isHiddenAccount = (account: AccountInfo): boolean => {
    return account.status?.toString() === AccountStatus.HIDDEN.toString()
}

export const getDefaultAccountName = (accountNumber: number): string => {
    return `Account ${accountNumber}`
}

/**
 * The list of account types that are considered hardware wallets.
 */
export const HARDWARE_TYPES = [AccountType.TREZOR, AccountType.LEDGER]

/**
 * isHardwareWallet
 *
 * @param accountType the account type to return if it is a hardware wallet for
 * @returns bool if it is a hardware wallet
 */
export const isHardwareWallet = (accountType: AccountType) => {
    return HARDWARE_TYPES.includes(accountType)
}

/**
 * isInternalAccount
 *
 * @param accountType the account type to return whether it is an internal account or not.
 * @returns bool if it is an internal account
 */
export const isInternalAccount = (accountType: AccountType): boolean => {
    return !accountType || accountType === AccountType.HD_ACCOUNT
}

export const isActiveAccount = (accountInfo: AccountInfo): boolean => {
    return accountInfo.status?.toString() === AccountStatus.ACTIVE
}

/**
 * isExternalAccount
 *
 * @param accountType the account type to return whether it is an external account or not.
 * @returns bool if it is an external account
 */
export const isExternalAccount = (accountType: AccountType): boolean => {
    return accountType === AccountType.EXTERNAL
}

/**
 * Checks if the given name already exists in the accounts array
 *
 * @param accounts collections of accounts to check whether the name exists or not
 * @param name string to match the account name
 * @returns bool if the account name is already taken by another account
 */
export const accountNameExists = (
    accounts: Accounts,
    name: string
): boolean => {
    const normalizeAccountName = (name: string) => name.replace(/ /g, "")
    return Object.values(accounts || {}).some(
        (a) => normalizeAccountName(a.name) === normalizeAccountName(name)
    )
}

/**
 * Returns the first available account name starting with the provided number. The account names are built using {@link getDefaultAccountName} function
 *
 * @param accounts collections of accounts to calculate the first available account name
 * @param accountNumber starting point for checking names availability.
 * @returns string of the first available account name using the {@link getDefaultAccountName} function.
 */
export const getNextAccountName = (
    accounts: Accounts,
    accountNumber = 1
): string => {
    const nextAccountName = getDefaultAccountName(accountNumber)
    if (accountNameExists(accounts, nextAccountName)) {
        return getNextAccountName(accounts, accountNumber + 1)
    }
    return nextAccountName
}
