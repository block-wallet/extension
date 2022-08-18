import { BigNumber } from '@ethersproject/bignumber';
import { EventEmitter } from 'events';
import { IObservableStore } from '../../../infrastructure/stores/ObservableStore';
import {
    AvailableNetworks,
    CurrencyAmountPair,
    KnownCurrencies,
} from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { IDepositWithdraw } from './IDepositWithdraw';
import { ILockable } from './ILockable';
import { TransactionGasEstimation } from '../../transactions/TransactionController';

export type ComplianceInfo = {
    deposit: {
        pair: CurrencyAmountPair;
        spent: boolean;
        timestamp: Date;
        commitment: string;
        transactionHash: string;
        from: string;
    };
    withdrawal: {
        pair: CurrencyAmountPair;
        to: string;
        transactionHash: string;
        timestamp: Date;
        fee: string;
        feeBN: BigNumber;
        nullifier: string;
    };
};

export type PairCount = {
    pair: CurrencyAmountPair;
    count: number;
}[];

export interface IBlankDepositService<S>
    extends IDepositWithdraw,
        ILockable,
        EventEmitter {
    /**
     * Intializes the service
     */
    initialize(): Promise<void>;

    /**
     * Initialize the vault used for the deposits
     * @param unlockPhrase
     * @returns
     */
    initializeVault(unlockPhrase: string): Promise<void>;

    /**
     * reinitializes the vault used for the deposits, overwrites existing vault
     * @param unlockPhrase
     * @returns
     */
    reinitializeVault(unlockPhrase: string): Promise<void>;

    /**
     * It returns the count of unspent deposits
     * of a specific currency/amount pair
     *
     * @param currencyAmountPair The currency amount pair to look for
     */
    getUnspentDepositCount(
        currencyAmountPair?: CurrencyAmountPair
    ): Promise<number | { [key in KnownCurrencies]?: PairCount }>;

    /**
     * It returns the count of (spent or not) deposits
     * of a specific currency/amount pair
     *
     * @param currencyAmountPair The currency amount pair to look for
     */
    getDepositCount(currencyAmountPair: CurrencyAmountPair): Promise<number>;

    /**
     * It returns the date of the latest deposit made
     * for the specified currency/amount pair
     *
     * @param currencyAmountPair The currency amount pair to look for
     */
    getLatestDepositDate(currencyAmountPair: CurrencyAmountPair): Promise<Date>;

    /**
     * It returns the list of deposits for the current network
     */
    getDeposits(chainId?: number): Promise<IBlankDeposit[]>;

    /**
     * It returns information regarding the deposit importing/reconstruction status
     */
    getImportingStatus(): Promise<{
        isImported: boolean;
        isLoading: boolean;
        isInitialized: boolean;
        errorsInitializing: string[];
    }>;

    /**
     * getInstanceTokenAllowance
     *
     * @param pair The pair to check the allowance
     * @returns The granted allowance for the specified pair
     */
    getInstanceTokenAllowance(pair: CurrencyAmountPair): Promise<BigNumber>;

    /**
     * importNotes
     *
     * It imports the user's notes for the current network
     * and stores everything in the vault
     *
     * @param password The vault password
     * @param mnemonic The account mnemonic
     */
    importNotes(password?: string, mnemonic?: string): Promise<void>;

    /**
     * It returns the status of the Deposits relayer service
     */
    getServiceStatus(): Promise<{ status: boolean; error: string }>;

    /**
     * It returns the service store
     */
    getStore(): IObservableStore<S>;

    /**
     * It returns a parsed note string for the specified deposit
     * @param deposit The Blank deposit
     */
    getNoteString(deposit: IBlankDeposit): Promise<string>;

    /**
     * It checks for possible spent notes and updates their internal state
     */
    updateNotesSpentState(): Promise<void>;

    /**
     * It triggers the deposits tree update for the current network
     * (used to update the deposits tree and calculate the subsequent deposits accurately)
     *
     * @param pair The currency amount pair to update the tree for
     */
    updateDepositTree(pair: CurrencyAmountPair): Promise<void>;

    /**
     * It returns deposit and withdrawal information for compliance purposes
     *
     * @param deposit The Blank deposit
     */
    getComplianceInformation(deposit: IBlankDeposit): Promise<ComplianceInfo>;

    /**
     * It returns the Withdrawal gas cost and fees
     */
    getWithdrawalFees(pair: CurrencyAmountPair): Promise<{
        totalFee: BigNumber;
        relayerFee: BigNumber;
        gasFee: BigNumber;
        total: BigNumber;
    }>;

    /**
     * Calculates the gas limit for a tornado deposit transaction.  It returns a flag that indicates if the estimation succeeded or defaulted to a fallback price.
     * @param currencyAmountPair The currency amount pair to look for
     */
    calculateDepositTransactionGasLimit(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<TransactionGasEstimation>;

    /**
     * getPairAnonymitySet
     *
     * It returns the amount of deposits that a given pair pool has
     *
     * @param currencyPair The currency/amount pair
     * @param network The current network
     */
    getPairAnonimitySet(
        currencyPair: CurrencyAmountPair,
        network: AvailableNetworks
    ): Promise<number>;

    /**
     * getPairSubsequentDepositsCount
     *
     * It returns the amount of subsequent deposits after the user's most recent one
     *
     * @param currencyPair The currency/amount pair
     * @param network The current network
     * @returns The number of subsequent deposits after the user's most recent one
     */
    getPairSubsequentDepositsCount(
        currencyPair: CurrencyAmountPair,
        network: AvailableNetworks
    ): Promise<number | undefined>;

    /**
     * proxyContractAddress
     *
     * @returns The privacy solution proxy contract address
     */
    proxyContractAddress: string;
}
