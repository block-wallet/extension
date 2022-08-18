import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { useBlankState } from "../background/backgroundHooks"
import {
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../commTypes"

export interface TransactionFilters {
    categories?: TransactionCategories[]
}

const applyCustomFilters = (
    transaction: TransactionMeta,
    filters: TransactionFilters
) => {
    let matched = true
    if (filters?.categories) {
        matched =
            matched &&
            filters.categories.includes(transaction.transactionCategory!)
    }
    return matched
}

/**
 * useWaitingForSigningTransaction
 *
 * @returns The transaction that is awaiting signing
 */
export const useWaitingForSigningInternalTransaction = (
    txFilters: TransactionFilters = {}
) => {
    const { transactions } = useBlankState()!

    const validStates = [
        TransactionStatus.UNAPPROVED,
        TransactionStatus.APPROVED,
        TransactionStatus.SIGNED,
    ]
    const filteredTransactions = transactions.filter(
        (t) =>
            validStates.includes(t.status) &&
            t.metaType === MetaType.REGULAR &&
            t.origin === "blank" &&
            applyCustomFilters(t, txFilters)
    )
    return filteredTransactions.length > 0 ? filteredTransactions[0] : undefined
}
