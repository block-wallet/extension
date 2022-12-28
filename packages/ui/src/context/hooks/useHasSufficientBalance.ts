import { AccountBalanceToken } from "@block-wallet/background/controllers/AccountTrackerController"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"
import { parseUnits } from "@ethersproject/units"
import { useTokensList } from "./useTokensList"

export const useHasSufficientBalance = (
    value: string | BigNumber,
    token: Token
) => {
    const { nativeToken, currentNetworkTokens } = useTokensList()
    const { symbol, address } = token
    value =
        typeof value === "string" ? parseUnits(value, token.decimals) : value

    const tokens: { [key in string]: AccountBalanceToken } = {}

    currentNetworkTokens.forEach((currentNetworkToken) => {
        tokens[currentNetworkToken.token.address] = {
            ...currentNetworkToken,
        }
    })

    const tokenBalance =
        symbol === nativeToken.token.symbol
            ? BigNumber.from(nativeToken.balance)
            : address in tokens
            ? BigNumber.from(tokens[address].balance)
            : BigNumber.from(0)

    return BigNumber.from(tokenBalance).gte(value)
}
