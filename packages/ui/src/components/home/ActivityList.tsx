import TransactionsList from "../transactions/TransactionsList"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import useActivtyListTransactions from "../../util/hooks/useActivtyListTransactions"
import { Profiler } from "react"
import useMetricCollector from "../../util/useMetricCollector"
import { useBlankState } from "../../context/background/backgroundHooks"

const ActivityList = () => {
    const collect = useMetricCollector()
    const { chainId } = useSelectedNetwork()
    const { address } = useSelectedAccount()
    const { isNetworkChanging } = useBlankState()!
    const { transactions } = useActivtyListTransactions()
    return (
        <Profiler id="transactions" onRender={collect}>
            <div
                className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px]"
                data-testid="activity-list"
            >
                <TransactionsList
                    isNetworkChanging={isNetworkChanging}
                    transactions={transactions}
                    //When the chainId and/or the address changes, this component is unmounted and mounted again.
                    key={`${chainId}-${address}`}
                />
            </div>
        </Profiler>
    )
}

export default ActivityList
