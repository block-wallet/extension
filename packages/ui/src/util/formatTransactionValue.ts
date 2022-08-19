import { formatUnits } from "@ethersproject/units"
import { TransferType } from "@block-wallet/background/controllers/transactions/utils/types"
import { formatRounded } from "./formatRounded"

const formatTransactionValue = (
    { amount, currency, decimals }: TransferType,
    round = false,
    roundDecimals = 6
) => {
    const value = formatUnits(amount, decimals)
    return [
        `${round ? formatRounded(value, roundDecimals) : value}`,
        currency.toUpperCase(),
    ]
}

export default formatTransactionValue
