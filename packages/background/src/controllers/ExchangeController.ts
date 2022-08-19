import { BigNumber } from 'ethers';
import { BaseController } from '../infrastructure/BaseController';
import { ApproveTransaction } from './erc-20/transactions/ApproveTransaction';
import { TransactionFeeData } from './erc-20/transactions/SignedTransaction';
import { TokenOperationsController } from './erc-20/transactions/Transaction';
import NetworkController from './NetworkController';
import { PreferencesController } from './PreferencesController';
import TransactionController from './transactions/TransactionController';

export class ExchangeController<
    S = unknown,
    M = unknown
> extends BaseController<S, M> {
    constructor(
        protected readonly _networkController: NetworkController,
        protected readonly _preferencesController: PreferencesController,
        protected readonly _tokenOperationsController: TokenOperationsController,
        protected readonly _transactionController: TransactionController,
        initialState?: S,
        initialMemState?: M
    ) {
        super(initialState, initialMemState);
    }

    /**
     * Checks if the given account has enough allowance to make the exchange
     *
     * @param account User account
     * @param amount Amount to be spended
     * @param spenderAddress The address of the sepender to check the allowance
     * @param tokenAddress Asset to be spended address
     */
    public checkExchangeAllowance = async (
        account: string,
        amount: BigNumber,
        spenderAddress: string,
        tokenAddress: string
    ): Promise<boolean> => {
        try {
            const allowance = await this._tokenOperationsController.allowance(
                tokenAddress,
                account,
                spenderAddress
            );

            return BigNumber.from(amount).lte(allowance);
        } catch (error) {
            throw new Error('Error checking asset allowance');
        }
    };

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param amount Exchange amount
     * @param exchangeType The exchange type
     * @param feeData Transaction gas fee data
     * @param tokenAddress Spended asset token address
     * @param customNonce Custom transaction nonce
     */
    public approveExchange = async (
        allowance: BigNumber,
        amount: BigNumber,
        spender: string,
        feeData: TransactionFeeData,
        tokenAddress: string,
        customNonce?: number
    ): Promise<boolean> => {
        if (allowance.lt(amount)) {
            throw new Error(
                'Specified allowance is less than the exchange amount'
            );
        }

        const approveTransaction = new ApproveTransaction({
            networkController: this._networkController,
            transactionController: this._transactionController,
            preferencesController: this._preferencesController,
        });

        const hasApproved = await approveTransaction.do({
            tokenAddress,
            spender,
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
    };
}
