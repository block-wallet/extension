import { isNativeTokenAddress } from "../tokenUtils"
import { RichedTransactionMeta } from "../transactionUtils"
import useTransactions from "./useTransactions"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useBlankState } from "../../context/background/backgroundHooks"

const useTokenTransactions = (token: Token | undefined) => {
    if (!token) {
        return [] as RichedTransactionMeta[]
    }
    try {
        const contractToLower = token.address.toLowerCase()
        const { transactions } = useTransactions()
        return transactions.filter(
            ({ transactionParams, transactionReceipt, transferType }) => {
                if (isNativeTokenAddress(token.address)) {
                    return (
                        transactionParams.data === "0x" ||
                        transferType?.currency === token.symbol
                    )
                } else {
                    return (
                        transactionReceipt?.contractAddress?.toLowerCase() ==
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
