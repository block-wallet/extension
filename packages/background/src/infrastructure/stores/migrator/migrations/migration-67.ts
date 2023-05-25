import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Add Network currentRpcUrl, backupRpcUrls & defaultRpcUrl Properties and remove rpcUrls
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        Object.keys(updatedNetworks).forEach((key) => {
            const { rpcUrls } = updatedNetworks[key];

            let defaultRpcUrl: string | undefined;
            let backupRpcUrls: string[] | undefined = [];
            if (key in INITIAL_NETWORKS) {
                defaultRpcUrl = INITIAL_NETWORKS[key].defaultRpcUrl;
                backupRpcUrls = INITIAL_NETWORKS[key].backupRpcUrls;
            } else {
                const network = updatedNetworks[key];
                if (network.rpcUrls && network.rpcUrls?.length) {
                    defaultRpcUrl = network.rpcUrls[0];
                } else {
                    defaultRpcUrl = '';
                }
                backupRpcUrls = [];
            }

            updatedNetworks[key] = {
                ...updatedNetworks[key],
                defaultRpcUrl,
                backupRpcUrls,
            };
            if (rpcUrls && rpcUrls.length > 0) {
                const currentRpcUrl = rpcUrls[0];
                updatedNetworks[key] = {
                    ...updatedNetworks[key],
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
    version: '1.1.7',
} as IMigration;
