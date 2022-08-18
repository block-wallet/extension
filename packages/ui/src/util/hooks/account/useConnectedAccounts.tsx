import { useBlankState } from "../../../context/background/backgroundHooks"
import { session } from "../../../context/setup"

const useConnectedAccounts = () => {
    const { permissions } = useBlankState()!
    const origin = session?.origin
    const permission = origin ? permissions[origin] : undefined
    const connectedAccounts = permission?.accounts ?? []
    return {
        connectedAccounts,
        isAccountConnected: (accountAddress: string) =>
            (connectedAccounts || []).includes(accountAddress),
    }
}

export default useConnectedAccounts
