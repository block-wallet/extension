import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

export const convertAmount = (amount: BigNumber, rate: number) => {
    if (!rate) return BigNumber.from(0)

    // also works with scientific notation
    // regex trims trailing zeros
    const rateString = rate.toFixed(15).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/,'$1')

    // if too many decimal places or other issue
    if (!(Number(rateString))) return BigNumber.from(0)

    const rateDecimalPlaces =
        Math.floor(rate) === Number(rate) ? 0 : rateString.split('.')[1].length

    const roundDecimal = 10 ** rateDecimalPlaces
    const exchangeRateBN = parseUnits(rateString, rateDecimalPlaces)

    return BigNumber.from(amount).mul(exchangeRateBN).div(roundDecimal)
}
