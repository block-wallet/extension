/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import {
    Interface,
    ParamType,
    parseEther,
    parseUnits,
    TransactionDescription,
} from 'ethers/lib/utils';
import log from 'loglevel';
import { v4 as uuid } from 'uuid';
import { INoteDeposit } from '../../blank-deposit/notes/INoteDeposit';
import { ITornadoContract } from '../../blank-deposit/tornado/config/ITornadoContract';
import {
    DEPOSIT_GAS_LIMIT,
    TornadoContracts,
} from '../../blank-deposit/tornado/TornadoService';
import {
    currencyAmountPairToMapKey,
    isNativeCurrency,
} from '../../blank-deposit/tornado/utils';
import { CurrencyAmountPair } from '../../blank-deposit/types';
import { TransactionGasEstimation } from '../../transactions/TransactionController';
import {
    TransactionCategories,
    TransactionMeta,
} from '../../transactions/utils/types';
import {
    tokenAddressParamNotPresentError,
    TokenController,
    transactionIdParamNotPresentError,
} from '../TokenController';
import { ApproveTransaction } from './ApproveTransaction';
import {
    PopulatedTransactionParams,
    SignedTransaction,
    SignedTransactionProps,
    TransactionFeeData,
} from './SignedTransaction';
import { TokenOperationsController } from './Transaction';
import { TransactionArgument } from '../../transactions/ContractSignatureParser';

/**
 * The fallback (if we can't estimate it) gas limit for a deposit transaction.
 */
export const DEPOSIT_TRANSACTION_FALLBACK_GAS_LIMIT = '0x124f80'; // Hex for 12e5

export interface DepositTransactionProps extends SignedTransactionProps {
    tornadoContracts: TornadoContracts;
    proxyContract: ITornadoContract;
    tokenController: TokenController;
    tokenOperationsController: TokenOperationsController;
}

export interface DepositTransactionPopulatedTransactionParams
    extends PopulatedTransactionParams {
    currencyAmountPair: CurrencyAmountPair;
    nextDeposit: {
        spent?: boolean | undefined;
        deposit: INoteDeposit;
        pair: CurrencyAmountPair;
    };
}

/**
 * Deposit tokens to a wallet
 */
export class DepositTransaction extends SignedTransaction {
    // Tornado Contracts
    private _tornadoContracts: TornadoContracts;
    private _proxyContract!: ITornadoContract;
    private _tokenController: TokenController;
    private _tokenOperationsController: TokenOperationsController;

    constructor(props: DepositTransactionProps) {
        super({
            ...props,
            fallbackTransactionGasLimit: BigNumber.from(
                DEPOSIT_TRANSACTION_FALLBACK_GAS_LIMIT
            ),
        });
        this._tornadoContracts = props.tornadoContracts;
        this._proxyContract = props.proxyContract;
        this._tokenController = props.tokenController;
        this._tokenOperationsController = props.tokenOperationsController;
    }

    /**
     * Populates the deposit transaction from the tornado contract.
     * @param {DepositTransactionPopulatedTransactionParams} populateTransactionParams {
     *  currencyAmountPair: CurrencyAmountPair;
     *  nextDeposit: {
     *   spent?: boolean | undefined;
     *   deposit: INoteDeposit;
     *   pair: CurrencyAmountPair;
     *  };
     * }
     */
    public async populateTransaction(
        populateTransasctionParams: DepositTransactionPopulatedTransactionParams
    ): Promise<ethers.PopulatedTransaction> {
        if (!populateTransasctionParams.currencyAmountPair) {
            throw tokenAddressParamNotPresentError;
        }

        // Get Tornado contract
        const key = currencyAmountPairToMapKey(
            populateTransasctionParams.currencyAmountPair
        );
        if (!this._tornadoContracts.has(key))
            throw new Error('Currency amount pair not supported');

        const { contract } = this._tornadoContracts.get(key)!;

        // Populate unsigned transaction
        return this._proxyContract.populateTransaction.deposit(
            contract.address,
            populateTransasctionParams.nextDeposit.deposit.commitmentHex,
            []
        );
    }

    /**
     * Calculates the gas limit for a tornado deposit transaction.
     * @param {DepositTransactionPopulatedTransactionParams} populateTransactionParams {
     *  currencyAmountPair: CurrencyAmountPair;
     *  nextDeposit: {
     *   spent?: boolean | undefined;
     *   deposit: INoteDeposit;
     *   pair: CurrencyAmountPair;
     *  };
     * }
     */
    public async calculateTransactionGasLimit(
        populateTransactionParams: DepositTransactionPopulatedTransactionParams
    ): Promise<TransactionGasEstimation> {
        const populatedTransaction = await this.populateTransaction(
            populateTransactionParams
        );

        // when calculating gas for an ETH deposit, the value of the tx has to be set
        if (
            isNativeCurrency(
                populateTransactionParams.currencyAmountPair.currency
            )
        ) {
            populatedTransaction.value = parseEther(
                populateTransactionParams.currencyAmountPair.amount
            );
        }

        return this._calculateTransactionGasLimit(populatedTransaction);
    }

    /**
     * getTokenAllowance
     *
     * @param {CurrencyAmountPair} currencyAmountPair The pair to check allowance against
     * @returns The currently granted token allowance
     */
    public async getTokenAllowance(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<BigNumber> {
        // Get Tornado contract
        const key = currencyAmountPairToMapKey(currencyAmountPair);
        if (!this._tornadoContracts.has(key))
            throw new Error('Currency amount pair not supported');

        const { tokenAddress } = this._tornadoContracts.get(key)!;

        // Ensure having the token address
        let erc20ContractAddress = tokenAddress;
        if (!erc20ContractAddress) {
            const token = await this._tokenController.search(
                currencyAmountPair.currency,
                true
            );
            if (!('address' in token[0])) {
                throw new Error(
                    'Specified token has no address nor it has been found in the tokens list'
                );
            }
            erc20ContractAddress = token[0].address;
        }

        // Check for allowance
        return this._tokenOperationsController.allowance(
            erc20ContractAddress,
            this._preferencesController.getSelectedAddress(),
            this._proxyContract.address
        );
    }

    /**
     * Adds an unapproved tornado deposit transaction to the transaction state.
     * @param {CurrencyAmountPair} currencyAmountPair: CurrencyAmountPair;
     * @param {ethers.PopulatedTransaction} populateTransactionParams {
     *  nextDeposit: {
     *   spent?: boolean | undefined;
     *   deposit: INoteDeposit;
     *   pair: CurrencyAmountPair;
     *  };
     * }
     * @param {FeeData} feeData an object with gas fee data.
     */
    public async addAsNewDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        populatedTransaction: ethers.PopulatedTransaction,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta> {
        // Get Tornado contract
        const key = currencyAmountPairToMapKey(currencyAmountPair);
        if (!this._tornadoContracts.has(key))
            throw new Error('Currency amount pair not supported');

        const { decimals, tokenAddress } = this._tornadoContracts.get(key)!;

        // Parse total
        const depositValue = parseUnits(currencyAmountPair.amount, decimals);

        // Add value or approve deposit amount
        if (isNativeCurrency(currencyAmountPair.currency)) {
            // Add value for ETH instance
            populatedTransaction.value = depositValue;
        } else {
            // Ensure having the token address
            let erc20ContractAddress = tokenAddress;
            if (!erc20ContractAddress) {
                const token = await this._tokenController.search(
                    currencyAmountPair.currency,
                    true
                );
                if (!('address' in token[0])) {
                    throw new Error(
                        'Specified token has no address nor it has been found in the tokens list'
                    );
                }
                erc20ContractAddress = token[0].address;
            }

            // Ensure having enough allowance to process the transaction
            const allowance = await this._tokenOperationsController.allowance(
                erc20ContractAddress,
                this._preferencesController.getSelectedAddress(),
                this._proxyContract.address
            );

            if (allowance.lt(depositValue)) {
                throw new Error('Not enough allowance to process this deposit');
            }
        }

        // Send transaction to the pool
        const meta = await this.addAsNewTransaction(
            populatedTransaction,
            feeData
        );

        meta.blankDepositId = uuid();

        try {
            if (isNativeCurrency(currencyAmountPair.currency)) {
                const { nativeCurrency, iconUrls } =
                    this._networkController.network;
                const logo = iconUrls ? iconUrls[0] : '';
                meta.transferType = {
                    amount: depositValue,
                    currency: nativeCurrency.symbol,
                    decimals: nativeCurrency.decimals,
                    logo,
                };
            } else {
                const { symbol, logo } = await this._tokenController.getToken(
                    tokenAddress!
                );
                // Set TransferType for displaying purposes
                meta.transferType = {
                    amount: depositValue,
                    currency: symbol,
                    decimals,
                    logo,
                };
            }

            // Set depositPair to prevent resending a faulty pair from UI
            meta.depositPair = currencyAmountPair;

            this._transactionController.updateTransaction(meta);
        } catch (error) {
            log.error(
                'Unable to fetch token data on Transfer transaction generation'
            );
        }

        return meta;
    }

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param feeData Deposit gas fee data
     * @param pair The deposit currency and amount values
     * @param customNonce Custom transaction nonce
     */
    public async depositAllowance(
        allowance: BigNumber,
        feeData: TransactionFeeData,
        pair: CurrencyAmountPair,
        customNonce?: number
    ): Promise<boolean> {
        // Get Tornado contract
        const key = currencyAmountPairToMapKey(pair);
        if (!this._tornadoContracts.has(key))
            throw new Error('Currency amount pair not supported');

        const { decimals, tokenAddress } = this._tornadoContracts.get(key)!;

        // Parse total
        const depositValue = parseUnits(pair.amount, decimals);

        // Ensure having the token address
        let erc20ContractAddress = tokenAddress;
        if (!erc20ContractAddress) {
            const token = await this._tokenController.search(
                pair.currency,
                true
            );
            if (!('address' in token[0])) {
                throw new Error(
                    'Specified token has no address nor it has been found in the tokens list'
                );
            }
            erc20ContractAddress = token[0].address;
        }

        // Check if allowance is less than deposit amount
        if (allowance.lt(depositValue)) {
            throw new Error(
                'Specified allowance is less than the deposit amount'
            );
        }

        const approveTransaction = new ApproveTransaction({
            networkController: this._networkController,
            transactionController: this._transactionController,
            preferencesController: this._preferencesController,
        });

        const hasApproved = await approveTransaction.do({
            tokenAddress: erc20ContractAddress,
            spender: this._proxyContract.address,
            amount: allowance,
            feeData,
            customNonce,
        });

        if (!hasApproved) {
            throw new Error(
                'Error submitting approval transaction to setup asset allowance'
            );
        }

        return true;
    }

    /**
     * Adds an unapproved deposit transaction to the transaction state.
     * @param {ethers.PopulatedTransaction} populateTransactionParams depends on the case, the necessary data for the contract.
     * @param {FeeData} feeData an object with gas fee data.
     */
    public async addAsNewTransaction(
        populatedTransaction: ethers.PopulatedTransaction,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta> {
        feeData.gasLimit =
            feeData.gasLimit || BigNumber.from(DEPOSIT_GAS_LIMIT);
        let meta = await this._addAsNewTransaction(
            populatedTransaction,
            feeData,
            TransactionCategories.BLANK_DEPOSIT
        );

        // trying to solve the transaction data and adding it to show it in the UI
        meta = this._addTransactionData(
            meta,
            this.parseTransactionData(meta.transactionParams.data)
        );

        return meta;
    }

    /**
     * Gets the result of a tornado deposit transaction.
     * @param {string} transactionId the id of the tornado deposit transaction to get the result.
     */
    public async getTransactionResult(transactionId: string): Promise<string> {
        if (!transactionId) {
            throw transactionIdParamNotPresentError;
        }
        const transactionMeta =
            this._transactionController.getTransaction(transactionId)!;

        return transactionMeta.transactionParams.hash!;
    }

    /**
     * Returns the validated arguments of a transaction call data
     */
    public getDataArguments(): void {
        throw new Error('Method not implemented');
    }
    /**
     * Returns the parsed transaction data for an Tornado contract interaction
     *
     * @param data Transaction data parameter
     */
    public parseTransactionData = (
        data?: string
    ): TransactionDescription | undefined => {
        if (!data) {
            return undefined;
        }

        try {
            return this._proxyContract.interface.parseTransaction({ data });
        } catch (error) {
            log.debug('Failed to parse transaction data.', error, data);
            return undefined;
        }
    };
}
