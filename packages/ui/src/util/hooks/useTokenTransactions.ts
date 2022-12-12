import useTransactions from "./useTransactions"

const useTokenTransactions = (tokenContract: string | undefined) => {
    const contractToLower = tokenContract?.toLowerCase()
    const { transactions } = useTransactions()
    return transactions.filter(({ transactionParams }) => {
        return contractToLower
            ? transactionParams.to?.toLowerCase() === contractToLower
            : false
    })
}

export default useTokenTransactions
