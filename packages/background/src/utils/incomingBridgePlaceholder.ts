/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber } from 'ethers';
import {
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../controllers/transactions/utils/types';

const transactionToIncomingBridgeTransactionPlaceholder = (
    sendingTx: TransactionMeta,
    chainId: number
): TransactionMeta => {
    return {
        ...sendingTx,
        id: '',
        transactionParams: {},
        chainId,
        transactionCategory: TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER,
        transferType: {
            amount: BigNumber.from(sendingTx.bridgeParams!.toTokenAmount),
            currency: sendingTx.bridgeParams!.toToken.symbol,
            decimals: sendingTx.bridgeParams!.toToken.decimals,
        },
        status: TransactionStatus.SUBMITTED,
        confirmationTime: undefined,
        methodSignature: undefined,
    };
};

export { transactionToIncomingBridgeTransactionPlaceholder };
