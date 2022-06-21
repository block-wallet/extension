import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { Rates } from "@block-wallet/background/controllers/ExchangeRatesController"
import { BigNumber, utils } from "ethers"
import { DEFAULT_TRANSACTION_GAS_PERCENTAGE_THRESHOLD } from "./constants"
import { formatCurrency, toCurrencyAmount } from "./formatCurrency"

interface GasFeesCalculation {
    minValue: BigNumber
    maxValue: BigNumber
    minValueNativeCurrency?: string
    maxValueNativeCurrency?: string
}

interface ConversionData {
    exchangeRates: Rates
    networkNativeCurrency: {
        symbol: string
        decimals: number
    }
    localeInfo: {
        currency: string
        language: string
    }
    minValue?: number
}

const calculateTransactionGas = (
    gasLimit: BigNumber,
    gasPrice?: BigNumber | undefined,
    maxFeePerGas?: BigNumber
): BigNumber => {
    return BigNumber.from(gasLimit!.mul(gasPrice ?? maxFeePerGas ?? 0))
}

const gasPriceToNativeCurrency = (
    gasPrice: BigNumber,
    conversionData: ConversionData
) => {
    const { exchangeRates, networkNativeCurrency, localeInfo } = conversionData
    return formatCurrency(
        toCurrencyAmount(
            gasPrice,
            exchangeRates[networkNativeCurrency.symbol],
            networkNativeCurrency!.decimals
        ),
        {
            currency: localeInfo.currency,
            locale_info: localeInfo.language,
            showCurrency: true,
            showSymbol: true,
            precision: 2,
        }
    )
}

const calculateGasPricesFromTransactionFees = (
    gasFees: TransactionFeeData,
    baseFee: BigNumber,
    conversionData?: ConversionData
): GasFeesCalculation => {
    // MinValue: (baseFee + tip) * gasLimit
    // We assume that the baseFee could at most be reduced 25% in next 2 blocks so for calculating the min value we apply that reduction.

    // 25% of BaseFee => (baseFee * 25) / 100
    const percentage = baseFee.mul(BigNumber.from(25)).div(BigNumber.from(100))
    const minBaseFee = baseFee.sub(percentage)

    // MaxValue: maxFeePerGas * gasLimit
    const maxValue = gasFees.maxFeePerGas!.mul(gasFees.gasLimit!)

    // if implied baseFee of gasFees is lower than current baseFee
    // adjusted by 25% anyways, minValue will be equal maxValue
    const minValue = minBaseFee.lt(
        gasFees.maxFeePerGas!.sub(gasFees.maxPriorityFeePerGas!)
    )
        ? minBaseFee.add(gasFees.maxPriorityFeePerGas!).mul(gasFees.gasLimit!)
        : maxValue

    let minValueNativeCurrency = undefined
    let maxValueNativeCurrency = undefined

    if (conversionData) {
        minValueNativeCurrency = gasPriceToNativeCurrency(
            minValue.lt(maxValue) ? minValue : maxValue,
            conversionData
        )

        maxValueNativeCurrency = gasPriceToNativeCurrency(
            minValue.gt(maxValue) ? minValue : maxValue,
            conversionData
        )
    }

    return {
        minValue,
        maxValue,
        minValueNativeCurrency,
        maxValueNativeCurrency,
    }
}

const estimatedGasExceedsBaseLowerThreshold = (
    baseMinGas: BigNumber,
    estimatedGas: BigNumber,
    percentage = DEFAULT_TRANSACTION_GAS_PERCENTAGE_THRESHOLD
): boolean => {
    const dif = baseMinGas
        .mul(BigNumber.from(percentage))
        .div(BigNumber.from(100))
    if (baseMinGas.sub(dif).gte(estimatedGas)) {
        return true
    }
    return false
}

const estimatedGasExceedsBaseHigherThreshold = (
    baseMaxGas: BigNumber,
    estimatedGas: BigNumber,
    percentage = DEFAULT_TRANSACTION_GAS_PERCENTAGE_THRESHOLD
): boolean => {
    const dif = baseMaxGas
        .mul(BigNumber.from(percentage))
        .div(BigNumber.from(100))
    if (baseMaxGas.add(dif).lte(estimatedGas)) {
        return true
    }
    return false
}

const gasToGweiString = (gas: BigNumber | null) => {
    if (!gas) return ""

    const gasInGwei = utils.formatUnits(gas, "gwei")

    if (Number(gasInGwei) > 1) {
        return String(Math.round(Number(gasInGwei)))
    } else if (Number(gasInGwei) > 0.1) {
        return String(Math.round(Number(gasInGwei) * 10) / 10)
    } else if (Number(gasInGwei) > 0) {
        return "<0.1"
    } else {
        return ""
    }
}

export {
    calculateGasPricesFromTransactionFees,
    estimatedGasExceedsBaseLowerThreshold,
    estimatedGasExceedsBaseHigherThreshold,
    calculateTransactionGas,
    gasPriceToNativeCurrency,
    gasToGweiString,
}
