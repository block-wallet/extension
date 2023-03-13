import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { useBlankState } from "../background/backgroundHooks"
import {
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../commTypes"

export interface TransactionFilters {
    categories?: TransactionCategories[]
    txId?: string
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
    if (filters?.txId) {
        matched = matched && filters.txId.includes(transaction.id!)
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
    const filteredTransactions = transactions.filter((t) => {
        if (txFilters.txId) {
            return applyCustomFilters(t, txFilters)
        } else {
            return (
                validStates.includes(t.status) &&
                t.metaType === MetaType.REGULAR &&
                t.origin === "blank" &&
                applyCustomFilters(t, txFilters)
            )
        }
    })
    return filteredTransactions.length > 0 ? filteredTransactions[0] : undefined
}
