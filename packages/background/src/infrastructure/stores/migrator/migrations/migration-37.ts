import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { MINUTE } from '../../../../utils/constants/time';
/**
 * Set the transaction sign timeout property in the TransactionController
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const timeoutInMillis =
            persistedState.AppStateController.idleTimeout * 60 * 1000;

        const txSignTimeout = Math.min(
            timeoutInMillis || 3 * MINUTE,
            3 * MINUTE
        );

        return {
            ...persistedState,
            TransactionController: {
                ...persistedState.TransactionController,
                txSignTimeout:
                    persistedState.TransactionController.txSignTimeout ||
                    txSignTimeout,
            },
        };
    },
    version: '0.4.4',
} as IMigration;
