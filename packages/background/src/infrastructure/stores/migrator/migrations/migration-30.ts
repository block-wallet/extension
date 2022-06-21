import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration changes BSC chains' description because of their rebrand
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.BSC = {
            ...updatedNetworks.BSC,
            desc: 'BNB Chain Mainnet',
            nativeCurrency: {
                ...updatedNetworks.BSC.nativeCurrency,
                name: 'BNB Chain Native Token',
            },
        };

        updatedNetworks.BSC_TESTNET = {
            ...updatedNetworks.BSC_TESTNET,
            desc: 'BNB Chain Testnet',
            nativeCurrency: {
                ...updatedNetworks.BSC_TESTNET.nativeCurrency,
                name: 'BNB Chain Native Token',
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
    version: '0.2.4',
} as IMigration;
