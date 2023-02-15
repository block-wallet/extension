import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Add default rpc url to all networks that we have a default rpc url for
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        Object.keys(INITIAL_NETWORKS).forEach((networkName) => {
            const initialNetwork = INITIAL_NETWORKS[networkName];
            if (initialNetwork.defaultRpcUrl) {
                const persistedNetwork = updatedNetworks[networkName];
                if (persistedNetwork) {
                    updatedNetworks[networkName] = {
                        ...persistedNetwork,
                        defaultRpcUrl: initialNetwork.defaultRpcUrl,
                    };
                }
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
    version: '1.0.3',
} as IMigration;
