import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useMemo, useState } from "react"
import { filterAccounts } from "../../filterAccounts"

const useAccountSearch = (accounts: AccountInfo[]) => {
    const [search, setSearch] = useState("")
    const result = useMemo(
        () => filterAccounts(accounts, { term: (search || "").toLowerCase() }),
        [search, accounts]
    )
    return {
        accounts: result,
        search,
        onChangeSearch: setSearch,
    }
}

export default useAccountSearch
