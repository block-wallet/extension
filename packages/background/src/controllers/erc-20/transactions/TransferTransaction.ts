/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber } from '@ethersproject/bignumber';
import { PopulatedTransaction } from '@ethersproject/contracts';
import log from 'loglevel';
import { TransactionGasEstimation } from '../../transactions/TransactionController';
import {
    TransactionAdvancedData,
    TransactionCategories,
    TransactionMeta,
} from '../../transactions/utils/types';
import {
    amountParamNotPresentError,
    tokenAddressParamNotPresentError,
    TokenController,
    toParamNotPresentError,
    transactionIdParamNotPresentError,
} from '../TokenController';
import {
    PopulatedTransactionParams,
    SignedTransaction,
    SignedTransactionProps,
    TransactionFeeData,
} from './SignedTransaction';

/**
 * The fallback (if we can't estimate it) gas limit for a transfer transaction.
 */
export const TRANSFER_TRANSACTION_FALLBACK_GAS_LIMIT = '0x186a0'; // 100000

export interface TransferTransactionProps extends SignedTransactionProps {
    tokenController: TokenController;
}

export interface TransferTransactionPopulatedTransactionParams
    extends PopulatedTransactionParams {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
}

/**
 * Transfer tokens to a wallet
 */
export class TransferTransaction extends SignedTransaction {
    private readonly _tokenController: TokenController;
    constructor(props: TransferTransactionProps) {
        super({
            ...props,
            fallbackTransactionGasLimit: BigNumber.from(
                TRANSFER_TRANSACTION_FALLBACK_GAS_LIMIT
            ),
        });
        this._tokenController = props.tokenController;
    }

    /**
     * Do all the necessary steps to transfer tokens to a wallet.
     * @param {string} tokenAddress of the token to transfer
     * @param {string} to where the tokens must be transfer
     * @param {BigNumber} amount of the token to transfer
     * @param {FeeData} feeData an object with gas fee data.
     * @param {TransactionAdvancedData} advancedData an object with tx advanced data.
     */
    public async do(
        tokenAddress: string,
        to: string,
        amount: BigNumber,
        feeData: TransactionFeeData,
        advancedData: TransactionAdvancedData
    ): Promise<string> {
        const transactionMeta = await this.addAsNewTransaction(
            {
                tokenAddress,
                to,
                amount,
            } as TransferTransactionPopulatedTransactionParams,
            feeData,
            advancedData
        );
        await this.approveTransaction(transactionMeta.id);

        return this.getTransactionResult(transactionMeta.id);
    }

    /**
     * Populates the transfer transaction from the contract.
     * @param {TransferTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  to: string;
     *  amount: BigNumber;
     * }
     */
    public async populateTransaction(
        populateTransasctionParams: TransferTransactionPopulatedTransactionParams,
        ignoreZeroValue = false
    ): Promise<PopulatedTransaction> {
        if (!populateTransasctionParams.tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }
        if (!populateTransasctionParams.to) {
            throw toParamNotPresentError;
        }
        if (
            !ignoreZeroValue &&
            (!populateTransasctionParams.amount ||
                BigNumber.from(populateTransasctionParams.amount).lte('0'))
        ) {
            throw amountParamNotPresentError;
        }

        const contract = this.getContract(
            populateTransasctionParams.tokenAddress
        );
        return contract.populateTransaction.transfer(
            populateTransasctionParams.to,
            BigNumber.from(populateTransasctionParams.amount)
        );
    }

    /**
     * Calculates the gas limit for a transfer transaction.  It returns a flag that indicates if the estimation succeeded or defaulted to a fallback price.
     * @param {TransferTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  to: string;
     *  amount: BigNumber;
     * }
     */
    public async calculateTransactionGasLimit(
        populateTransasctionParams: TransferTransactionPopulatedTransactionParams,
        ignoreZeroValue = false
    ): Promise<TransactionGasEstimation> {
        const populatedTransaction = await this.populateTransaction(
            populateTransasctionParams,
            ignoreZeroValue
        );

        return this._calculateTransactionGasLimit(populatedTransaction);
    }

    /**
     * Adds an unapproved transfer transaction to the transaction state.
     * @param {TransferTransactionPopulatedTransactionParams} populateTransactionParams {
     *  tokenAddress: string;
     *  to: string;
     *  amount: BigNumber;
     * }
     * @param {FeeData} feeData an object with gas fee data.
     * @param {TransactionAdvancedData} advancedData an object with transaction advanced data.
     */
    public async addAsNewTransaction(
        populateTransasctionParams: TransferTransactionPopulatedTransactionParams,
        feeData: TransactionFeeData,
        advancedData?: TransactionAdvancedData
    ): Promise<TransactionMeta> {
        const populatedTransaction = await this.populateTransaction(
            populateTransasctionParams
        );

        let transactionMeta = await this._addAsNewTransaction(
            populatedTransaction,
            feeData,
            TransactionCategories.TOKEN_METHOD_TRANSFER,
            advancedData
        );

        // trying to solve the transaction data and adding it to show it in the UI
        transactionMeta = this._addTransactionData(
            transactionMeta,
            SignedTransaction.parseTransactionData(
                transactionMeta.transactionParams.data
            )
        );

        try {
            const { symbol, logo, decimals } =
                await this._tokenController.getToken(
                    populateTransasctionParams.tokenAddress
                );
            transactionMeta.transferType = {
                amount: populateTransasctionParams.amount,
                currency: symbol,
                decimals,
                logo,
                to: populateTransasctionParams.to,
            };

            this._transactionController.updateTransaction(transactionMeta);
        } catch (error) {
            log.error(
                'Unable to fetch token data on Transfer transaction generation'
            );
        }

        return transactionMeta;
    }

    /**
     * Gets the result of a transfer transaction.
     * @param {string} transactionId the id of the transfer transaction to get the result.
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
}
