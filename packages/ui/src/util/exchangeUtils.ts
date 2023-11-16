import {
    ExchangeType,
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from "../context/commTypes"
import { SwapParameters } from "@block-wallet/background/controllers/SwapController"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { RichedTransactionMeta } from "./transactionUtils"
import { Rates } from "@block-wallet/background/controllers/ExchangeRatesController"
import { getValueByKey } from "./objectUtils"
import { toCurrencyAmount } from "./formatCurrency"
import { BasicToken } from "@block-wallet/background/utils/swaps/1inch"

const SWAP_NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
export const DEFAULT_EXCHANGE_TYPE = ExchangeType.SWAP_OPENOCEAN
export const isSwapNativeTokenAddress = (address: string): boolean => {
    return address.toLowerCase() === SWAP_NATIVE_ADDRESS.toLowerCase()
}

/**
 * Calculates the exchange rate between two assets
 */
export const calcExchangeRate = (
    fromAmount: BigNumber,
    fromTokenDecimals: number,
    toAmount: BigNumber,
    toTokenDecimals: number
): number => {
    const plainRate =
        parseFloat(formatUnits(toAmount, toTokenDecimals)) /
        parseFloat(formatUnits(fromAmount, fromTokenDecimals))
    return parseFloat(plainRate.toFixed(fromTokenDecimals))
}

/**
 * Simulates a complete transaction object to display details
 */
export const populateExchangeTransaction = (
    swapParameters: SwapParameters
): RichedTransactionMeta => {
    return {
        id: "",
        status: TransactionStatus.UNAPPROVED,
        time: 1,
        blocksDropCount: 1,
        metaType: MetaType.REGULAR,
        loadingGasValues: false,
        transactionParams: {
            from: swapParameters.tx.from,
            to: swapParameters.tx.to,
        },
        transactionCategory: TransactionCategories.EXCHANGE,
        methodSignature: swapParameters.methodSignature,
        exchangeParams: {
            exchangeType: DEFAULT_EXCHANGE_TYPE,
            fromToken: swapParameters.fromToken,
            toToken: swapParameters.toToken,
            fromTokenAmount: swapParameters.fromTokenAmount,
            toTokenAmount: swapParameters.toTokenAmount,
            blockWalletFee: swapParameters.blockWalletFee,
        },
    }
}

export function calculatePricePercentageImpact(
    exchangeRates: Rates,
    fromToken: { token: BasicToken; amount: BigNumber },
    toToken: { token: BasicToken; amount: BigNumber }
): number | undefined {
    const fromTokenRate = getValueByKey(
        exchangeRates,
        fromToken.token.symbol,
        0
    )
    const toTokenRate = getValueByKey(exchangeRates, toToken.token.symbol, 0)

    if (fromTokenRate === 0 || toTokenRate === 0) {
        return undefined
    }

    const fromTokenCurrencyAmount = toCurrencyAmount(
        fromToken.amount || BigNumber.from(0),
        fromTokenRate,
        fromToken.token.decimals
    )
    const toTokenCurrencyAmount = toCurrencyAmount(
        toToken.amount || BigNumber.from(0),
        toTokenRate,
        toToken.token.decimals
    )

    const priceImpact =
        (100 -
            Math.abs(toTokenCurrencyAmount / fromTokenCurrencyAmount) * 100) /
        100

    return priceImpact
}
