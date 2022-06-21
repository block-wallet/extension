/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-empty-function */
import { BigNumber, ethers } from 'ethers';
import { PreferencesController } from '../../PreferencesController';
import {
    TransactionController,
    TransactionGasEstimation,
} from '../../transactions/TransactionController';
import {
    MetaType,
    TransactionAdvancedData,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../../transactions/utils/types';
import {
    gasMaxFeePerGasParamNotPresentError,
    gasPriceParamNotPresentError,
    populatedTransactionParamNotPresentError,
    transactionIdParamNotPresentError,
    transactionNotFound,
} from '../TokenController';
import {
    TokenTransactionController,
    TokenTransactionProps,
} from './Transaction';
import * as transactionUtils from './../../transactions/utils/utils';
import { INITIAL_NETWORKS } from '../../../utils/constants/networks';
import { bnGreaterThanZero } from '../../../utils/bnUtils';
import { v4 as uuid } from 'uuid';
import {
    LogDescription,
    ParamType,
    TransactionDescription,
} from 'ethers/lib/utils';
import log from 'loglevel';
import { TransactionArgument } from '../../transactions/ContractSignatureParser';

const GAS_LIMIT = 2e6;

export interface PopulatedTransactionParams {}

export interface TransactionFeeData {
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
    gasPrice?: BigNumber;
    gasLimit?: BigNumber;
}

/**
 * Interface for token transactions.
 */
export interface ISignedTransaction {
    /**
     * Populates the transaction from the contract.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     */
    populateTransaction(
        populateTransactionParams: PopulatedTransactionParams
    ): Promise<ethers.PopulatedTransaction>;

    /**
     * Calculates the gas limit for a populated transaction. It returns a flag that indicates if the estimation succeeded or defaulted to a fallback price.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     */
    calculateTransactionGasLimit(
        populateTransactionParams: PopulatedTransactionParams
    ): Promise<TransactionGasEstimation>;

    /**
     * Adds an unapproved transaction to the transaction state.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     * @param {FeeData} feeData an object with gas fee data.
     * @param {TransactionAdvancedData} advancedData an object with transaction advanced data.
     */
    addAsNewTransaction(
        populateTransactionParams: PopulatedTransactionParams,
        feeData: TransactionFeeData,
        advancedData: TransactionAdvancedData
    ): Promise<TransactionMeta>;

    /**
     * Updates the gas configuration for an unnaproved transaction.
     * @param {string} transactionId the id of the transaction to be updated.
     * @param {FeeData} feeData an object with gas fee data.
     */
    updateTransactionGas(
        transactionId: string,
        feeData: TransactionFeeData
    ): Promise<void>;

    /**
     * Approves a transaction.
     * @param {string} transactionId the id of the transaction to be approved.
     */
    approveTransaction(transactionId: string): Promise<void>;

    /**
     * Gets the result of a transaction.
     * @param {string} transactionId the id of the transaction to get the result.
     */
    getTransactionResult(transactionId: string): Promise<any>;

    /**
     * Returns the arguments of an ERC20 contract call, formatted as object.
     * If sent, transaction category will be validated.
     *
     * @param callData Transaction data
     * @param category Transaction category
     */
    decodeInputData(
        callData: string,
        category?: TransactionCategories
    ): Record<string, unknown>;

    /**
     * Returns the validated arguments of a transaction call data
     * @param callData Transaction data
     */
    getDataArguments(callData: string): any;
}

/**
 * Basic props for an abstract signed transaction
 * @member {BigNumber} fallbackTransactionGasLimit - A default fallback gas limit to not use the last block gas limit. Every implementation should configure it.
 */
export interface SignedTransactionProps extends TokenTransactionProps {
    transactionController: TransactionController;
    preferencesController: PreferencesController;
    fallbackTransactionGasLimit?: BigNumber;
}

/**
 * Abstract implementation for token transactions.
 */
export abstract class SignedTransaction
    extends TokenTransactionController
    implements ISignedTransaction
{
    protected readonly _transactionController: TransactionController;
    protected readonly _preferencesController: PreferencesController;
    private readonly _fallbackTransactionGasLimit?: BigNumber;

    constructor(props: SignedTransactionProps) {
        super(props);
        this._preferencesController = props.preferencesController;
        this._transactionController = props.transactionController;
        this._fallbackTransactionGasLimit = props.fallbackTransactionGasLimit;
    }

    /**
     * Populates the transaction from the contract.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     */
    public abstract populateTransaction(
        populateTransactionParams: PopulatedTransactionParams
    ): Promise<ethers.PopulatedTransaction>;

    /**
     * Calculates the gas limit for a populated transaction.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     */
    public abstract calculateTransactionGasLimit(
        populateTransactionParams: PopulatedTransactionParams
    ): Promise<TransactionGasEstimation>;

    /**
     * Calculates the gas limit for a populated transaction.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     */
    protected async _calculateTransactionGasLimit(
        populatedTransaction: ethers.PopulatedTransaction
    ): Promise<TransactionGasEstimation> {
        populatedTransaction.from =
            this._preferencesController.getSelectedAddress();

        const normalizedTransactionParams =
            transactionUtils.normalizeTransaction({
                ...populatedTransaction,
            });

        transactionUtils.validateTransaction(normalizedTransactionParams);

        const transactionMeta: TransactionMeta = {
            id: uuid(),
            chainId: this._networkController.network.chainId,
            origin: 'blank',
            status: TransactionStatus.UNAPPROVED,
            time: Date.now(),
            verifiedOnBlockchain: false,
            loadingGasValues: true,
            blocksDropCount: 0,
            transactionParams: normalizedTransactionParams,
            metaType: MetaType.REGULAR,
        };

        transactionMeta.origin = 'blank';
        return this._transactionController.estimateGas(
            transactionMeta,
            this._fallbackTransactionGasLimit
        );
    }

    /**
     * Adds an unapproved transaction to the transaction state.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     * @param {FeeData} feeData an object with gas fee data.
     * @param {TransactionAdvancedData} advancedData an object with transaction advanced data.
     */
    public abstract addAsNewTransaction(
        populateTransactionParams: PopulatedTransactionParams,
        feeData: TransactionFeeData,
        advancedData: TransactionAdvancedData
    ): Promise<TransactionMeta>;

    /**
     * Adds an unapproved transaction to the transaction state.
     * @param {PopulatedTransactionParams} populateTransactionParams depends on the case, the necessary data for the contract.
     * @param {FeeData} feeData an object with gas fee data.
     * @param {TransactionAdvancedData} advancedData an object with transaction advanced data.
     */
    protected async _addAsNewTransaction(
        populatedTransaction: ethers.PopulatedTransaction,
        feeData: TransactionFeeData,
        transactionCategory?: TransactionCategories,
        advancedData?: TransactionAdvancedData
    ): Promise<TransactionMeta> {
        if (!populatedTransaction) {
            throw populatedTransactionParamNotPresentError;
        }

        if (await this._networkController.getEIP1559Compatibility()) {
            if (!bnGreaterThanZero(feeData.maxFeePerGas)) {
                throw gasMaxFeePerGasParamNotPresentError;
            }
        } else {
            if (!bnGreaterThanZero(feeData.gasPrice)) {
                throw gasPriceParamNotPresentError;
            }
        }

        const { chainId } = this._networkController.network;

        // If we are not in mainnet the gas limit is fixed but if we aren't
        // the gas limit is calculated.
        feeData.gasLimit =
            chainId != INITIAL_NETWORKS['MAINNET'].chainId
                ? feeData.gasLimit || BigNumber.from(GAS_LIMIT)
                : feeData.gasLimit;

        const { transactionMeta: meta, result } =
            await this._transactionController.addTransaction({
                transaction: {
                    ...populatedTransaction,
                    from: this._preferencesController.getSelectedAddress(),
                    ...feeData,
                    nonce: advancedData?.customNonce,
                },
                origin: 'blank',
                waitForConfirmation: false,
                customCategory: transactionCategory,
            });

        // As we don't care about the result here, ignore errors in transaction result
        result.catch((_) => {});

        return meta;
    }

    /**
     * Adding the transaction description and its parameters to the transaction meta object.
     * @param transactionMeta
     * @param transactionData
     * @returns
     */
    protected _addTransactionData(
        transactionMeta: TransactionMeta,
        transactionData?: ethers.utils.TransactionDescription
    ): TransactionMeta {
        try {
            if (transactionData) {
                transactionMeta.methodSignature = {
                    name: transactionData.name,
                    args: transactionData.functionFragment.inputs.map(
                        (input: ParamType) => {
                            let value: any;
                            if (input.name in transactionData.args) {
                                value = transactionData.args[input.name];

                                if (BigNumber.isBigNumber(value)) {
                                    value = BigNumber.from(value);
                                }
                            }

                            return {
                                type: input.type,
                                name: input.name,
                                value,
                            } as TransactionArgument;
                        }
                    ),
                };
            }
        } catch (e) {
            log.warn('error adding transaction data', e);
        }
        return transactionMeta;
    }

    /**
     * Updates the gas configuration for an unnaproved transaction.
     * @param {string} transactionId the id of the transaction to be updated.
     * @param {FeeData} feeData an object with gas fee data.
     */
    public async updateTransactionGas(
        transactionId: string,
        feeData: TransactionFeeData
    ): Promise<void> {
        if (!transactionId) {
            throw transactionIdParamNotPresentError;
        }

        const transactionMeta =
            this._transactionController.getTransaction(transactionId);

        if (!transactionMeta) {
            throw transactionNotFound;
        }

        if (feeData.gasLimit) {
            transactionMeta.transactionParams.gasLimit = feeData.gasLimit;
        }

        if (feeData.gasPrice) {
            transactionMeta.transactionParams.gasPrice = feeData.gasPrice;
        }

        if (feeData.maxFeePerGas) {
            transactionMeta.transactionParams.maxFeePerGas =
                feeData.maxFeePerGas;
        }

        if (feeData.maxPriorityFeePerGas) {
            transactionMeta.transactionParams.maxPriorityFeePerGas =
                feeData.maxPriorityFeePerGas;
        }

        return this._transactionController.updateTransaction(transactionMeta);
    }

    /**
     * Approves a transaction.
     * @param {void} transactionId the id of the transaction to be approved.
     */
    async approveTransaction(transactionId: string): Promise<void> {
        if (!transactionId) {
            throw transactionIdParamNotPresentError;
        }
        return this._transactionController.approveTransaction(transactionId);
    }

    /**
     * Gets the result of a transaction.
     * @param {string} transactionId the id of the transaction to get the result.
     */
    public abstract getTransactionResult(transactionId: string): Promise<any>;

    /**
     * Returns the parsed transaction data for an ERC-20 contract interaction
     *
     * @param data Transaction data parameter
     */
    public static parseTransactionData = (
        data?: string
    ): TransactionDescription | undefined => {
        if (!data) {
            return undefined;
        }

        try {
            return this._erc20Interface.parseTransaction({ data });
        } catch (error) {
            log.debug('Failed to parse transaction data.', error, data);
            return undefined;
        }
    };

    /**
     * Returns the parsed transaction data for an ERC-20 contract interaction
     *
     * @param data Transaction data parameter
     */
    public static parseLogData = (
        topics: string[],
        data: string
    ): LogDescription | undefined => {
        if (!data) {
            return undefined;
        }

        try {
            return this._erc20Interface.parseLog({ topics, data });
        } catch (error) {
            log.debug('Failed to parse log data.', error, data);
            return undefined;
        }
    };

    /**
     * Checks if the transaction category corresponds to one of the presets
     *
     * @returns The preset category if it exists, otherwise undefined
     */
    public static checkPresetCategories(
        callData: string
    ): TransactionCategories | undefined {
        const presetCategories = [
            TransactionCategories.TOKEN_METHOD_APPROVE,
            TransactionCategories.TOKEN_METHOD_TRANSFER,
            TransactionCategories.TOKEN_METHOD_TRANSFER_FROM,
        ];

        const parsedData = this.parseTransactionData(callData);

        if (!parsedData || !parsedData.name) {
            return undefined;
        }

        return presetCategories.find(
            (category) => category === parsedData.name
        );
    }

    /**
     * Returns the arguments of an ERC20 contract call, formatted as object.
     * If sent, transaction category will be validated.
     *
     * @param callData Transaction data
     * @param category Transaction category
     */
    public decodeInputData = (
        callData: string,
        category?: TransactionCategories
    ): Record<string, unknown> => {
        const parsedData = SignedTransaction.parseTransactionData(callData);

        // Check data and category
        if (!parsedData || !parsedData.name) {
            throw new Error('Invalid data');
        }

        if (category && parsedData.name !== category) {
            throw new Error(
                `This is a ${parsedData.name} instead of a ${category} transaction`
            );
        }

        const definedArguments: Record<string, unknown> = {};

        // Define arguments
        for (let i = 0; i < parsedData.functionFragment.inputs.length; i++) {
            definedArguments[parsedData.functionFragment.inputs[i].name] =
                parsedData.args[i];
        }

        return definedArguments;
    };

    /**
     * Returns the validated arguments of a transaction call data
     * @param callData Transaction data
     */
    public abstract getDataArguments(callData: string): any;
}
