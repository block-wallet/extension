import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
/**
 * This migration adds support to the anti phishing image
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.ARBITRUM = {
            ...updatedNetworks.ARBITRUM,
            rpcUrls: ['https://arbitrum-node.blockwallet.io'],
        };

        updatedNetworks.OPTIMISM = {
            ...updatedNetworks.OPTIMISM,
            rpcUrls: ['https://optimism-node.blockwallet.io'],
        };

        updatedNetworks.BSC = {
            ...updatedNetworks.BSC,
            rpcUrls: ['https://bsc-node.blockwallet.io'],
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.25',
} as IMigration;
