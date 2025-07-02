import React from 'react';
import classnames from 'classnames';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionFeeData } from '@block-wallet/background/controllers/erc-20/transactions/SignedTransaction';
import { TransactionAdvancedData } from '@block-wallet/background/controllers/transactions/utils/types';
import { GasPriceSelector } from '../transactions/GasPriceSelector';
import GasPriceComponent from '../transactions/GasPriceComponent';
import { AdvancedSettings } from '../transactions/AdvancedSettings';
import { ResponseGetState } from '@block-wallet/background/utils/types/communication'; // Type for blankState

interface GasSettingsProps {
    isEIP1559Compatible: boolean | undefined;
    blankState: ResponseGetState;
    defaultGas: TransactionFeeData; // Estimated/default gas values
    selectedGas: TransactionFeeData; // Currently selected gas (can be modified by user)
    setSelectedGas: (gas: TransactionFeeData) => void; // Callback to update selected gas in parent
    isGasLoading: boolean;
    gasEstimationFailed: boolean;
    address: string; // Current account address for AdvancedSettings
    transactionAdvancedData: TransactionAdvancedData;
    setTransactionAdvancedData: (data: TransactionAdvancedData) => void;
    className?: string; // Add className prop
}

export const GasSettings: React.FC<GasSettingsProps> = ({
    isEIP1559Compatible,
    blankState,
    defaultGas,
    selectedGas,
    setSelectedGas,
    isGasLoading,
    gasEstimationFailed,
    address,
    transactionAdvancedData,
    setTransactionAdvancedData,
    className, // Destructure className
}) => {
    return (
        <div className={classnames("flex flex-col", className)}>
            <div className="flex flex-row justify-between items-center">
                <label className="ml-1 mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    Gas Price
                </label>
            </div>

            {/* Gas Price Selection */}
            {!isEIP1559Compatible ? (
                <GasPriceSelector
                    defaultLevel={blankState.defaultGasOption || "medium"}
                    defaultGasLimit={defaultGas.gasLimit!}
                    defaultGasPrice={defaultGas.gasPrice!}
                    setGasPriceAndLimit={(gasPrice, gasLimit) => {
                        setSelectedGas({ gasPrice, gasLimit } as TransactionFeeData);
                    }}
                    isParentLoading={isGasLoading}
                    showEstimationError={gasEstimationFailed}
                />
            ) : (
                <GasPriceComponent
                    defaultGas={{
                        defaultLevel: blankState.defaultGasOption || "medium",
                        feeData: defaultGas,
                    }}
                    isParentLoading={isGasLoading}
                    setGas={(gasFees: TransactionFeeData) => {
                        setSelectedGas(gasFees);
                    }}
                    showEstimationError={gasEstimationFailed}
                    displayOnlyMaxValue
                />
            )}

            {/* Advanced Settings */}
            <div className="mt-3">
                <AdvancedSettings
                    address={address}
                    advancedSettings={transactionAdvancedData}
                    display={{
                        nonce: true,
                        flashbots: false,
                        slippage: false,
                    }}
                    setAdvancedSettings={(newSettings: TransactionAdvancedData) => {
                        setTransactionAdvancedData({
                            customNonce: newSettings.customNonce,
                            ...(transactionAdvancedData ?? {}),
                        });
                    }}
                    buttonDisplay={false}
                />
            </div>
        </div>
    );
};
