import {
    TransactionMeta,
    uiTransactionParams,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { useBlankState } from "../background/backgroundHooks"
import { useGasPriceData } from "./useGasPriceData"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { getUITransactionParams } from "../../util/transactionUtils"
export interface UnapprovedTransaction {
    transactionCount: number
    transactionId: string
    transaction: TransactionMeta
    params: uiTransactionParams
}

export const useUnapprovedTransaction = (): UnapprovedTransaction => {
    const { unapprovedTransactions } = useBlankState()!
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()

    // Gets first unapproved transaction
    const transactions = Object.keys(unapprovedTransactions)

    const transaction = Object.values(unapprovedTransactions)[0]
    const transactionId = transactions[0]
    const transactionCount = transactions.length

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
