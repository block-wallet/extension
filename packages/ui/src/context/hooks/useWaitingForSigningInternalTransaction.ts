import { useBlankState } from "../background/backgroundHooks"
import { MetaType, TransactionStatus } from "../commTypes"

/**
 * useWaitingForSigningTransaction
 *
 * @returns The transaction that is awaiting signing
 */
export const useWaitingForSigningInternalTransaction = () => {
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
            t.origin === "blank"
    )
    return filteredTransactions.length > 0 ? filteredTransactions[0] : undefined
}
