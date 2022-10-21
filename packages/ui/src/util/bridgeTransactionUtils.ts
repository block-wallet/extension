import { IToken } from "@block-wallet/background/controllers/erc-20/Token"
import {
    BridgeTransactionParams,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import { IBridgeFeeCost } from "@block-wallet/background/utils/bridgeApi"
import { BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import { BridgeStatus, BridgeSubstatus } from "../context/commTypes"
import { BASE_BRIDGE_FEE } from "./constants"
import { formatNumberLength } from "./formatNumberLength"
import useGetBridgeDetails from "./hooks/useGetBridgeDetails"

interface BridgeAdditonalExplorer {
    viewOnText: string
    explorerLink: string
}

const BRIDGE_ON_US_DESCRIPTION =
    "This bridge is on us! BlockWallet is not charging fees for this operation"
const BRIDGE_WITH_FEE = "BlockWallet fees for perfoming this operation"

export const getBlockWalletOriginalFee = (
    amount: string,
    token: IToken
): string => {
    return `${formatNumberLength(
        formatUnits(
            BigNumber.from(amount)
                .mul(BASE_BRIDGE_FEE * 10)
                .div(1000),
            token.decimals
        ),
        8
    )} ${token.symbol}`
}

export const getBlockWalletFeeCost = (
    bridgeParams: BridgeTransactionParams
): IBridgeFeeCost => {
    const chargedBlockWalletFee = BigNumber.from(
        bridgeParams?.blockWalletFee || BigNumber.from("0")
    )

    const blockWalletFee: IBridgeFeeCost = {
        token: bridgeParams?.fromToken,
        total: chargedBlockWalletFee.toString(),
        details: [
            {
                amount: chargedBlockWalletFee.toString(),
                name: "BlockWalletFee",
                description:
                    chargedBlockWalletFee.toNumber() === 0
                        ? BRIDGE_ON_US_DESCRIPTION
                        : BRIDGE_WITH_FEE,
                percentage:
                    chargedBlockWalletFee.toNumber() === 0
                        ? "0"
                        : BASE_BRIDGE_FEE.toString(),
            },
        ],
    }

    return blockWalletFee
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
                viewOnText: `View destination transaction on ${txData.explorerName!}`,
                explorerLink: txData.explorerLink!,
            }
        } else if (
            transaction.bridgeParams?.role === "RECEIVING" &&
            bridgeDetails.sendingTransaction?.explorerLink
        ) {
            const txData = bridgeDetails.sendingTransaction
            return {
                viewOnText: `View origin transaction on ${txData.explorerName!}`,
                explorerLink: txData.explorerLink!,
            }
        }
    }
}
