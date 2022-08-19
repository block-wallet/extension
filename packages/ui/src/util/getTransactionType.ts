import { TransactionParams } from "@block-wallet/background/controllers/transactions/utils/types"
import { TransactionType } from "../context/commTypes"

/**
 * It determines the type of the transaction according to its parameters
 *
 * @param transactionParams The transaction to check against
 * @returns The transaction type
 */
export const getTransactionType = (
    transactionParams: TransactionParams
): TransactionType => {
    if (typeof transactionParams.accessList !== "undefined") {
        return TransactionType.ACCESS_LIST_EIP2930
    } else if (
        typeof transactionParams.maxPriorityFeePerGas !== "undefined" &&
        typeof transactionParams.maxFeePerGas !== "undefined"
    ) {
        return TransactionType.FEE_MARKET_EIP1559
    } else {
        // Otherwise default to legacy
        return TransactionType.LEGACY
    }
}
