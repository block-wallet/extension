import { compareAddresses, isNativeTokenAddress } from "../tokenUtils"
import { RichedTransactionMeta } from "../transactionUtils"
import useActivtyListTransactions from "./useActivtyListTransactions"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"

const useTokenTransactions = (token: Token | undefined) => {
    const { transactions } = useActivtyListTransactions()

    if (!token) {
        return [] as RichedTransactionMeta[]
    }

    try {
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
                        compareAddresses(
                            transactionReceipt?.contractAddress,
                            token.address
                        ) ||
                        compareAddresses(transactionParams.to, token.address)
                    )
                }
            }
        )
    } catch {
        return [] as RichedTransactionMeta[]
    }
}

export default useTokenTransactions
