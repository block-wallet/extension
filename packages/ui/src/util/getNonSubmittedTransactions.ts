import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { TransactionStatus } from "../context/commTypes"

export const getNonSubmittedTransactions = (
    transactions: TransactionMeta[],
    external = true
) => {
    const validStates = [
        TransactionStatus.UNAPPROVED,
        TransactionStatus.APPROVED,
        TransactionStatus.SIGNED,
    ]
    const filteredTransactions = transactions.filter(
        (t) =>
            (external ? t.origin !== "blank" : t.origin === "blank") &&
            validStates.includes(t.status)
    )

    const nonSubmittedTransactions = filteredTransactions.reduce(
        (result, transaction) => {
            result[transaction.id] = transaction
            return result
        },
        {} as { [key: string]: TransactionMeta }
    )

    return nonSubmittedTransactions
}
