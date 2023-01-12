import useTokenTransactions from "../../util/hooks/useTokenTransactions"
import TransactionsList from "../transactions/TransactionsList"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const AssetActivity = () => {
    const history: any = useOnMountHistory()
    const tokenAddress = history.location.state.address
    const tokenTransactions = useTokenTransactions(tokenAddress)

    return (
        <>
            {tokenTransactions.length > 0 ? (
                <TransactionsList transactions={tokenTransactions} />
            ) : (
                <span className="text-sm text-gray-500 pt-4 mx-auto">
                    You have no transactions.
                </span>
            )}
        </>
    )
}

export default AssetActivity
