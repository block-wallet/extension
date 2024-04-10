import { isValidAddress } from "ethereumjs-util"
import { TokenAllowance } from "@block-wallet/background/controllers/AccountTrackerController"

import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"

import { AllowancesFilters } from "../../components/allowances/AllowancesFilterButton"
import { formatHashFirstLastChars } from "../../util/formatAccount"

/**
 * The data to display in the allowance List Item
 *
 * @param address The address of the spender or the token
 * @param name The name of the spender or the token
 * @param logo The logo of the spender or the token
 * @param type The type of the data (spender or token)
 * @param symbol? The symbol of the token
 * @param decimals? The decimals of the token
 *
 **/
export type AllowanceDisplayData = {
    address: string
    name: string
    symbol?: string
    decimals?: number
    websiteURL?: string
    logo?: string
    type: AllowancesFilters
}

type AllowanceWithData = {
    allowance: TokenAllowance
    displayData: AllowanceDisplayData
}

export type GroupedAllowances = {
    groupBy: AllowanceDisplayData
    allowances: AllowanceWithData[]
}[]

type SpenderAllowances = {
    [spenderAddress: string]: {
        groupBy: AllowanceDisplayData
        allowances: AllowanceWithData[]
    }
}

/**
 *
 * Gets the allowances for the selected account of the selected network grouped by the Spender or the Token
 *
 * @param groupBy The filter to group the allowances by
 * @param search? The search string to filter the allowances
 * @returns The allowances grouped by the selected filter
 */
const useAccountAllowances = (groupBy: AllowancesFilters, search?: string) => {
    const account = useSelectedAccount()!
    const selectedNetwork = useSelectedNetwork()!

    const allowances = account.allowances[selectedNetwork.chainId]

    let groupedAllowancesArr: GroupedAllowances = []

    if (!allowances || !allowances.tokens) return groupedAllowancesArr

    if (groupBy === AllowancesFilters.TOKEN) {
        groupedAllowancesArr = Object.entries(allowances.tokens).reduce(
            (acc: GroupedAllowances, [, token]) => {
                const { name, logo, symbol, decimals, address } = token.token

                const tokenData = {
                    name,
                    logo,
                    symbol,
                    decimals,
                    address,
                    type: AllowancesFilters.TOKEN,
                }

                const allowancesData = Object.entries(token.allowances).map(
                    ([spenderAddress, allowance]) => {
                        return {
                            displayData: {
                                name: allowance.spender?.name
                                    ? `${
                                          allowance.spender?.name
                                      } ${formatHashFirstLastChars(
                                          spenderAddress
                                      )}`
                                    : `Spender ${formatHashFirstLastChars(
                                          spenderAddress
                                      )}`,
                                address: spenderAddress,
                                logo: allowance.spender?.logoURI,
                                websiteURL: allowance.spender?.websiteURL,
                                type: AllowancesFilters.SPENDER,
                            },
                            allowance,
                        }
                    }
                )
                acc.push({ groupBy: tokenData, allowances: allowancesData })
                return acc
            },
            []
        )
    } else {
        const allowancesBySpender = Object.values(allowances.tokens).reduce(
            (spenderAllowancesAcc: SpenderAllowances, token) => {
                const { name, logo, symbol, decimals, address } = token.token

                const displayData = {
                    name,
                    logo,
                    symbol,
                    decimals,
                    address,
                    type: AllowancesFilters.TOKEN,
                }

                Object.entries(token.allowances).forEach(
                    ([spenderAddress, spenderAllowance]) => {
                        if (!spenderAllowancesAcc[spenderAddress]) {
                            spenderAllowancesAcc[spenderAddress] = {
                                groupBy: {
                                    name: spenderAllowance.spender?.name
                                        ? `${
                                              spenderAllowance.spender?.name
                                          } ${formatHashFirstLastChars(
                                              spenderAddress
                                          )}`
                                        : `Spender ${formatHashFirstLastChars(
                                              spenderAddress
                                          )}`,
                                    address: spenderAddress,
                                    logo: spenderAllowance.spender?.logoURI,
                                    websiteURL:
                                        spenderAllowance.spender?.websiteURL,
                                    type: AllowancesFilters.SPENDER,
                                },
                                allowances: [],
                            }
                        }
                        spenderAllowancesAcc[spenderAddress].allowances.push({
                            allowance: { ...spenderAllowance },
                            displayData,
                        })
                    }
                )
                return spenderAllowancesAcc
            },
            {}
        )

        groupedAllowancesArr = Object.values(
            allowancesBySpender
        ) as GroupedAllowances
    }

    if (search) {
        if (isValidAddress(search)) {
            groupedAllowancesArr = groupedAllowancesArr.filter(
                (groupedAllowances) => {
                    // Return the group (token or spender) if the group address is the same
                    if (
                        groupedAllowances.groupBy.address
                            .toLowerCase()
                            .includes(search.toLowerCase())
                    )
                        return true

                    // Filter the allowances of a group (spender or token) and show the group with only matched allowances
                    groupedAllowances.allowances =
                        groupedAllowances.allowances.filter((allowance) =>
                            allowance.displayData.address
                                .toLowerCase()
                                .includes(search.toLowerCase())
                        )

                    return groupedAllowances.allowances.length !== 0
                }
            )
        } else {
            groupedAllowancesArr = groupedAllowancesArr.filter(
                (groupedAllowances) => {
                    // Filter the groups (token or spender) by the group name or symbol
                    if (
                        groupedAllowances.groupBy.name
                            .toLowerCase()
                            .includes(search.toLowerCase())
                    )
                        return true
                    if (
                        groupedAllowances.groupBy.symbol &&
                        groupedAllowances.groupBy.symbol
                            .toLowerCase()
                            .includes(search.toLowerCase())
                    )
                        return true

                    // Filter the allowances of a group (spender or token) by name or symbol and show the group with only matched allowances > 0
                    groupedAllowances.allowances =
                        groupedAllowances.allowances.filter(
                            (allowance) =>
                                allowance.displayData.name
                                    .toLowerCase()
                                    .includes(search.toLowerCase()) ||
                                (allowance.displayData.symbol &&
                                    allowance.displayData.symbol
                                        .toLowerCase()
                                        .includes(search.toLowerCase()))
                        )
                    return groupedAllowances.allowances.length !== 0
                }
            )
        }
    }

    return groupedAllowancesArr
}

export default useAccountAllowances
