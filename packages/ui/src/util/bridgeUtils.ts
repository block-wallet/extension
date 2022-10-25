import {
    GetBridgeQuoteResponse,
    GetBridgeQuoteNotFoundResponse,
} from "@block-wallet/background/controllers/BridgeController"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { IBridgeRoute } from "@block-wallet/background/utils/bridgeApi"
import { IChain } from "@block-wallet/background/utils/types/chain"
import { BigNumber } from "ethers"
import {
    BridgeImplementation,
    BridgeStatus,
    BridgeSubstatus,
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../context/commTypes"
import { RichedTransactionMeta } from "./transactionUtils"
import { SEND_GAS_COST } from "../util/constants"
import { getTransactionFees } from "../util/gasPrice"
import { EnoughNativeTokensToSend } from "../context/hooks/useBridgeChainHasNotEnoughNativeTokensToSend"
import { Network } from "@block-wallet/background/utils/constants/networks"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"
import { DetailedItem } from "../components/transactions/TransactionDetailsList"
import { BridgeTransactionsData } from "./hooks/useGetBridgeTransactionsData"
import isNil from "./isNil"
import { formatUnits } from "ethers/lib/utils"
import { bnOr0 } from "./numberUtils"

const LIFI_NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000"

export type BridgeWarningMessage = {
    title: string
    body: string
}

export const BRIDGE_PENDING_STATUS = [
    BridgeStatus.PENDING,
    BridgeStatus.NOT_FOUND,
]

export const isBridgeNativeTokenAddress = (address: string): boolean => {
    return address.toLowerCase() === LIFI_NATIVE_ADDRESS.toLowerCase()
}

export const checkForBridgeNativeAsset = (address: string): string => {
    if (address === "0x0") {
        return LIFI_NATIVE_ADDRESS
    }

    return address
}

export const getRouteForNetwork = (
    availableRoutes: IBridgeRoute[],
    network?: IChain
): IBridgeRoute | undefined => {
    if (!network) {
        return undefined
    }

    return availableRoutes.filter((route) => route.toChainId === network.id)[0]
}

/**
 * Simulates a complete transaction object to display details
 */
export const populateBridgeTransaction = (
    bridgeQuote: GetBridgeQuoteResponse
): RichedTransactionMeta => {
    return {
        id: "",
        status: TransactionStatus.UNAPPROVED,
        time: 1,
        blocksDropCount: 1,
        metaType: MetaType.REGULAR,
        loadingGasValues: false,
        transactionParams: {
            from: bridgeQuote.bridgeParams.params.transactionRequest.from,
            to: bridgeQuote.bridgeParams.params.transactionRequest.to,
        },
        transactionCategory: TransactionCategories.BRIDGE,
        methodSignature: bridgeQuote.bridgeParams.methodSignature,
        bridgeParams: {
            bridgeImplementation: BridgeImplementation.LIFI_BRIDGE,
            fromToken: bridgeQuote.bridgeParams.params.fromToken,
            toToken: bridgeQuote.bridgeParams.params.toToken,
            fromTokenAmount: bridgeQuote.bridgeParams.params.fromAmount,
            toTokenAmount: bridgeQuote.bridgeParams.params.toAmount,
            blockWalletFee: bridgeQuote.bridgeParams.params.blockWalletFee,
            fromChainId: bridgeQuote.bridgeParams.params.fromChainId,
            toChainId: bridgeQuote.bridgeParams.params.toChainId,
            tool: bridgeQuote.bridgeParams.params.tool,
            role: "SENDING",
            feeCosts: bridgeQuote.bridgeParams.params.feeCosts,
            slippage: bridgeQuote.bridgeParams.params.slippage,
        },
    }
}

export const hasEnoughFundsToPayTheGasInSendTransaction = (
    isEIP1559Compatible: boolean,
    balance: BigNumber,
    gasPricesData: GasPriceData
): boolean | undefined => {
    const transactionFees = getTransactionFees(
        isEIP1559Compatible,
        gasPricesData.gasPricesLevels.average,
        gasPricesData.estimatedBaseFee!,
        SEND_GAS_COST
    )
    if (transactionFees === undefined) {
        return undefined
    }
    return BigNumber.from(balance).gte(
        BigNumber.from(transactionFees?.totalTransactionCost)
    )
}

export const isBridgeQuoteNotFoundError = (e: Error): boolean => {
    return e.name === "QuoteNotFoundError"
}

export const isANotFoundQuote = (
    quote: GetBridgeQuoteResponse | GetBridgeQuoteNotFoundResponse
) => {
    return "errors" in quote
}
export const getWarningMessages = (
    nativeTokenStatus: EnoughNativeTokensToSend,
    network: Network | undefined
): BridgeWarningMessage | undefined => {
    switch (nativeTokenStatus) {
        case EnoughNativeTokensToSend.ENOUGH: {
            return undefined
        }
        case EnoughNativeTokensToSend.NOT_ENOUGH: {
            const title = "Your funds may get stuck!"
            const networkNativeToken = network
                ? network.nativeCurrency.symbol
                : "native token"
            const networkName = network
                ? network.desc
                : "the destination network"
            const body = `We noticed you don't have enough ${networkNativeToken} on ${networkName} to cover minimum gas fees.`
            return { title: title, body: body }
        }
        case EnoughNativeTokensToSend.UNKNOWN: {
            if (!network || !network.enable) {
                return {
                    title: "Destination network not detected!",
                    body: "We noticed you haven't added the destination network to your wallet. Please ensure you have enough native token on destination network to cover minimum gas fees so your funds do not get stuck.",
                }
            } else {
                return {
                    title: "Gas prices currently unavailable",
                    body: `Due to external issues we're unable to retrieve current gas prices on ${network.name}. Please try again in a few moments.`,
                }
            }
        }
    }
}

export const buildBridgeDetailedItems = (
    transaction: TransactionMeta,
    birdgeTransactionsData: BridgeTransactionsData | null
): DetailedItem[] => {
    let details: DetailedItem[] = []
    const { bridgeParams, transactionParams, transactionCategory, status } =
        transaction
    if (!bridgeParams) {
        return []
    }

    const bridgeSendingChainLabel =
        birdgeTransactionsData?.sendingTransaction?.networkName ||
        bridgeParams.fromChainId.toString()
    const bridgeReceivingChainLabel =
        birdgeTransactionsData?.receivingTransaction?.networkName ||
        bridgeParams.toChainId.toString()

    const isConfirmed = status === TransactionStatus.CONFIRMED

    details.push({
        label: "Origin network",
        value: bridgeSendingChainLabel,
    })

    details.push({
        label: "Destination network",
        value: bridgeReceivingChainLabel,
    })

    details.push({
        label: isConfirmed ? "Sent" : "Sending",
        value: formatUnits(
            bnOr0(bridgeParams.fromTokenAmount),
            bridgeParams.fromToken.decimals
        ),
        decimals: 10,
        unitName: bridgeParams.fromToken.symbol,
    })

    if (
        bridgeParams.effectiveToToken &&
        [BridgeSubstatus.PARTIAL, BridgeSubstatus.REFUNDED].includes(
            bridgeParams.substatus! || ""
        ) &&
        bridgeParams.effectiveToToken.address.toLowerCase() !==
            bridgeParams.toToken.address.toLowerCase()
    ) {
        const bridgedAmount = formatUnits(
            bnOr0(bridgeParams.toTokenAmount),
            bridgeParams.toToken.decimals
        )
        details.push({
            label: "Bridged amount",
            value: bridgedAmount,
            decimals: 10,
            info: `${bridgedAmount} ${bridgeParams.toToken.symbol} is the sent amount substracting the bridge fees. You can check the fees in the 'Fees' tab.`,
            unitName: bridgeParams.toToken.symbol,
        })

        let labelForFinalState = "Received amount"
        if (bridgeParams.substatus === BridgeSubstatus.REFUNDED) {
            labelForFinalState = "Refunded amount"
        }
        details.push({
            label: labelForFinalState,
            value: formatUnits(
                bnOr0(bridgeParams.effectiveToTokenAmount),
                bridgeParams.effectiveToToken.decimals
            ),
            decimals: 10,
            unitName: bridgeParams.effectiveToToken.symbol,
        })
    } else {
        details.push({
            label: isConfirmed ? "Received" : "Receiving",
            value: formatUnits(
                bnOr0(bridgeParams.toTokenAmount),
                bridgeParams.toToken.decimals
            ),
            decimals: 10,
            unitName: bridgeParams.toToken.symbol,
        })
    }

    details.push({
        label: "Tool",
        value: bridgeParams.tool,
    })

    details.push({
        label: "Slippage",
        value: bridgeParams.slippage || 0.5,
    })

    return details
}
