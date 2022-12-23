import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"

export const convertAmount = (
    amount: BigNumber,
    rate: number,
    decimals: number = 18
): number => {
    if (!rate) return 0
    const numberAmount = formatUnits(amount, decimals)
    const convertedNumberAmount = parseFloat(numberAmount) * rate
    return convertedNumberAmount
}
