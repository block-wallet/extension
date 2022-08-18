import Common from "../../components/CancelSpeedUpCommon"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import Price from "../../components/transactions/Price"
import { TransactionType } from "../../context/commTypes"
import { getCancelGasPrice, cancelTransaction } from "../../context/commActions"

const CancelPage = () => {
    const { nativeCurrency: networkNativeCurrency } = useSelectedNetwork()

    return (
        <Common
            title="Cancel transaction"
            type="cancel"
            getSuggestedFees={getCancelGasPrice}
            submitAction={cancelTransaction}
        >
            {(type, _oldFees, newFees) => (
                <Price
                    title="TRANSACTION COST"
                    amount={(type !== TransactionType.FEE_MARKET_EIP1559
                        ? newFees.gasPrice
                        : newFees.maxFeePerGas
                    ).mul(newFees.gasLimit)}
                    symbol={networkNativeCurrency.symbol}
                    decimals={networkNativeCurrency.decimals}
                />
            )}
        </Common>
    )
}

export default CancelPage
