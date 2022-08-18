import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import { getLatestDepositDate } from "../context/commActions"

/**
 * hasDepositedRecently
 *
 * @param pair The pair to check against
 * @returns The date of the latest deposit made for the specified pool
 */
export const hasDepositedRecently = async (pair: CurrencyAmountPair) => {
    const lastTimeDeposited = new Date(await getLatestDepositDate(pair))
    const elapsed =
        Math.abs(new Date().getTime() - lastTimeDeposited.getTime()) / 36e5
    return elapsed <= 24
}
