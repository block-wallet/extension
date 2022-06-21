import { useBlankState } from '../background/backgroundHooks'

export const usePendingDeposits = () => {
    const { pendingDeposits } = useBlankState()!
    return pendingDeposits
}
