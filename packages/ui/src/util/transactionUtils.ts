import { GasPriceLevels } from "@block-wallet/background/controllers/GasPricesController"
import {
    TransactionMeta,
    uiTransactionParams,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { TransactionCategories, TransactionStatus } from "../context/commTypes"
import { BigNumber } from "ethers"
import { DappRequestSigningStatus } from "../context/hooks/useDappRequest"
export interface RichedTransactionMeta extends TransactionMeta {
    //Dynamically calculated using this transaction status and comparing the nonce with other transactions.
    isQueued?: boolean
    // Allows to force the status of a transaction to be dropped
    forceDrop?: boolean
}

export const flagQueuedTransactions = (
    pendingTransactions: TransactionMeta[]
): RichedTransactionMeta[] => {
    if (!pendingTransactions || pendingTransactions.length === 0) {
        return pendingTransactions
    }
    const lowestPendingNonce = pendingTransactions
        .filter((transaction) => {
            return transaction.status === TransactionStatus.SUBMITTED
        })
        .reduce((lowest, current) => {
            const currentNonce = current.transactionParams.nonce || -1
            if (lowest === -1 || currentNonce < lowest) {
                return currentNonce
            }
            return lowest
        }, -1)

    return pendingTransactions.map((transaction) => {
        const transactionNonce = transaction.transactionParams.nonce || -1
        const isPendingState =
            transaction.status === TransactionStatus.SUBMITTED
        return {
            ...transaction,
            isQueued: isPendingState && transactionNonce > lowestPendingNonce,
        }
    })
}

export const getDepositTransactionInfo = (
    tx: Partial<TransactionMeta>
): {
    confirmations?: number
    isAwaitingForConfirmation: boolean
} => {
    if (
        tx.blankDepositId &&
        (tx.transactionReceipt?.confirmations || -1) > -1
    ) {
        return {
            confirmations: tx.transactionReceipt?.confirmations,
            isAwaitingForConfirmation:
                tx.status === TransactionStatus.SUBMITTED,
        }
    }

    return {
        isAwaitingForConfirmation: false,
    }
}

export const getUITransactionParams = (
    transaction: TransactionMeta | undefined,
    gasPricesLevels: GasPriceLevels,
    isEIP1559Compatible: boolean = true
): uiTransactionParams => {
    return {
        ...transaction?.transactionParams,
        value: BigNumber.from(transaction?.transactionParams.value ?? "0"),
        gasLimit: BigNumber.from(
            transaction?.transactionParams.gasLimit ?? "0"
        ),
        //Legacy
        gasPrice: !isEIP1559Compatible
            ? BigNumber.from(
                  transaction?.transactionParams.gasPrice ??
                      gasPricesLevels.average.gasPrice
              )
            : undefined,
        //EIP-1559
        maxPriorityFeePerGas: isEIP1559Compatible
            ? BigNumber.from(
                  transaction?.transactionParams.maxPriorityFeePerGas ??
                      gasPricesLevels.average.maxPriorityFeePerGas
              )
            : undefined,
        maxFeePerGas: isEIP1559Compatible
            ? BigNumber.from(
                  transaction?.transactionParams.maxFeePerGas ??
                      gasPricesLevels.average.maxFeePerGas
              )
            : undefined,
    }
}

export const isTransactionOrRequestAwaitingSigning = (
    status: TransactionStatus | DappRequestSigningStatus
): boolean => {
    // Dispite both enums having the same "APPROVED" status, we need to check for the type
    // in case one of the underlying enums changes in the future.
    const validStatuses = [
        TransactionStatus.APPROVED,
        DappRequestSigningStatus.APPROVED,
    ]
    return validStatuses.includes(status)
}

export const canUserSubmitTransaction = (
    status: TransactionStatus
): boolean => {
    return [TransactionStatus.UNAPPROVED].includes(status)
}

export const resolveTransactionTo = (tx: TransactionMeta): string => {
    let to: string | undefined
    if (
        tx.transactionCategory === TransactionCategories.TOKEN_METHOD_TRANSFER
    ) {
        to = tx.transferType?.to
    }
    return to ?? tx.transactionParams.to ?? ""
}
