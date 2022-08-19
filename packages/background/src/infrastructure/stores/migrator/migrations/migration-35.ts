import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { MetaType } from '../../../../controllers/transactions/utils/types';

/**
 * Run migrations to :
 *      - Add the replacedBy reference for an sped up or cancelled transaction.
 *      - Rename the metaType strings from FAILED => REGULAR_NO_REPLACEMENT, CANCELLING => REGULAR_CANCELLING and SPEEDING_UP => REGULAR_SPEEDING_UP
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const previousValue = persistedState.TransactionController.transactions;
        return {
            ...persistedState,
            TransactionController: {
                ...persistedState.TransactionController,
                transactions: previousValue.map((transaction) => {
                    let metaType = transaction.metaType;

                    switch (transaction.metaType as string) {
                        case 'FAILED': {
                            metaType = MetaType.REGULAR_NO_REPLACEMENT;
                            break;
                        }
                        case 'CANCELLING': {
                            metaType = MetaType.REGULAR_CANCELLING;
                            break;
                        }
                        case 'SPEEDING_UP': {
                            metaType = MetaType.REGULAR_SPEEDING_UP;
                            break;
                        }
                    }
                    let replacedBy = undefined;
                    if (
                        [
                            MetaType.REGULAR,
                            MetaType.REGULAR_SPEEDING_UP,
                            MetaType.REGULAR_CANCELLING,
                        ].includes(metaType)
                    ) {
                        //look for replacement id
                        replacedBy =
                            previousValue.find((oldTransaction) => {
                                if (
                                    oldTransaction.transactionParams.nonce ===
                                        transaction.transactionParams.nonce &&
                                    oldTransaction.rawTransaction ===
                                        transaction.rawTransaction &&
                                    oldTransaction.transactionParams.from ===
                                        transaction.transactionParams.from &&
                                    oldTransaction.id !== transaction.id
                                ) {
                                    return true;
                                }
                                return false;
                            })?.id || undefined;
                    }
                    return {
                        ...transaction,
                        metaType,
                        replacedBy,
                    };
                }),
            },
        };
    },
    version: '0.4.2',
} as IMigration;
