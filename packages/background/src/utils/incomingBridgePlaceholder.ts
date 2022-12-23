import { BigNumber } from '@ethersproject/bignumber';
import {
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
    TransferType,
} from '../controllers/transactions/utils/types';

const transactionToIncomingBridgeTransactionPlaceholder = (
    sendingTx: TransactionMeta,
    chainId: number
): TransactionMeta => {
    let transferType: TransferType | undefined = undefined;
    if (
        sendingTx.bridgeParams &&
        sendingTx.bridgeParams.toTokenAmount &&
        sendingTx.bridgeParams.toToken
    ) {
        transferType = {
            amount: BigNumber.from(sendingTx.bridgeParams.toTokenAmount),
            currency: sendingTx.bridgeParams.toToken.symbol,
            decimals: sendingTx.bridgeParams.toToken.decimals,
        };
    }
    return {
        ...sendingTx,
        id: '',
        transactionParams: {},
        chainId,
        transactionCategory: TransactionCategories.INCOMING_BRIDGE_PLACEHOLDER,
        transferType,
        status: TransactionStatus.SUBMITTED,
        confirmationTime: undefined,
        methodSignature: undefined,
    };
};

export { transactionToIncomingBridgeTransactionPlaceholder };
