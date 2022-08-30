import { IBridgeRoute } from "@block-wallet/background/utils/bridgeApi"
import { IChain } from "@block-wallet/background/utils/types/chain"

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
    network: IChain
): IBridgeRoute => {
    return availableRoutes.filter((route) => route.toChainId === network.id)[0]
}

/**
 * Simulates a complete transaction object to display details
 */
// export const populateBridgeTransaction = (
//     swapParameters: SwapParameters
// ): RichedTransactionMeta => {
//     return {
//         id: "",
//         status: TransactionStatus.UNAPPROVED,
//         time: 1,
//         blocksDropCount: 1,
//         metaType: MetaType.REGULAR,
//         loadingGasValues: false,
//         transactionParams: {
//             from: swapParameters.tx.from,
//             to: swapParameters.tx.to,
//         },
//         transactionCategory: TransactionCategories.EXCHANGE,
//         methodSignature: swapParameters.methodSignature,
//         exchangeParams: {
//             exchangeType: ExchangeType.SWAP_1INCH,
//             fromToken: swapParameters.fromToken,
//             toToken: swapParameters.toToken,
//             fromTokenAmount: swapParameters.fromTokenAmount,
//             toTokenAmount: swapParameters.toTokenAmount,
//             blockWalletFee: swapParameters.blockWalletFee,
//         },
//     }
// }
