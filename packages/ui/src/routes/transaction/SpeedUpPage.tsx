import React from "react"
import Common from "../../components/CancelSpeedUpCommon"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import Price from "../../components/transactions/Price"
import { TransactionType } from "../../context/commTypes"
import {
    getSpeedUpGasPrice,
    speedUpTransaction,
} from "../../context/commActions"

const SpeedUpPage = () => {
    const { nativeCurrency: networkNativeCurrency } = useSelectedNetwork()

    return (
        <Common
            title="Speed up transaction"
            type="speed up"
            getSuggestedFees={getSpeedUpGasPrice}
            submitAction={speedUpTransaction}
        >
            {(type, oldFees, newFees) => (
                <>
                    <Price
                        title="OLD GAS FEE"
                        amount={(type !== TransactionType.FEE_MARKET_EIP1559
                            ? oldFees.gasPrice
                            : oldFees.maxFeePerGas
                        ).mul(oldFees.gasLimit)}
                        symbol={networkNativeCurrency.symbol}
                        decimals={networkNativeCurrency.decimals}
                    />
                    <Price
                        title="NEW GAS FEE"
                        amount={(type !== TransactionType.FEE_MARKET_EIP1559
                            ? newFees.gasPrice
                            : newFees.maxFeePerGas
                        ).mul(newFees.gasLimit)}
                        symbol={networkNativeCurrency.symbol}
                        decimals={networkNativeCurrency.decimals}
                    />
                </>
            )}
        </Common>
    )
}

export default SpeedUpPage
