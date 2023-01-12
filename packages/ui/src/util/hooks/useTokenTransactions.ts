import { isNativeTokenAddress } from "../tokenUtils"
import { RichedTransactionMeta } from "../transactionUtils"
import useActivtyListTransactions from "./useActivtyListTransactions"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useBlankState } from "../../context/background/backgroundHooks"

const useTokenTransactions = (token: Token | undefined) => {
    const { transactions } = useActivtyListTransactions()
    
    if (!token) {
        return [] as RichedTransactionMeta[]
    }
    
    try {
        const contractToLower = token.address.toLowerCase()
        return transactions.filter(
            ({ transactionParams, transactionReceipt, transferType }) => {
                if (isNativeTokenAddress(token.address)) {
                    return (
                        transactionParams.data === "0x" ||
                        transferType?.currency === token.symbol
                    )
                } else {
                    return (
                        transactionReceipt?.contractAddress?.toLowerCase() ===
                        contractToLower
                    )
                }
            }
        )
    } catch {
        return [] as RichedTransactionMeta[]
    }
}

export default useTokenTransactions
