import { GetBridgeQuoteResponse } from "@block-wallet/background/controllers/BridgeController"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { IBridgeRoute } from "@block-wallet/background/utils/bridgeApi"
import { IChain } from "@block-wallet/background/utils/types/chain"
import { BigNumber } from "ethers"
import {
    BridgeImplementation,
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../context/commTypes"
import { RichedTransactionMeta } from "./transactionUtils"
import { SEND_GAS_COST } from "../util/constants"
import { getDisplayGasPrices } from "../components/gas/GasPricesInfo"

const LIFI_NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000"

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
        },
    }
}

export const hasEnoughFundsToPayTheGasInSendTransaction = (
    isEIP1559Compatible: boolean,
    balance: BigNumber,
    gasPricesData: GasPriceData
): boolean | undefined => {
    const gasPrices = getDisplayGasPrices(
        isEIP1559Compatible,
        gasPricesData.gasPricesLevels,
        gasPricesData.estimatedBaseFee!,
        SEND_GAS_COST
    )
    if (gasPrices === undefined) {
        return undefined
    }
    return BigNumber.from(balance).gte(
        BigNumber.from(gasPrices?.average.totalTransactionCost)
    )
}

export const isBridgeQuoteNotFoundError = (e: Error): boolean => {
    return e.name === "QuoteNotFoundError"
}
