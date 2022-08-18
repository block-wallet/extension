import { BigNumber } from "ethers"
import { formatUnits } from "ethers/lib/utils"

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
