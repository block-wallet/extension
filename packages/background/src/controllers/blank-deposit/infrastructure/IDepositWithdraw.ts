import { BigNumber } from '@ethersproject/bignumber';
import { PopulatedTransaction } from '@ethersproject/contracts';
import { CurrencyAmountPair } from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { TransactionMeta } from '../../transactions/utils/types';
import { TransactionFeeData } from '../../erc-20/transactions/SignedTransaction';
import { NextDepositResult } from '../notes/INotesService';

export interface IDeposit {
    /**
     * Populates the deposit transaction from the tornado contract.
     * @param currencyAmountPair
     */
    populateDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        chainId?: number
    ): Promise<{
        populatedTransaction: PopulatedTransaction;
        nextDeposit: NextDepositResult['nextDeposit'];
    }>;

    /**
     * Adds an unapproved tornado deposit transaction to the transaction state.
     * @param currencyAmountPair
     * @param populatedTransaction
     * @param feeData The deposit gas fee data
     */
    addAsNewDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        populatedTransaction: PopulatedTransaction,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta>;

    /**
     * Updates the gas configuration for an unnaproved deposit transaction.
     * @param transactionId the id of the transaction to be updated.
     * @param feeData The deposit gas fee data
     */
    updateDepositTransactionGas(
        transactionId: string,
        feeData: TransactionFeeData
    ): Promise<void>;

    /**
     * Approves a deposit transaction.
     * @param transactionId the id of the tornado transaction to be approved.
     */
    approveDepositTransaction(
        transactionId: string,
        currencyAmountPair?: CurrencyAmountPair,
        chainId?: number,
        nextDeposit?: NextDepositResult['nextDeposit']
    ): Promise<void>;

    /**
     * Gets the result of a tornado deposit transaction.
     * @param transactionId the id of the tornado deposit transaction to get the result.
     */
    getDepositTransactionResult(transactionId: string): Promise<string>;

    /**
     * deposit
     *
     * It makes a Blank private deposit
     *
     * @param currencyAmountPair The desired deposit currency and amount values
     * @param feeData The deposit gas fee data
     * @param customNonce Custom transaction nonce
     */
    deposit(
        currencyAmountPair: CurrencyAmountPair,
        feeData: TransactionFeeData,
        customNonce?: number
    ): Promise<string>;

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param feeData Deposit gas fee data
     * @param pair The deposit currency and amount values
     * @param customNonce Custom transaction nonce
     */
    depositAllowance(
        allowance: BigNumber,
        feeData: TransactionFeeData,
        pair: CurrencyAmountPair,
        customNonce?: number
    ): Promise<boolean>;
}

export interface IWithdraw {
    /**
     * withdraw
     *
     * It makes a Blank private withdraw
     *
     * @param note The deposit note
     * @param recipient The whitdrawal recipient
     */
    withdraw(deposit: IBlankDeposit, recipient: string): Promise<string>;
}

export interface IDepositWithdraw extends IDeposit, IWithdraw {}
