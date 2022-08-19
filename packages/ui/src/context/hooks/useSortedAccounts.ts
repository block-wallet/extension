import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useMemo } from "react"
import { getSortedAccounts } from "../../util/account"
import { useBlankState } from "../background/backgroundHooks"

export const useSortedAccounts = (
    {
        includeHiddenAccounts,
        filterCurrentAccount,
    }: {
        includeHiddenAccounts?: boolean
        filterCurrentAccount?: boolean
    } = { includeHiddenAccounts: false, filterCurrentAccount: false }
): AccountInfo[] => {
    const { accounts, hiddenAccounts, selectedAddress } = useBlankState()!
    return useMemo(() => {
        return getSortedAccounts({
            ...accounts,
            ...(includeHiddenAccounts ? hiddenAccounts : {}),
        }).filter((account) => {
            if (filterCurrentAccount) {
                return account.address !== selectedAddress
            }
            return true
        })
    }, [
        accounts,
        hiddenAccounts,
        includeHiddenAccounts,
        selectedAddress,
        filterCurrentAccount,
    ])
}
