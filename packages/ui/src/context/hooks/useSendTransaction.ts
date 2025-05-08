import { useState, useCallback } from 'react';
import { BigNumber } from '@ethersproject/bignumber';
import { parseUnits, formatUnits } from '@ethersproject/units';
import { TransactionFeeData } from '@block-wallet/background/controllers/erc-20/transactions/SignedTransaction';
import { TransactionAdvancedData } from '@block-wallet/background/controllers/transactions/utils/types';
import log from 'loglevel'; // Import log
import {
    sendEther,
    sendToken,
    rejectTransaction, // Needed for hardware wallet rejection
} from '../../context/commActions';
import { TokenWithBalance } from './useTokensList';
import { DEFAULT_DECIMALS } from '../../util/constants';
import { AccountType } from '../commTypes';
import { isHardwareWallet } from '../../util/account';
import { useLocationRecovery } from '../../util/hooks/useLocationRecovery';
import useLocalStorageState from '../../util/hooks/useLocalStorageState';
import useCheckAccountDeviceLinked from '../../util/hooks/useCheckAccountDeviceLinked'; // Default import
import { useTransactionWaitingDialog } from './useTransactionWaitingDialog';
import { HardwareWalletOpTypes } from '../commTypes';
import { useInProgressInternalTransaction } from './useInProgressInternalTransaction';

interface SendConfirmPersistedState {
    amount: string
    submitted: boolean
    asset: TokenWithBalance | null
    txId: string
    note: string
    labels: string[]
}
const INITIAL_VALUE_PERSISTED_DATA = {
    asset: null,
    amount: "",
    submitted: false,
    txId: "",
    note: "",
    labels: [],
}

interface UseSendTransactionProps {
    selectedToken: TokenWithBalance | undefined;
    nativeToken: TokenWithBalance;
    receivingAddress: string;
    selectedGas: TransactionFeeData;
    transactionAdvancedData: TransactionAdvancedData;
    balance: BigNumber; // User's native balance
    isEIP1559Compatible?: boolean;
    accountType: AccountType; // Use correct type
    usingMax: boolean;
    getMaxTransactionAmount: () => BigNumber;
    formData: any; // Type this according to your AmountFormData
}

interface UseSendTransactionResult {
    submitTransaction: (note?: string, labels?: string[]) => Promise<void>;
    isSubmitting: boolean;
    submissionError: string | null;
    clearSubmissionError: () => void;
    dialogState: ReturnType<typeof useTransactionWaitingDialog>;
    showContractAddressWarning: boolean;
}

// Validation helpers (could be moved to utils)
const EtherSendBalanceValidation = (
    _balance: BigNumber,
    txAmount: BigNumber,
    _selectedGas: TransactionFeeData,
    _isEIP1559Compatible?: boolean
): boolean => {
    // ... (implementation from SendConfirmPage)
    const balance = BigNumber.from(_balance);
    const gasLimit = BigNumber.from(_selectedGas.gasLimit);
    const gasPriceOrFee = BigNumber.from(
        _isEIP1559Compatible ? _selectedGas.maxFeePerGas : _selectedGas.gasPrice
    );
    const totalCost = txAmount.add(gasLimit.mul(gasPriceOrFee));
    return balance.gte(totalCost);
}

const GasCostBalanceValidation = (
    _balance: BigNumber,
    _selectedGas: TransactionFeeData,
    _isEIP1559Compatible?: boolean
): boolean => {
    // ... (implementation from SendConfirmPage)
    const balance = BigNumber.from(_balance);
    const gasLimit = BigNumber.from(_selectedGas.gasLimit);
    const gasPriceOrFee = BigNumber.from(
        _isEIP1559Compatible ? _selectedGas.maxFeePerGas : _selectedGas.gasPrice
    );
    const totalGasCost = gasLimit.mul(gasPriceOrFee);
    return balance.gte(totalGasCost);
}

const TokenSendBalanceValidation = (
    tokenBalance: BigNumber,
    amount: BigNumber
): boolean => {
    // ... (implementation from SendConfirmPage)
    return BigNumber.from(tokenBalance).gte(BigNumber.from(amount));
}

export const useSendTransaction = ({
    selectedToken,
    nativeToken,
    receivingAddress,
    selectedGas,
    transactionAdvancedData,
    balance,
    isEIP1559Compatible,
    accountType,
    usingMax,
    getMaxTransactionAmount,
    formData,
}: UseSendTransactionProps): UseSendTransactionResult => {
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isCheckingDevice, setIsCheckingDevice] = useState(false);
    const [showContractAddressWarning, setShowContractAddressWarning] = useState(false);
    const { clear: clearLocationRecovery } = useLocationRecovery();
    const { checkDeviceIsLinked } = useCheckAccountDeviceLinked(); // Destructure default export

    // --- Persisted State Handling --- //
    // It might be better to pass persistedData setters down instead of managing it here
    // Or use a shared context/state manager for persisted data.
    // For now, replicating the logic. Consider refactoring.
    const [persistedData, setPersistedData] =
        useLocalStorageState<SendConfirmPersistedState>("send.form", {
            initialValue: { ...INITIAL_VALUE_PERSISTED_DATA, submitted: false },
            volatile: true,
        });

    const { transaction: currentTransaction, clearTransaction } =
        useInProgressInternalTransaction({ txId: persistedData.txId });

    // Hook for the waiting dialog
    const dialogState = useTransactionWaitingDialog(
        currentTransaction
            ? {
                id: currentTransaction?.id,
                status: currentTransaction?.status,
                error: currentTransaction?.error as Error,
                epochTime: currentTransaction?.approveTime,
                qrParams: currentTransaction.qrParams,
            }
            : undefined,
        HardwareWalletOpTypes.SIGN_TRANSACTION,
        accountType,
        {
            reject: useCallback(() => {
                if (currentTransaction?.id) {
                    rejectTransaction(currentTransaction?.id);
                }
            }, [currentTransaction?.id]),
        }
    );
    const { dispatch: dispatchDialog, status: dialogStatus, closeDialog } = dialogState;
    const isSending = dialogStatus === "loading";

    // Combined submitting state
    const isSubmitting = isCheckingDevice || isSending;

    const clearSubmissionError = () => {
        setSubmissionError(null);
        setShowContractAddressWarning(false);
        setPersistedData((prev) => ({ ...prev, submitted: false, txId: "" }));
        clearLocationRecovery();
    }

    const submitTransaction = useCallback(async (note?: string, labels?: string[]) => {
        clearSubmissionError();
        if (!selectedToken) {
            setSubmissionError("Select a token first.");
            return;
        }

        if (
            selectedToken.token.address !== nativeToken.token.address &&
            selectedToken.token.address.toLowerCase() === receivingAddress.toLowerCase()
        ) {
            setSubmissionError("Warning: Sending tokens to the token contract address itself can result in loss of funds.");
            setShowContractAddressWarning(true);
            return;
        }

        const value = usingMax
            ? getMaxTransactionAmount()
            : parseUnits(
                formData.amount.toString(),
                selectedToken.token.decimals || DEFAULT_DECIMALS
            );

        dispatchDialog({ type: "open", payload: { status: "loading" } });

        if (isHardwareWallet(accountType)) {
            setIsCheckingDevice(true);
            const isLinked = await checkDeviceIsLinked();
            setIsCheckingDevice(false);
            if (!isLinked) {
                closeDialog();
                return;
            }
        }

        let balanceValidation: boolean = false;
        let errorMessage: string = "";
        if (selectedToken.token.address === nativeToken.token.address) {
            balanceValidation = EtherSendBalanceValidation(
                balance,
                value,
                selectedGas,
                isEIP1559Compatible
            );
            errorMessage = `Insufficient funds for amount + gas.`;
        } else {
            balanceValidation = GasCostBalanceValidation(
                balance,
                selectedGas,
                isEIP1559Compatible
            );
            errorMessage = `Insufficient funds for gas cost.`;
            if (balanceValidation) {
                balanceValidation = TokenSendBalanceValidation(
                    selectedToken.balance,
                    value
                );
                errorMessage = `Insufficient token balance.`;
            }
        }

        if (!showContractAddressWarning && !balanceValidation) {
            setSubmissionError(errorMessage);
            dispatchDialog({
                type: "setStatus",
                payload: { status: "error", texts: { error: errorMessage } },
            });
            return;
        }

        try {
            let sendPromise = null;
            if (selectedToken.token.address === nativeToken.token.address) {
                sendPromise = sendEther(
                    receivingAddress,
                    selectedGas,
                    value,
                    transactionAdvancedData,
                    note,
                    labels
                );
            } else {
                sendPromise = sendToken(
                    selectedToken.token.address,
                    receivingAddress,
                    selectedGas,
                    value,
                    transactionAdvancedData,
                    note,
                    labels
                );
            }

            setPersistedData((prev) => ({ ...prev, submitted: true, txId: "", note: note || "", labels: labels || [] }));

            await sendPromise;

        } catch (error: any) {
            log.error("Send transaction error:", error);
            const errMsg = error.message || "Failed to send transaction.";
            setSubmissionError(errMsg);
            dispatchDialog({
                type: "setStatus",
                payload: { status: "error", texts: { error: errMsg } },
            });
            setPersistedData((prev) => ({ ...prev, submitted: false, txId: "" }));
            clearTransaction();
        }
    }, [
        selectedToken,
        nativeToken,
        receivingAddress,
        selectedGas,
        transactionAdvancedData,
        balance,
        isEIP1559Compatible,
        accountType,
        usingMax,
        getMaxTransactionAmount,
        formData,
        checkDeviceIsLinked,
        dispatchDialog,
        closeDialog,
        setPersistedData,
        clearLocationRecovery,
        clearTransaction,
        showContractAddressWarning,
    ]);

    return {
        submitTransaction,
        isSubmitting,
        submissionError,
        clearSubmissionError,
        dialogState,
        showContractAddressWarning,
    };
};
