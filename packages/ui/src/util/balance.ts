import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { formatRounded } from "./formatRounded"

interface TokenInfo {
    decimals: number
    symbol?: string
}

interface DisplayOptions {
    dislpaySymbol?: boolean
    rounded?: boolean
    roundedDecimals?: number
}

const defaultOptions: DisplayOptions = {
    dislpaySymbol: true,
    rounded: true,
    roundedDecimals: 4,
}

export const formatAssetBalance = (
    balance: BigNumber = BigNumber.from(0),
    tokenInfo: TokenInfo,
    displayOptions: DisplayOptions = defaultOptions
): string => {
    const safeOptions = {
        ...defaultOptions,
        displayOptions,
    }

    let formatedBalance = formatUnits(balance || "0", tokenInfo.decimals)

    if (safeOptions.rounded) {
        formatedBalance = formatRounded(
            formatedBalance,
            safeOptions.roundedDecimals
        )
    }

    if (safeOptions.dislpaySymbol) {
        formatedBalance = `${formatedBalance} ${tokenInfo.symbol}`
    }

    return formatedBalance
}
