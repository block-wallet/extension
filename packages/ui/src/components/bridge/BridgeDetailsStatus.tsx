import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { FC, ReactNode } from "react"
import { BridgeStatus, BridgeSubstatus } from "../../context/commTypes"
import {
    BRIDGE_PENDING_STATUS,
    getBridgePendingMessage,
} from "../../util/bridgeUtils"
import useGetBridgeTransactionsData from "../../util/hooks/useGetBridgeTransactionsData"
import GenericTooltip from "../label/GenericTooltip"
import Spinner from "../spinner/ThinSpinner"

const Status: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <span className="flex flex-row items-center justify-end w-40">
            {children}
        </span>
    )
}

const BridgeCompletedStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-400 pointer-events-none"></span>
            <span className="text-green-600 dark:text-green-400">Completed</span>
        </Status>
    )
}

const BridgePartiallyCompletedStatus = () => {
    return (
        <Status>
            <GenericTooltip
                divFull={false}
                className="!w-60 !break-word !whitespace-normal !border !z-50 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                bottom
                content="The token you received is not the one you requested."
            >
                <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-yellow-400 pointer-events-none"></span>
                <span className="text-yellow-600 dark:text-yellow-400">Partially completed</span>
            </GenericTooltip>
        </Status>
    )
}

const BridgeRefundedStatus = () => {
    return (
        <GenericTooltip
            divFull={false}
            className="!w-60 !break-word !whitespace-normal !border !z-50 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            bottom
            content="The bridge operation failed and the amount you sent have been refunded to the Origin network."
        >
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-orange-400 pointer-events-none"></span>
            <span className="text-orange-600 dark:text-orange-400">Refunded</span>
        </GenericTooltip>
    )
}

const ErroredBridgeStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-red-400 pointer-events-none" />
            <span className="text-red-600 dark:text-red-400">Failed</span>
        </Status>
    )
}

const NotInitializedBridgeStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-gray-400 pointer-events-none" />
            <span className="text-primary-grey-dark dark:text-gray-400">Not initialized</span>
        </Status>
    )
}

const PendingBridgeStatus: FC<{ transaction: Partial<TransactionMeta> }> = ({
    transaction,
}) => {
    const bridgeTransactionsData = useGetBridgeTransactionsData(transaction)
    const pendingMessage = getBridgePendingMessage(
        transaction.bridgeParams!,
        bridgeTransactionsData?.receivingTransaction?.networkName
    )
    if (!pendingMessage) {
        return null
    }
    return (
        <GenericTooltip
            content={pendingMessage?.info ?? ""}
            className="border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
            <Status>
                <Spinner color="text-blue-200 dark:text-blue-300" size="16px" />
                <span className="whitespace-nowrap text-ellipsis overflow-hidden text-primary-blue-default dark:text-blue-400 ml-1 max-w-[200px]">
                    {pendingMessage.label}
                </span>
            </Status>
        </GenericTooltip>
    )
}

const BridgeDetailsStatus: FC<{
    transaction: TransactionMeta | Partial<TransactionMeta>
}> = ({ transaction }) => {
    if (transaction.bridgeParams && !transaction.bridgeParams?.status) {
        return <NotInitializedBridgeStatus />
    }

    if (transaction.bridgeParams?.status === BridgeStatus.FAILED) {
        return <ErroredBridgeStatus />
    }

    if (transaction.bridgeParams?.status === BridgeStatus.DONE) {
        switch (transaction.bridgeParams.substatus) {
            case BridgeSubstatus.COMPLETED: {
                return <BridgeCompletedStatus />
            }
            case BridgeSubstatus.PARTIAL: {
                return <BridgePartiallyCompletedStatus />
            }
            case BridgeSubstatus.REFUNDED: {
                return <BridgeRefundedStatus />
            }
        }
    }

    if (BRIDGE_PENDING_STATUS.includes(transaction.bridgeParams!.status!)) {
        return <PendingBridgeStatus transaction={transaction} />
    }

    return null
}

export default BridgeDetailsStatus
