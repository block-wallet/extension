import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Update Scroll L1 and L2 endpoints
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.SCROLL_L1_TESTNET = {
            ...updatedNetworks.SCROLL_L1_TESTNET,
            rpcUrls: INITIAL_NETWORKS.SCROLL_L1_TESTNET.rpcUrls,
        };

        updatedNetworks.SCROLL_L2_TESTNET = {
            ...updatedNetworks.SCROLL_L2_TESTNET,
            rpcUrls: INITIAL_NETWORKS.SCROLL_L2_TESTNET.rpcUrls,
        };

        const orderedNetworks = normalizeNetworksOrder(updatedNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '1.0.1',
} as IMigration;
