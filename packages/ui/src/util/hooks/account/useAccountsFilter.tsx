import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useMemo } from "react"
import { AccountFilter, filterAccounts } from "../../filterAccounts"

const useAccountsFilter = (accounts: AccountInfo[], filters: string[]) => {
    return useMemo(() => {
        return filterAccounts(accounts, {
            accountFilters: filters as AccountFilter[],
        })
    }, [accounts, filters])
}

export default useAccountsFilter
