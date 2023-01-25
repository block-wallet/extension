import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { TransactionStatus } from "../context/commTypes"

/**
 * Returns a list of non submitted transactions
 * @param transactions - list of transactions
 * @param external - if true, returns only external transactions otherwise returns only blank transactions
 * @param combined - if true, returns all transactions regardless of origin (external or blank)
 * @returns
 */
export const getNonSubmittedTransactions = (
    transactions: TransactionMeta[],
    external = true,
    combined = false
) => {
    const validStates = [
        TransactionStatus.UNAPPROVED,
        TransactionStatus.APPROVED,
        TransactionStatus.SIGNED,
    ]
    const filteredTransactions = transactions.filter(
        (t) =>
            validStates.includes(t.status) &&
            (!combined
                ? external
                    ? t.origin !== "blank"
                    : t.origin === "blank"
                : true)
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
