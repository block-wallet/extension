import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { FC, ReactNode } from "react"
import { BiCircle } from "react-icons/bi"
import { HiOutlineExclamationCircle } from "react-icons/hi"
import { BridgeStatus, BridgeSubstatus } from "../../context/commTypes"
import { getBridgePendingMessage } from "../../util/bridgeTransactionUtils"
import { BRIDGE_PENDING_STATUS } from "../../util/bridgeUtils"
import useGetBridgeTransactionsData from "../../util/hooks/useGetBridgeTransactionsData"
import GenericTooltip from "../label/GenericTooltip"
import Spinner from "../spinner/ThinSpinner"

const Status: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <span className="flex flex-row items-center justify-end">
            {children}
        </span>
    )
}

const BridgeCompletedStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-green-400 pointer-events-none"></span>
            <span className="text-green-600">Completed</span>
        </Status>
    )
}

const BridgePartiallyCompletedStatus = () => {
    return (
        <Status>
            <GenericTooltip content="The token you received is not the one you requested.">
                <HiOutlineExclamationCircle
                    size={16}
                    className="mr-1 text-yellow-600"
                />{" "}
                <span className="text-yellow-600">Partially completed</span>
            </GenericTooltip>
        </Status>
    )
}

const BridgeRefundedStatus = () => {
    return (
        <GenericTooltip
            divFull={false}
            className="!w-60 !break-word !whitespace-normal !border !z-50"
            bottom
            content="The bridge operation failed and the amount you sent have been refunded to the Origin network."
        >
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-orange-400 pointer-events-none"></span>
            <span className="text-orange-600">Refunded</span>
        </GenericTooltip>
    )
}

const ErroredBridgeStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-red-400 pointer-events-none" />
            <span className="text-yellow-600">Failed</span>
        </Status>
    )
}

const NotInitializedBridgeStatus = () => {
    return (
        <Status>
            <span className="relative inline-flex rounded-full h-2 w-2 mr-2 animate-pulse bg-gray-400 pointer-events-none" />
            <span className="text-gray-600">Not initialized</span>
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
        <GenericTooltip content={pendingMessage?.info ?? ""}>
            <Status>
                <Spinner color="text-blue-200" size="1rem" />
                <span className="whitespace-nowrap text-ellipsis overflow-hidden text-blue-600 ml-1 max-w-[140px]">
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
