import { useBlankState } from '../background/backgroundHooks'

export const useSelectedAccount = () => {
    const { accounts, selectedAddress } = useBlankState()!
    return accounts[selectedAddress]
}
