import useActivtyListTransactions from "./useActivtyListTransactions"

const useTokenTransactions = (tokenSymbol: string | undefined) => {
    const { transactions } = useActivtyListTransactions()
    return transactions.filter(({ transferType }) => {
        return tokenSymbol ? transferType?.currency === tokenSymbol : false
    })
}

export default useTokenTransactions
