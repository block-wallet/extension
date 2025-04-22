import { useState, useCallback, useEffect } from 'react';
import { BigNumber } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import { parseUnits } from '@ethersproject/units';
import log from 'loglevel';
import {
    getSendTransactionGasLimit,
    getLatestGasPrice,
} from '../../context/commActions';
import { TokenWithBalance } from './useTokensList';
import { TransactionFeeData } from '@block-wallet/background/controllers/erc-20/transactions/SignedTransaction';
import { SEND_GAS_COST } from '../../util/constants';

// Debounce utility (can be moved to a shared utils file)
const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
};

interface UseGasEstimationProps {
    selectedToken: TokenWithBalance | undefined;
    recipientAddress: string;
    amountValue: string; // Watched amount from form
    isEIP1559Compatible: boolean | undefined;
    initialDefaultGasPrice: BigNumber;
}

interface UseGasEstimationResult {
    isGasLoading: boolean;
    gasEstimationFailed: boolean;
    defaultGas: TransactionFeeData;
    selectedGas: TransactionFeeData;
    allowAmountZero: boolean;
    setSelectedGas: React.Dispatch<React.SetStateAction<TransactionFeeData>>;
    // Expose debounced fetcher if needed externally, though likely not
}

export const useGasEstimation = ({
    selectedToken,
    recipientAddress,
    amountValue,
    isEIP1559Compatible,
    initialDefaultGasPrice,
}: UseGasEstimationProps): UseGasEstimationResult => {
    const [isGasLoading, setIsGasLoading] = useState(true);
    const [gasEstimationFailed, setGasEstimationFailed] = useState(false);
    const [allowAmountZero, setAllowAmountZero] = useState<boolean>(true)

    // State for the selected gas options (might be adjusted by GasPriceComponent)
    const [selectedGas, setSelectedGas] = useState<TransactionFeeData>(() => ({
        gasLimit: BigNumber.from(0),
        gasPrice: isEIP1559Compatible ? undefined : BigNumber.from(0),
        maxPriorityFeePerGas: isEIP1559Compatible ? BigNumber.from(0) : undefined,
        maxFeePerGas: isEIP1559Compatible ? BigNumber.from(0) : undefined,
    }));

    // State for the default/estimated gas (updated by estimation)
    const [defaultGas, setDefaultGas] = useState<TransactionFeeData>(() => ({
        gasLimit: SEND_GAS_COST,
        gasPrice: initialDefaultGasPrice, // Use initial value
    }));

    // Debounced gas limit fetcher function (internal to the hook)
    const debouncedFetchGasLimitInternal = useCallback(
        debounce(async (
            token: TokenWithBalance | undefined,
            recipient: string,
            _amountValue: string,
            eip1559Compatible: boolean | undefined
        ) => {
            if (!token || !recipient) {
                // Don't run estimation if required data is missing
                setIsGasLoading(false);
                // Reset default gas if needed?
                // setDefaultGas({ gasLimit: SEND_GAS_COST, gasPrice: initialDefaultGasPrice });
                // setSelectedGas({ gasLimit: BigNumber.from(0), /* other fields */ });
                return;
            }
            setIsGasLoading(true); // Set loading true when starting fetch
            try {
                const hasTokenBalance = BigNumber.from(token.balance).gt(Zero);
                let estimateValue = hasTokenBalance
                    ? parseUnits(_amountValue || '1', token.token.decimals)
                    : Zero;

                if (estimateValue.gt(token.balance)) {
                    estimateValue = BigNumber.from(token.balance);
                }

                let { gasLimit, estimationSucceeded } = await getSendTransactionGasLimit(
                    token.token.address,
                    recipient,
                    estimateValue
                );

                if (!hasTokenBalance && !estimationSucceeded) {
                    estimationSucceeded = true; // Ignore failure if no balance
                }

                setGasEstimationFailed(!estimationSucceeded);

                let gasPrice = initialDefaultGasPrice;
                if (!eip1559Compatible) {
                    try {
                        gasPrice = await getLatestGasPrice();
                    } catch (priceError) {
                        log.error("Failed to get latest gas price:", priceError);
                        // Keep using initial default price
                    }
                }

                const newGasLimit = BigNumber.from(gasLimit);

                setDefaultGas({
                    gasLimit: newGasLimit,
                    gasPrice: eip1559Compatible ? undefined : gasPrice,
                });
                setSelectedGas((prevGas) => ({
                    ...prevGas,
                    gasLimit: newGasLimit,
                    // Optionally reset price/fees based on new defaults?
                    // gasPrice: eip1559Compatible ? undefined : gasPrice,
                    // maxPriorityFeePerGas: eip1559Compatible ? ??? : undefined,
                    // maxFeePerGas: eip1559Compatible ? ??? : undefined,
                }));

                setAllowAmountZero(true); // Reset allowAmountZero on successful fetch

            } catch (error: any) {
                log.error('Error estimating gas limit: ', error);
                if (error.message?.match(/bigger than zero/gi)) {
                    setAllowAmountZero(false); // Set if estimation fails due to zero amount
                } else {
                    setGasEstimationFailed(true); // Mark as failed for other errors
                }
                // Reset gas to sensible defaults on error?
                setDefaultGas({ gasLimit: SEND_GAS_COST, gasPrice: initialDefaultGasPrice });
                setSelectedGas((prev) => ({ ...prev, gasLimit: SEND_GAS_COST }));
            } finally {
                setIsGasLoading(false);
            }
        }, 500), // Debounce time
        [initialDefaultGasPrice] // Dependencies for debounce callback
    );

    // Effect to trigger the debounced fetch
    useEffect(() => {
        debouncedFetchGasLimitInternal(
            selectedToken,
            recipientAddress,
            amountValue,
            isEIP1559Compatible
        );
    }, [selectedToken, recipientAddress, amountValue, isEIP1559Compatible, debouncedFetchGasLimitInternal]);

    return {
        isGasLoading,
        gasEstimationFailed,
        defaultGas,
        selectedGas,
        allowAmountZero,
        setSelectedGas, // Allow parent component (GasPriceComponent) to update selected gas
    };
}; 