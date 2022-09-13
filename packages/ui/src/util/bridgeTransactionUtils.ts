import {
    BridgeTransactionParams,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { BridgeStatus, BridgeSubstatus } from "../context/commTypes"
import { capitalize } from "./capitalize"
import useGetBridgeDetails from "./hooks/useGetBridgeDetails"

interface BridgeAdditonalExplorer {
    viewOnText: string
    explorerLink: string
}

export const getBridgePendingMessage = (
    bridgeParams: BridgeTransactionParams,
    destinationNetworkName?: string
) => {
    if (bridgeParams.status === BridgeStatus.PENDING) {
        switch (bridgeParams.substatus) {
            case BridgeSubstatus.NOT_PROCESSABLE_REFUND_NEEDED:
            case BridgeSubstatus.REFUND_IN_PROGRESS:
                return "Failed bridge: Processing refund"
            case BridgeSubstatus.WAIT_SOURCE_CONFIRMATIONS: {
                return "Processing bridge"
            }
            case BridgeSubstatus.WAIT_DESTINATION_TRANSACTION: {
                return `Waiting for ${
                    destinationNetworkName || "destination"
                } transaction`
            }
        }
    }
    return null
}

export const getAdditionalBridgeExplorer = (
    transaction: TransactionMeta,
    bridgeDetails: ReturnType<typeof useGetBridgeDetails>
): BridgeAdditonalExplorer | undefined => {
    if (bridgeDetails) {
        if (
            transaction.bridgeParams?.role === "SENDING" &&
            bridgeDetails.receivingTransaction?.explorerLink
        ) {
            const txData = bridgeDetails.receivingTransaction
            return {
                viewOnText: `View destination transaction on ${capitalize(
                    txData.explorerName!
                )}`,
                explorerLink: txData.explorerLink!,
            }
        } else if (
            transaction.bridgeParams?.role === "RECEIVING" &&
            bridgeDetails.sendingTransaction?.explorerLink
        ) {
            const txData = bridgeDetails.sendingTransaction
            return {
                viewOnText: `View origin transaction on ${capitalize(
                    txData.explorerName!
                )}`,
                explorerLink: txData.explorerLink!,
            }
        }
    }
}
