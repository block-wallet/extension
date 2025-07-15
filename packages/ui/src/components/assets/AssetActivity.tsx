import useTokenTransactions from "../../util/hooks/useTokenTransactions"
import TransactionsList from "../transactions/TransactionsList"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import useGetAssetByTokenAddress from "../../util/hooks/useGetAssetByTokenAddress"
import { useBlankState } from "../../context/background/backgroundHooks"

const AssetActivity = () => {
    const { isNetworkChanging } = useBlankState()!
    const history: any = useOnMountHistory()
    const tokenAddress: string = history.location.state.address
    const token = useGetAssetByTokenAddress(tokenAddress)?.token
    const tokenTransactions = useTokenTransactions(token)

    return (
        <div
            className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden"
            data-testid="activity-list"
        >
            {tokenTransactions.length > 0 ? (
                <div className="flex-1 overflow-auto">
                    <TransactionsList
                        transactions={tokenTransactions}
                        isNetworkChanging={isNetworkChanging}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center flex-1 p-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        You have no transactions.
                    </span>
                </div>
            )}
        </div>
    )
}

export default AssetActivity
