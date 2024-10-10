import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Update main networks RPC urls temporary due to Cloudflare block.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.MAINNET = {
            ...updatedNetworks.MAINNET,
            rpcUrls: INITIAL_NETWORKS.MAINNET.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.MAINNET.defaultRpcUrl,
        };

        updatedNetworks.POLYGON = {
            ...updatedNetworks.POLYGON,
            rpcUrls: INITIAL_NETWORKS.POLYGON.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.POLYGON.defaultRpcUrl,
        };

        updatedNetworks.BSC = {
            ...updatedNetworks.BSC,
            rpcUrls: INITIAL_NETWORKS.BSC.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.BSC.defaultRpcUrl,
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
    version: '1.1.3',
} as IMigration;
