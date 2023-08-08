import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { NO_EIP_1559_NETWORKS } from '../../../../controllers/NetworkController';

/**
 * This migration forces the calculation of the EIP1559 compatibility to some networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { isEIP1559Compatible } = persistedState.NetworkController;
        const updatedIsEIP1559Compatible = { ...isEIP1559Compatible };

        NO_EIP_1559_NETWORKS.forEach(
            (chainId: number) => delete updatedIsEIP1559Compatible[chainId]
        );

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                isEIP1559Compatible: updatedIsEIP1559Compatible,
            },
        };
    },
    version: '1.1.11',
} as IMigration;
