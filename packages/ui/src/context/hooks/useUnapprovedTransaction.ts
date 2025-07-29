import {
    TransactionMeta,
    uiTransactionParams,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { useBlankState } from "../background/backgroundHooks"
import { useGasPriceData } from "./useGasPriceData"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { getUITransactionParams } from "../../util/transactionUtils"
import { useEffect, useState } from "react"
import { subscribeUnapprovedTransactions } from "../commActions"
export interface UnapprovedTransaction {
    transactionCount: number
    transactionId: string
    transaction: TransactionMeta
    params: uiTransactionParams
}

export const useUnapprovedTransaction = (): UnapprovedTransaction => {
    const { unapprovedTransactions: fallbackUnapproved } = useBlankState()!
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()

    const [unapproved, setUnapproved] = useState<{ [id: string]: TransactionMeta } | null>(null)

    useEffect(() => {
        let mounted = true
        subscribeUnapprovedTransactions((slice) => {
            if (mounted) setUnapproved(slice)
        })
        return () => {
            mounted = false
        }
    }, [])

    const active = unapproved ?? fallbackUnapproved

    // Gets first unapproved transaction
    const transactions = Object.keys(active)

    const transaction = Object.values(active)[0]
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
