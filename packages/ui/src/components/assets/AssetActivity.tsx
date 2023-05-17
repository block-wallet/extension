import useTokenTransactions from "../../util/hooks/useTokenTransactions"
import TransactionsList from "../transactions/TransactionsList"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import useGetAssetByTokenAddress from "../../util/hooks/useGetAssetByTokenAddress"

const AssetActivity = () => {
    const history: any = useOnMountHistory()
    const tokenAddress: string = history.location.state.address
    const token = useGetAssetByTokenAddress(tokenAddress)?.token
    const tokenTransactions = useTokenTransactions(token)

    return (
        <>
            {tokenTransactions.length > 0 ? (
                <TransactionsList transactions={tokenTransactions} />
            ) : (
                <span className="text-sm text-primary-grey-dark pt-4 mx-auto">
                    You have no transactions.
                </span>
            )}
        </>
    )
}

export default AssetActivity
