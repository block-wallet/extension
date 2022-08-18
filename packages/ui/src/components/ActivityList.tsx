import TransactionsList from "./transactions/TransactionsList"

// Context
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"

// Utils

import useTransactions from "../util/hooks/useTransactions"

const ActivityList = () => {
    const { chainId } = useSelectedNetwork()
    const { address } = useSelectedAccount()

    const { transactions } = useTransactions()

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0"
            data-testid="activity-list"
        >
            <TransactionsList
                transactions={transactions}
                //When the chainId and/or the address changes, this component is unmounted and mounted again.
                key={`${chainId}-${address}`}
            />
        </div>
    )
}

export default ActivityList
