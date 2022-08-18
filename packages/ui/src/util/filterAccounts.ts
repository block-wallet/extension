import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { isExternalAccount, isHardwareWallet, isHiddenAccount } from "./account"

export enum AccountFilter {
    ALL = "all",
    HIDDEN = "hidden",
    HARDWARE = "hardware",
    EXTERNAL = "external",
}

const AccountFilterOptions = {
    [AccountFilter.ALL]: {
        combinableValues: [AccountFilter.HIDDEN],
    },
    [AccountFilter.HIDDEN]: {
        combinableValues: [
            AccountFilter.ALL,
            AccountFilter.HARDWARE,
            AccountFilter.EXTERNAL,
        ],
    },
    [AccountFilter.HARDWARE]: {
        combinableValues: [AccountFilter.HIDDEN, AccountFilter.EXTERNAL],
    },
    [AccountFilter.EXTERNAL]: {
        combinableValues: [AccountFilter.HIDDEN, AccountFilter.HARDWARE],
    },
}

/**
 * Normalizes the filters value to ALL if there is no filter selected yet.
 * @param filters array of filters
 * @returns
 */
export const getAccountFilterValue = (filters: string[]): string[] => {
    if (!filters || filters.length === 0) {
        return [AccountFilter.ALL]
    }
    return filters
}

/**
 * Given an array of filters and a new picked filter resolves the next filters values
 * checking which filters can be combined.
 * @param newFilter new picked filter
 * @param currentFilters array of current selected filters.
 * @returns
 */
export const getNextAccountFilterValue = (
    newFilter: AccountFilter,
    currentFilters: string[]
): string[] => {
    if (currentFilters.includes(newFilter)) {
        const nextFilters = currentFilters.filter(
            (filter) => filter !== newFilter
        )
        if (
            !nextFilters.includes(AccountFilter.EXTERNAL) &&
            !nextFilters.includes(AccountFilter.HARDWARE)
        ) {
            return [AccountFilter.ALL, ...nextFilters]
        }
        return nextFilters
    }
    const options = AccountFilterOptions[newFilter]
    const filteredFilters = (currentFilters || []).filter((filter) => {
        return options.combinableValues.includes(filter as AccountFilter)
    })
    return [newFilter, ...filteredFilters]
}

const matchByTerm = (term?: string) => (account: AccountInfo): boolean => {
    if (!term) return true
    return (
        account.name.toLowerCase().includes(term) ||
        account.address.toLowerCase().includes(term)
    )
}

const filterByAccountFilter = (accountFilters?: AccountFilter[]) => (
    account: AccountInfo
): boolean => {
    const safeFilters = getAccountFilterValue(accountFilters as string[])

    //Hidden accounts cannot be hardware/external
    if (safeFilters.includes(AccountFilter.HIDDEN)) {
        if (isHiddenAccount(account)) {
            return true
        }
    } else if (isHiddenAccount(account)) {
        return false
    }

    if (
        safeFilters.includes(AccountFilter.HARDWARE) &&
        isHardwareWallet(account.accountType)
    ) {
        return true
    }

    if (
        safeFilters.includes(AccountFilter.EXTERNAL) &&
        isExternalAccount(account.accountType)
    ) {
        return true
    }

    return safeFilters.includes(AccountFilter.ALL)
}

/**
 * Util to filter an account list by name or address.
 * @param accounts account list to filter
 * @param term string value to apply
 * @returns filtered account list
 */

export const filterAccounts = (
    accounts: AccountInfo[],
    {
        term,
        accountFilters,
    }: { term?: string; accountFilters?: AccountFilter[] }
) => {
    return accounts
        .filter(matchByTerm(term))
        .filter(filterByAccountFilter(accountFilters))
}
