import {
    TransactionMeta,
    uiTransactionParams,
} from "@block-wallet/background/controllers/transactions/utils/types"
import {
    getNonSubmittedTransactions,
    TransactionOrigin,
} from "../../util/getNonSubmittedTransactions"
import { getUITransactionParams } from "../../util/transactionUtils"
import { useBlankState } from "../background/backgroundHooks"
import { useGasPriceData } from "./useGasPriceData"
import { useSelectedNetwork } from "./useSelectedNetwork"

interface UnapprovedTransaction {
    transactionCount: number
    transactionId: string
    transaction: TransactionMeta
    params: uiTransactionParams
}

export const useNonSubmittedExternalTransaction = (): UnapprovedTransaction => {
    return useNonSubmittedTransaction()
}

export const useNonSubmittedCombinedTransaction = (): UnapprovedTransaction => {
    return useNonSubmittedTransaction(false)
}

/**
 * Returns the first unapproved transaction
 * @param externalOnly - if true, returns only external transactions otherwise returns external and blank transactions
 * @returns - first unapproved transaction
 */
const useNonSubmittedTransaction = (
    externalOnly = true
): UnapprovedTransaction => {
    const { transactions } = useBlankState()!
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()

    const nonSubmittedTransactions = getNonSubmittedTransactions(
        transactions,
        externalOnly ? TransactionOrigin.EXTERNAL_ONLY : TransactionOrigin.ALL
    )

    // Gets first unapproved transaction
    const transactionIds = Object.keys(nonSubmittedTransactions)

    const transaction = Object.values(nonSubmittedTransactions)[0]
    const transactionId = transactionIds[0]
    const transactionCount = transactionIds.length

    return {
        transactionId,
        transaction,
        transactionCount,
        params: getUITransactionParams(
            transaction,
            gasPricesLevels,
            isEIP1559Compatible
        ),
    }
}
