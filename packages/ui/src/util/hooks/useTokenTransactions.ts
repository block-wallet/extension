import useTransactions from "./useTransactions"

const useTokenTransactions = (tokenSymbol: string | undefined) => {
    const { transactions } = useTransactions()
    return transactions.filter(({ transferType }) => {
        return tokenSymbol ? transferType?.currency === tokenSymbol : false
    })
}

export default useTokenTransactions
