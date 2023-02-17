import { isNativeTokenAddress } from '../../../utils/token';
import { BigNumber } from '@ethersproject/bignumber';
import NetworkController from '../../NetworkController';
import { PreferencesController } from '../../PreferencesController';
import TransactionController from '../../transactions/TransactionController';
import { TokenOperationsController } from './TokenOperationsController';
import { TransactionFeeData } from './SignedTransaction';
import { ApproveTransaction } from './ApproveTransaction';

class TokenAllowanceController {
    constructor(
        private readonly _networkController: NetworkController,
        private readonly _preferencesController: PreferencesController,
        private readonly _tokenOperationsController: TokenOperationsController,
        private readonly _transactionController: TransactionController
    ) {}

    /**
     * Checks if the given account has enough allowance to make the exchange
     *
     * @param account User account
     * @param amount Amount to be spended
     * @param spenderAddress The address of the sepender to check the allowance
     * @param tokenAddress Asset to be spended address
     */
    public checkTokenAllowance = async (
        account: string,
        amount: BigNumber,
        spenderAddress: string,
        tokenAddress: string
    ): Promise<boolean> => {
        if (isNativeTokenAddress(tokenAddress)) {
            return true;
        }

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
    public approveAllowance = async (
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
export default TokenAllowanceController;
