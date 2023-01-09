import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { PopulatedTransaction } from '@ethersproject/contracts';
import { isHexString, isValidAddress, stripHexPrefix } from 'ethereumjs-util';
import { TransactionGasEstimation } from '../../transactions/TransactionController';
import {
    TransactionCategories,
    TransactionMeta,
} from '../../transactions/utils/types';
import {
    amountParamNotPresentError,
    spenderParamNotPresentError,
    tokenAddressParamNotPresentError,
    transactionIdParamNotPresentError,
} from '../TokenController';
import {
    PopulatedTransactionParams,
    SignedTransaction,
    SignedTransactionProps,
    TransactionFeeData,
} from './SignedTransaction';

/**
 * The fallback (if we can't estimate it) gas limit for an approve transaction.
 */
export const APPROVE_TRANSACTION_FALLBACK_GAS_LIMIT = '0xcb34'; // 52020

export type ApproveTransactionProps = SignedTransactionProps;

export interface RawApproveDataArguments {
    _spender: string;
    _value: BigNumber;
}

/**
 * @param amount Allowance amount
 * @param customNonce Optional custom transaction nonce
 * @param feeData Transaction fee data
 * @param spender Spender contract
 * @param tokenAddress Token contract address
 * @param waitForConfirmation Wait for transaction confirm option
 */
export interface DoArguments {
    amount: BigNumber | 'UNLIMITED';
    customNonce?: number;
    feeData: TransactionFeeData;
    spender: string;
    tokenAddress: string;
    waitForConfirmation?: boolean;
}

export interface ApproveTransactionPopulatedTransactionParams
    extends PopulatedTransactionParams {
    tokenAddress: string;
    spender: string;
    amount: BigNumber | 'UNLIMITED';
    customNonce?: number;
}

const UNLIMITED_ALLOWANCE = MaxUint256;

/**
 * Approve an amount of a token
 */
export class ApproveTransaction extends SignedTransaction {
    constructor(props: ApproveTransactionProps) {
        super({
            ...props,
            fallbackTransactionGasLimit: BigNumber.from(
                APPROVE_TRANSACTION_FALLBACK_GAS_LIMIT
            ),
        });
    }

    /**
     * Do all the necessary steps to approve a certain amount of a token.
     */
    public async do({
        amount,
        customNonce,
        feeData,
        spender,
        tokenAddress,
        waitForConfirmation = true,
    }: DoArguments): Promise<boolean> {
        const transactionMeta = await this.addAsNewTransaction(
            {
                tokenAddress,
                spender,
                amount,
                customNonce,
            },
            feeData
        );

        transactionMeta.approveAllowanceParams = {
            allowanceValue: BigNumber.from(amount),
            spenderAddress: spender,
        };

        await this.approveTransaction(transactionMeta.id);

        return this.getTransactionResult(
            transactionMeta.id,
            waitForConfirmation
        );
    }

    /**
     * Populates the approve transaction from the contract.
     * @param {ApproveTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  spender: string;
     *  amount: BigNumber;
     * }
     */
    public async populateTransaction(
        populateTransactionParams: ApproveTransactionPopulatedTransactionParams
    ): Promise<PopulatedTransaction> {
        if (!populateTransactionParams.tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }
        if (!populateTransactionParams.spender) {
            throw spenderParamNotPresentError;
        }
        if (
            populateTransactionParams.amount !== 'UNLIMITED' &&
            (!BigNumber.isBigNumber(populateTransactionParams.amount) ||
                populateTransactionParams.amount.lt('0'))
        ) {
            throw amountParamNotPresentError;
        }

        const contract = this.getContract(
            populateTransactionParams.tokenAddress
        );

        const approveTransaction = await contract.populateTransaction.approve(
            populateTransactionParams.spender,
            populateTransactionParams.amount !== 'UNLIMITED'
                ? BigNumber.from(populateTransactionParams.amount)
                : UNLIMITED_ALLOWANCE
        );

        if (populateTransactionParams.customNonce) {
            approveTransaction.nonce = populateTransactionParams.customNonce;
        }

        return approveTransaction;
    }

    /**
     * Calculates the gas limit for an approve transaction.
     * @param {ApproveTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  spender: string;
     *  amount: BigNumber;
     * }
     */
    public async calculateTransactionGasLimit(
        populateTransasctionParams: ApproveTransactionPopulatedTransactionParams
    ): Promise<TransactionGasEstimation> {
        const populatedTransaction = await this.populateTransaction(
            populateTransasctionParams
        );

        return this._calculateTransactionGasLimit(populatedTransaction);
    }

    /**
     * Adds an unapproved transaction to the transaction state.
     * @param {ApproveTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  spender: string;
     *  amount: BigNumber;
     * }
     * @param {FeeData} feeData an object with gas fee data.
     */
    public async addAsNewTransaction(
        populateTransasctionParams: ApproveTransactionPopulatedTransactionParams,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta> {
        const populatedTransaction = await this.populateTransaction(
            populateTransasctionParams
        );

        let transactionMeta = await this._addAsNewTransaction(
            populatedTransaction,
            feeData,
            TransactionCategories.TOKEN_METHOD_APPROVE
        );

        // trying to solve the transaction data and adding it to show it in the UI
        transactionMeta = this._addTransactionData(
            transactionMeta,
            SignedTransaction.parseTransactionData(
                transactionMeta.transactionParams.data
            )
        );

        return transactionMeta;
    }

    /**
     * Gets the result of an approved transaction.
     * @param {string} transactionId the id of the approve transaction to get the result.
     */
    public async getTransactionResult(
        transactionId: string,
        waitForConfirmation = true
    ): Promise<boolean> {
        if (!transactionId) {
            throw transactionIdParamNotPresentError;
        }
        await this._transactionController.waitForTransactionResult(
            transactionId,
            waitForConfirmation
        );

        return true;
    }

    /**
     * Returns the validated arguments for a token approval call
     *
     * @param callData Transaction data
     */
    public getDataArguments = (callData: string): RawApproveDataArguments => {
        const { _spender, _value } = this.decodeInputData(
            callData,
            TransactionCategories.TOKEN_METHOD_APPROVE
        );

        if (typeof _spender !== 'string' || !isValidAddress(_spender)) {
            throw new Error('Invalid spender');
        }

        if (!_value || !BigNumber.isBigNumber(_value) || !_value._hex) {
            throw new Error('Invalid approval value');
        }

        return { _spender, _value };
    };

    /**
     * Returns the modified data parameter for a token approval method.
     *
     * @param callData transaction data
     * @param customAllowance new allowance in total asset value, hex string
     */
    public getDataForCustomAllowance = (
        callData: string,
        customAllowance: string
    ): string => {
        const { _spender } = this.getDataArguments(callData);

        const strippedSpender = stripHexPrefix(_spender).toLowerCase();
        const [signature, allowance] = callData.split(strippedSpender);

        if (!signature || !allowance || allowance.length !== 64) {
            throw new Error('Invalid transaction data');
        }

        const strippedAllowance = stripHexPrefix(customAllowance);

        // Validate new allowance
        if (!isHexString(customAllowance) || strippedAllowance.length > 64) {
            throw new Error('Invalid new allowance');
        }

        // Fill allowance field to be 64 digits long
        const filledAllowance = strippedAllowance.padStart(64, '0');

        return signature + strippedSpender + filledAllowance;
    };
}
