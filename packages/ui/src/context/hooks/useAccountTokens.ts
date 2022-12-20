import { useBlankState } from "../background/backgroundHooks"
import { useSelectedAccount } from "./useSelectedAccount"
import { useSelectedNetwork } from "./useSelectedNetwork"

export const useAccountTokens = (accountAddress?: string, chainId?: number) => {
    // use current network if chainId is empty
    // use current selected account if accountAddress is empty
    const { userTokens } = useBlankState()!
    const account = useSelectedAccount()
    const network = useSelectedNetwork()

    if (!accountAddress) {
        accountAddress = account.address
    }

    if (!chainId) {
        chainId = network.chainId
    }

    const tokens =
        userTokens &&
        userTokens[account.address] &&
        userTokens[account.address][network.chainId]
            ? userTokens[account.address][network.chainId]
            : {}

    return tokens
}
