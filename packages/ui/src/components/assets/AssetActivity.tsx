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
            className="flex flex-col flex-1 w-full space-y-0 h-full max-h-[470px] min-h-[266px]"
            data-testid="activity-list"
        >
            {tokenTransactions.length > 0 ? (
                <TransactionsList
                    transactions={tokenTransactions}
                    isNetworkChanging={isNetworkChanging}
                />
            ) : (
                <span className="text-sm text-primary-grey-dark pt-4 mx-auto">
                    You have no transactions.
                </span>
            )}
        </div>
    )
}

export default AssetActivity
