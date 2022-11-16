import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration fixes zksync block explorer
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            blockExplorerUrls: ['https://goerli.explorer.zksync.io'],
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.8.2',
} as IMigration;
