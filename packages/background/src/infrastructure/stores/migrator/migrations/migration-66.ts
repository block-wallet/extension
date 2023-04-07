import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Add Network currentRpcUrl Property and remove rpcUrls
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        Object.keys(updatedNetworks).forEach((key) => {
            const network = updatedNetworks[key];
            const { rpcUrls } = network;
            if (rpcUrls && rpcUrls.length > 0) {
                const currentRpcUrl = rpcUrls[0];
                updatedNetworks[key] = {
                    ...network,
                    currentRpcUrl,
                };
                delete updatedNetworks[key].rpcUrls;
            }
        });

        const orderedNetworks = normalizeNetworksOrder(updatedNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '1.1.6',
} as IMigration;
