import { getUITransactionParams } from "../../util/transactionUtils"
import { useBlankState } from "../background/backgroundHooks"
import { useGasPriceData } from "./useGasPriceData"
import { useSelectedNetwork } from "./useSelectedNetwork"

export const useTransactionById = (transactionId?: string) => {
    const { transactions } = useBlankState()!
    const { isEIP1559Compatible } = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()
    const transaction = transactions.find((t) => t.id === transactionId)
    return {
        transaction,
        params: getUITransactionParams(
            transaction,
            gasPricesLevels,
            isEIP1559Compatible
        ),
    }
}
