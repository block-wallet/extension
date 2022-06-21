/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { BigNumber, Transaction } from 'ethers';
import { CurrencyAmountPair } from '../../blank-deposit/types';
import { ContractMethodSignature } from '../ContractSignatureParser';

/**
 * TransactionParams
 * @link https://github.com/ethers-io/ethers.js/issues/321
 * @link https://github.com/ethers-io/ethers.js/issues/299
 */

export type TransactionParams = Partial<Transaction>;

/**
 * The meta type of the transaction.
 * - `REGULAR`: A classic transaction
 * - `CANCEL`: A transaction sent to cancel another one

 * - `SPEED_UP`: A transaction sent to speed up another one
 * - `REGULAR_CANCELLING`: A transaction that we try to cancel
 * - `REGULAR_SPEEDING_UP`: A transaction that we try to speed up
 * - `REGULAR_NO_REPLACEMENT`: The purpose of this type is to have a way to block the feature if an error happen and speed up / cancel can't happen again (example: tx was already mined)
 */
export enum MetaType {
    //types
    REGULAR = 'REGULAR',
    CANCEL = 'CANCEL',
    SPEED_UP = 'SPEED_UP',
    REGULAR_CANCELLING = 'REGULAR_CANCELLING',
    REGULAR_SPEEDING_UP = 'REGULAR_SPEEDING_UP',
    REGULAR_NO_REPLACEMENT = 'REGULAR_NO_REPLACEMENT',
}

/**
 * TransactionMeta
 */
export interface TransactionMeta {
    id: string;
    origin?: string;
    rawTransaction?: string;
    status: TransactionStatus;
    time: number;
    submittedTime?: number;
    approveTime?: number;

    /**
     * Counts how many blocks have passed since a transaction with a higher nonce was confirmed
     */
    blocksDropCount: number;

    /**
     * If the transaction should be submitted to the flashbots endpoint, to circumvent the public mempool
     */
    flashbots?: boolean;

    /**
     * Advanced data to handle specific tx types
     */
    advancedData?: {
        // Allowance of ERC-20 approval
        allowance?: string; // hex string
        // Token decimals of ERC-20 approval
        decimals?: number;
        // Token ID for ERC-721 approval
        tokenId?: BigNumber;
    };

    confirmationTime?: number;
    chainId?: number;
    transactionParams: TransactionParams;
    transactionReceipt?: TransactionReceipt;
    transactionCategory?: TransactionCategories;
    methodSignature?: ContractMethodSignature;
    transferType?: TransferType;
    metaType: MetaType;
    loadingGasValues: boolean;
    depositPair?: CurrencyAmountPair;
    blankDepositId?: string;
    verifiedOnBlockchain?: boolean;
    gasEstimationFailed?: boolean;
    replacedBy?: string;
    error?: {
        message: string;
        stack?: string;
    };
    originId?: string;
}

export interface uiTransactionParams extends TransactionParams {
    value: BigNumber;
    gasLimit: BigNumber;
    gasPrice?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
    maxFeePerGas?: BigNumber;
}

/**
 * The status of the transaction. Each status represents the state of the transaction internally
 * in the wallet. Some of these correspond with the state of the transaction on the network, but
 * some are wallet-specific.
 */
export enum TransactionStatus {
    FAILED = 'FAILED',
    DROPPED = 'DROPPED',
    CANCELLED = 'CANCELLED',
    SIGNED = 'SIGNED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    SUBMITTED = 'SUBMITTED',
    CONFIRMED = 'CONFIRMED',
    UNAPPROVED = 'UNAPPROVED',
}

/**
 * It returns a list of final transaction states
 */
export const getFinalTransactionStatuses = (): TransactionStatus[] => [
    TransactionStatus.FAILED,
    TransactionStatus.REJECTED,
    TransactionStatus.DROPPED,
    TransactionStatus.CANCELLED,
    TransactionStatus.CONFIRMED,
];

/**
 * The possible Categories of a transaction
 */
export enum TransactionCategories {
    BLANK_DEPOSIT = 'blankDeposit',
    BLANK_WITHDRAWAL = 'blankWithdrawal',
    INCOMING = 'incoming',
    SENT_ETHER = 'sentEther',
    CONTRACT_DEPLOYMENT = 'contractDeployment',
    CONTRACT_INTERACTION = 'contractInteraction',
    TOKEN_METHOD_APPROVE = 'approve',
    TOKEN_METHOD_TRANSFER = 'transfer',
    TOKEN_METHOD_INCOMING_TRANSFER = 'incoming_transfer',
    TOKEN_METHOD_TRANSFER_FROM = 'transferfrom',
    BLANK_SWAP = 'blankSwap',
}

/**
 * Transaction events emitted by the controller
 */
export enum TransactionEvents {
    UNAPPROVED_TRANSACTION = 'UNAPPROVED_TRANSACTION',
    STATUS_UPDATE = 'STATUS_UPDATE',
}

/**
 * Metadata for displaying on the UI ActivityList
 */
export interface TransferType {
    currency: string;
    amount: BigNumber;
    decimals: number;
    logo?: string;
    to?: string;
}

/**
 * Ethereum transaction types
 */
export enum TransactionType {
    LEGACY = 0,
    ACCESS_LIST_EIP2930 = 1,
    FEE_MARKET_EIP1559 = 2,
}

/**
 * Transaction params that can be setted by the user using the Advance Settings popup.
 */
export interface TransactionAdvancedData {
    customAllowance?: string;
    customNonce?: number;
    flashbots?: boolean;
}
