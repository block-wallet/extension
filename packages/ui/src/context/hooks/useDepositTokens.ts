import { useEffect, useRef, useState } from "react"
import { getTokens } from "../commActions"
import { tokenAddresses } from "../util/getCurrencyAmountList"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { TokenList } from "./useTokensList"

import { ITokens } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"
import { useSelectedAccount } from "./useSelectedAccount"
import { AccountBalanceTokens } from "@block-wallet/background/controllers/AccountTrackerController"

export const useDepositTokens = () => {
    const tokenListRef = useRef<ITokens>()
    const [depositTokens, setDepositTokens] = useState<TokenList>([])

    const { balances } = useSelectedAccount()
    const { name, chainId, nativeCurrency, defaultNetworkLogo } =
        useSelectedNetwork()

    let networkBalances: AccountBalanceTokens = {}

    if (chainId in balances) {
        networkBalances = balances[chainId].tokens
        networkBalances["0x0"] = {
            balance: balances[chainId].nativeTokenBalance,
            token: {
                address: "0x0",
                type: "",
                decimals: nativeCurrency.decimals,
                name: nativeCurrency.name,
                symbol: nativeCurrency.symbol,
                logo: defaultNetworkLogo,
            },
        }
    }

    useEffect(() => {
        const actualTokens = [networkBalances["0x0"]] as TokenList

        const fetch = async () => {
            let tokenList = tokenListRef.current || (await getTokens())
            if (!tokenListRef.current) {
                tokenListRef.current = tokenList
            }

            // If the current network supports any ERC20 tokens,
            // include them in the list
            if (name in tokenAddresses) {
                tokenAddresses[name as keyof typeof tokenAddresses].forEach(
                    (a) => {
                        if (tokenList && a in tokenList) {
                            actualTokens.push({
                                balance:
                                    a in networkBalances
                                        ? networkBalances[a].balance
                                        : BigNumber.from(0),
                                token: tokenList[a],
                            })
                        }
                    }
                )
            }

            setDepositTokens(actualTokens)
        }

        fetch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, balances])

    return depositTokens
}
