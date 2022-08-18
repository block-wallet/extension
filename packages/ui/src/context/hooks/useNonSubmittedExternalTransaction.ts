import {
    TransactionMeta,
    uiTransactionParams,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { getNonSubmittedTransactions } from "../../util/getNonSubmittedTransactions"
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
    const { transactions } = useBlankState()!
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()

    const nonSubmittedTransactions = getNonSubmittedTransactions(
        transactions,
        true
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
