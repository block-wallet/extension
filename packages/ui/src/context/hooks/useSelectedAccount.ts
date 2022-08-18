import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useBlankState } from "../background/backgroundHooks"

export const useSelectedAccount = (): AccountInfo => {
    const { accounts, selectedAddress } = useBlankState()!
    return accounts[selectedAddress]
}
