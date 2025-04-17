import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useBlankState } from "../background/backgroundHooks"

export const useSelectedAccount = (): AccountInfo => {
    const { accounts, selectedAddress } = useBlankState()!
    // Normalize the address to lowercase for object key lookup
    const normalizedAddress = selectedAddress.toLowerCase()
    return accounts[normalizedAddress]
}
