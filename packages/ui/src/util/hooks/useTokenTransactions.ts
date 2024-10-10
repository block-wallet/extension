import { isNativeTokenAddress } from "../tokenUtils"
import { RichedTransactionMeta } from "../transactionUtils"
import useTransactions from "./useTransactions"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"

const useTokenTransactions = (token: Token | undefined) => {
    const { transactions } = useTransactions()
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
                        (transferType?.currency === token.symbol &&
                            !BigNumber.from(transactionParams.value || "0").eq(
                                "0"
                            ))
                    )
                } else {
                    return (
                        transactionReceipt?.contractAddress?.toLowerCase() ===
                            contractToLower ||
                        transactionParams.to?.toLowerCase() === contractToLower
                    )
                }
            }
        )
    } catch {
        return [] as RichedTransactionMeta[]
    }
}

export default useTokenTransactions
