import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration fixes zksync block explorer
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.OPTIMISM = {
            ...updatedNetworks.OPTIMISM,
            enable: true,
        };
        updatedNetworks.XDAI = {
            ...updatedNetworks.XDAI,
            enable: true,
        };
        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            showGasLevels: false,
        };
        updatedNetworks.SCROLL_L1_TESTNET = {
            ...updatedNetworks.SCROLL_L1_TESTNET,
            showGasLevels: false,
        };
        updatedNetworks.SCROLL_L2_TESTNET = {
            ...updatedNetworks.SCROLL_L2_TESTNET,
            showGasLevels: false,
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.8.3',
} as IMigration;
