import {
    BridgeTransactionParams,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"

import { FC, useMemo } from "react"
import {
    TransactionCategories,
    BridgeStatus,
    BridgeSubstatus,
} from "../../context/commTypes"
import { buildBridgeDetailedItems } from "../../util/bridgeUtils"
import { BridgeTransactionsData } from "../../util/hooks/useGetBridgeTransactionsData"
import TransactionDetailsList, {
    DetailedItem,
} from "../transactions/TransactionDetailsList"
import BridgeDetailsStatus from "./BridgeDetailsStatus"
import openIcon from "../../assets/images/icons/open_external.svg"
import { secondsToEstimatedMinutes, secondsToMMSS } from "../../util/time"

interface BridgeDetailsSummaryProps {
    transaction: Partial<TransactionMeta>
    bridgeTransactionsData: BridgeTransactionsData | null
}

const Explorer = ({
    explorerLink,
    explorerName,
}: {
    explorerLink: string
    explorerName: string
}) => {
    return (
        <div className="flex w-full items-center justify-start">
            <a
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row items-center space-x-1"
                title={explorerName}
            >
                <span className="text-sm font-semibold text-primary-blue-default whitespace-nowrap text-ellipsis overflow-hidden">
                    {explorerName}
                </span>
                <img src={openIcon} alt="Open icon" className="w-3 h-3" />
            </a>
        </div>
    )
}

const getBridgeFinalDurationInSeconds = (
    bridgeParams?: BridgeTransactionParams
): number | null => {
    if (!bridgeParams || !bridgeParams.startTime || !bridgeParams.endTime) {
        return null
    }

    return (bridgeParams.endTime - bridgeParams.startTime) / 1000
}

const BridgeDetailsSummary: FC<BridgeDetailsSummaryProps> = ({
    transaction,
    bridgeTransactionsData,
}) => {
    const details = useMemo(() => {
        return transaction.bridgeParams
            ? buildBridgeDetailedItems(
                  transaction as TransactionMeta,
                  bridgeTransactionsData
              )
            : undefined
    }, [transaction])

    if (!details) {
        return null
    }

    const statusDetail: DetailedItem = {
        label: "Status",
        value: <BridgeDetailsStatus transaction={transaction} />,
    }

    const durationDetails: DetailedItem[] = []

    if (
        transaction.bridgeParams?.estimatedDurationInSeconds &&
        ![BridgeStatus.DONE, BridgeStatus.FAILED].includes(
            transaction.bridgeParams?.status! || ""
        )
    ) {
        durationDetails.push({
            label: "Estimated duration",
            value: secondsToEstimatedMinutes(
                transaction.bridgeParams?.estimatedDurationInSeconds
            ),
        })
    } else {
        const durationInSeconds = getBridgeFinalDurationInSeconds(
            transaction.bridgeParams
        )
        if (durationInSeconds) {
            durationDetails.push({
                label: "Duration",
                value: secondsToMMSS(durationInSeconds),
            })
        }
    }

    const explorerDetails: DetailedItem[] = []

    if (bridgeTransactionsData?.sendingTransaction?.explorerLink) {
        explorerDetails.push({
            label: "Origin Tx",
            value: (
                <Explorer
                    explorerLink={
                        bridgeTransactionsData?.sendingTransaction?.explorerLink
                    }
                    explorerName={
                        bridgeTransactionsData?.sendingTransaction
                            ?.explorerName || "Explorer"
                    }
                />
            ),
        })
    }

    if (
        transaction.bridgeParams?.status === BridgeStatus.DONE &&
        bridgeTransactionsData?.receivingTransaction?.explorerLink
    ) {
        const explorer = (
            <Explorer
                explorerLink={
                    bridgeTransactionsData?.receivingTransaction?.explorerLink
                }
                explorerName={
                    bridgeTransactionsData?.receivingTransaction
                        ?.explorerName || "Explorer"
                }
            />
        )
        if (transaction.bridgeParams?.substatus === BridgeSubstatus.REFUNDED) {
            explorerDetails.push({
                label: "Refund Tx",
                value: explorer,
            })
        } else {
            explorerDetails.push({
                label: "Destination Tx",
                value: explorer,
            })
        }
    }

    return (
        <div>
            {transaction.transactionCategory ===
                TransactionCategories.INCOMING_BRIDGE_REFUND && (
                <>
                    <i className="text-primary-grey-dark text-center py-2">
                        This is a refund transaction of a failed bridge.
                    </i>
                </>
            )}
            <TransactionDetailsList
                details={[
                    statusDetail,
                    ...durationDetails,
                    ...details,
                    ...explorerDetails,
                ]}
            />
        </div>
    )
}

export default BridgeDetailsSummary
