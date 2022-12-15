import useActivtyListTransactions from "./useActivtyListTransactions"

const useTokenTransactions = (tokenContract: string | undefined) => {
    const contractToLower = tokenContract?.toLowerCase()
    const { transactions } = useActivtyListTransactions()
    return transactions.filter(({ transactionParams }) => {
        return contractToLower
            ? transactionParams.to?.toLowerCase() === contractToLower
            : false
    })
}

export default useTokenTransactions
