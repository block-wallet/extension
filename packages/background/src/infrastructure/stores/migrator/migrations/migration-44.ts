import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration fixes the symbol and RPC url of BSC Testnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.BSC_TESTNET = {
            ...updatedNetworks.BSC_TESTNET,
            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
            nativeCurrency: {
                ...updatedNetworks.BSC_TESTNET.nativeCurrency,
                symbol: 'tBNB',
            },
        };
        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.7.2',
} as IMigration;
