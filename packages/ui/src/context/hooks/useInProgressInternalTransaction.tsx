import { useCallback, useEffect, useState } from "react"
import {
    TransactionFilters,
    useWaitingForSigningInternalTransaction,
} from "./useWaitingForSigningInternalTransaction"
import { useTransactionById } from "./useTransactionById"

export const useInProgressInternalTransaction = (
    txFilters: TransactionFilters = {}
) => {
    // The code below gets information about the last transaction that was in progress in the current window.
    // If there is no transaction, and the form has been submitted,
    // means that the user SHOULD not be here (he may have declined the transaction in the HW device with th pop-up closed), so that we should go to the home page.
    // If there is a pending transaction, we should store its ID and attach it to this form, listening to its state changes.
    const lastPendingTransaction =
        useWaitingForSigningInternalTransaction(txFilters)
    const [currentTxId, setCurrentTxId] = useState(lastPendingTransaction?.id)
    const { transaction } = useTransactionById(currentTxId)

    useEffect(() => {
        if (lastPendingTransaction?.id && !currentTxId) {
            setCurrentTxId(lastPendingTransaction.id)
        }
    }, [lastPendingTransaction?.id, currentTxId])

    return {
        transaction,
        clearTransaction: useCallback(
            () => setCurrentTxId(undefined),
            [setCurrentTxId]
        ),
    }
}
