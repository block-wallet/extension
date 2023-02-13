import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { TransactionStatus } from "../context/commTypes"

export enum TransactionOrigin {
    EXTERNAL_ONLY = "EXTERNAL_ONLY",
    INTERNAL_ONLY = "INTERNAL_ONLY",
    ALL = "ALL",
}

/**
 * Returns a list of non submitted transactions
 * @param transactions - list of transactions
 * @param origin - specifies the origin of transactions to be returned
 * @returns
 */
export const getNonSubmittedTransactions = (
    transactions: TransactionMeta[],
    transactionOrigin = TransactionOrigin.EXTERNAL_ONLY
) => {
    const validStates = [
        TransactionStatus.UNAPPROVED,
        TransactionStatus.APPROVED,
        TransactionStatus.SIGNED,
    ]

    const filteredTransactions = transactions.filter((t) => {
        const isValidState = validStates.includes(t.status)

        switch (transactionOrigin) {
            case TransactionOrigin.EXTERNAL_ONLY:
                return isValidState && t.origin !== "blank"
            case TransactionOrigin.INTERNAL_ONLY:
                return isValidState && t.origin === "blank"
            default:
                return isValidState
        }
    })

    const nonSubmittedTransactions = filteredTransactions.reduce(
        (result, transaction) => {
            result[transaction.id] = transaction
            return result
        },
        {} as { [key: string]: TransactionMeta }
    )

    return nonSubmittedTransactions
}
