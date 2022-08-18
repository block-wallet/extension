import { useMemo } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"

export const useTransaction = (txId: string) => {
    const { transactions } = useBlankState()!

    const transaction = useMemo(() => {
        return transactions.find(({ id }) => id === txId)!
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [txId])

    return transaction
}

export default useTransaction
