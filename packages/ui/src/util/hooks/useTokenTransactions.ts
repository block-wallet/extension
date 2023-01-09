import { isNativeTokenAddress } from "../tokenUtils"
import { RichedTransactionMeta } from "../transactionUtils"
import useTransactions from "./useTransactions"

const useTokenTransactions = (tokenContract: string | undefined) => {
    if (!tokenContract) {
        return [] as RichedTransactionMeta[]
    }
    const contractToLower = tokenContract?.toLowerCase()
    const { transactions } = useTransactions()
    return transactions.filter(({ transactionParams, transactionReceipt }) => {
        if (isNativeTokenAddress(tokenContract)) {
            return transactionParams.data === "0x"
        } else {
            return (
                transactionReceipt?.contractAddress.toLowerCase() ==
                contractToLower
            )
        }
    })
}

export default useTokenTransactions
