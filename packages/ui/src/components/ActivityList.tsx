import TransactionsList from "./transactions/TransactionsList"

// Context
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"

// Utils

import useTransactions from "../util/hooks/useTransactions"
import { useBlankState } from "../context/background/backgroundHooks"

const ActivityList = () => {
    const { isNetworkChanging } = useBlankState()!
    const { chainId } = useSelectedNetwork()
    const { address } = useSelectedAccount()

    const { transactions } = useTransactions()

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px]"
            data-testid="activity-list"
        >
            <TransactionsList
                transactions={transactions}
                isNetworkChanging={isNetworkChanging}
                //When the chainId and/or the address changes, this component is unmounted and mounted again.
                key={`${chainId}-${address}`}
            />
        </div>
    )
}

export default ActivityList
