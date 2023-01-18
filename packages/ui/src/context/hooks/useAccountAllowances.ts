import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"
import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"

type AllowanceWithData = {
    allowance: TokenAllowance
    displayData: AllowanceDisplayData
}

/**
 * The data to display in the allowance List Item
 *
 * @param address The address of the spender or the token
 * @param name The name of the spender or the token
 * @param logo The logo of the spender or the token
 * @param type The type of the data (spender or token)
 *
 **/
export type AllowanceDisplayData = {
    address: string
    name: string
    symbol?: string
    decimals?: number
    logo: string
    type: AllowancesFilters
}

export type generalAllowances = {
    groupBy: AllowanceDisplayData
    allowances: AllowanceWithData[]
}[]

/**
 *
 * Gets the allowances for the selected account of the selected network grouped by the Spender or the Token
 *
 * @param groupBy The filter to group the allowances by
 * @returns The allowances grouped by the selected filter
 */
const useAccountAllowances = (groupBy: AllowancesFilters, search?: string) => {
    const account = useSelectedAccount()!
    const selectedNetwork = useSelectedNetwork()!
    const allowances = account.allowances[selectedNetwork.chainId]
    let allowancesArr: generalAllowances = []
    if (!allowances || !allowances.tokens) return allowancesArr
    if (groupBy === AllowancesFilters.TOKEN) {
        allowancesArr = Object.entries(allowances.tokens).map(([, token]) => {
            return {
                groupBy: {
                    name: token.token.name,
                    address: token.token.address,
                    symbol: token.token.symbol,
                    decimals: token.token.decimals,
                    logo: token.token.logo,
                    type: AllowancesFilters.TOKEN,
                },
                allowances: Object.entries(token.allowances).map(
                    ([spenderAddress, allowance]) => {
                        return {
                            displayData: {
                                name: "UniSwap",
                                address: spenderAddress,
                                logo: "",
                                type: AllowancesFilters.SPENDER,
                            },
                            allowance,
                        }
                    }
                ),
            }
        }) as generalAllowances
    } else {
        let allowancesBySpender: any = {}

        Object.values(allowances.tokens).map((token) => {
            let tokenData = token.token
            Object.entries(token.allowances).map((allowance) => {
                const spenderAddress = allowance[0]
                const spenderAllowance = allowance[1]

                if (!allowancesBySpender[spenderAddress]) {
                    allowancesBySpender[spenderAddress] = {
                        groupBy: {
                            name:
                                spenderAddress ===
                                "0x1111111254fb6c44bAC0beD2854e76F90643097d"
                                    ? "UniSwap"
                                    : "QuickSwap",
                            address: spenderAddress,
                            logo: "",
                            type: AllowancesFilters.SPENDER,
                        },
                    }
                    allowancesBySpender[spenderAddress] = {
                        ...allowancesBySpender[spenderAddress],
                        allowances: [
                            {
                                allowance: {
                                    ...spenderAllowance,
                                },
                                displayData: {
                                    name: tokenData.name,
                                    logo: tokenData.logo,
                                    symbol: tokenData.symbol,
                                    decimals: tokenData.decimals,
                                    address: tokenData.address,
                                    type: AllowancesFilters.TOKEN,
                                },
                            },
                        ],
                    }
                } else {
                    allowancesBySpender[spenderAddress] = {
                        ...allowancesBySpender[spenderAddress],
                        allowances: [
                            ...allowancesBySpender[spenderAddress].allowances,
                            {
                                allowance: {
                                    ...spenderAllowance,
                                },
                                displayData: {
                                    name: tokenData.name,
                                    logo: tokenData.logo,
                                    symbol: tokenData.symbol,
                                    decimals: tokenData.decimals,
                                    address: tokenData.address,
                                    type: AllowancesFilters.TOKEN,
                                },
                            },
                        ],
                    }
                }
            })
        })
        allowancesArr = Object.values(allowancesBySpender) as generalAllowances
    }

    if (search) {
        allowancesArr = allowancesArr.filter((allowance) =>
            allowance.groupBy.name.toLowerCase().includes(search.toLowerCase())
        )
    }

    return allowancesArr
}

export default useAccountAllowances
