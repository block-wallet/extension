import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { useCallback, useEffect } from "react"
import { useWaitingDialog } from "../../components/dialog/WaitingDialog"
import { TransactionStatus } from "../commTypes"

const useAwaitAllowanceTransactionDialog = (
    transaction: TransactionMeta | undefined
) => {
    const { dispatch, status, isOpen } = useWaitingDialog({
        defaultStatus: "idle",
    })
    useEffect(() => {
        if (transaction?.status) {
            if ([TransactionStatus.SUBMITTED].includes(transaction.status)) {
                dispatch({
                    type: "setStatus",
                    payload: {
                        status: "loading",
                        forceOpen: true,
                    },
                })
            }
            if ([TransactionStatus.CONFIRMED].includes(transaction.status)) {
                //Only dispatch success dialog if the dialog has been opened.
                dispatch({
                    type: "setStatus",
                    payload: {
                        status: "success",
                        forceOpen: false,
                    },
                })
            }
            if (
                [
                    TransactionStatus.FAILED,
                    TransactionStatus.DROPPED,
                    TransactionStatus.CANCELLED,
                ].includes(transaction.status)
            ) {
                dispatch({
                    type: "setStatus",
                    payload: {
                        status: "error",
                        forceOpen: true,
                    },
                })
            }
        }
    }, [transaction?.status])
    return {
        status,
        isOpen,
        closeDialog: useCallback(() => {
            dispatch({ type: "close" })
        }, []),
    }
}

export default useAwaitAllowanceTransactionDialog
