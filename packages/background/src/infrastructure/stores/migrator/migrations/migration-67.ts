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
            let currentRpcUrl: string;
            let backupRpcUrls: string[] | undefined;
            if (key in INITIAL_NETWORKS) {
                defaultRpcUrl = INITIAL_NETWORKS[key].defaultRpcUrl;
                backupRpcUrls = INITIAL_NETWORKS[key].backupRpcUrls;
                currentRpcUrl =
                    updatedNetworks[key].currentRpcUrl ??
                    INITIAL_NETWORKS[key].currentRpcUrl;
            } else {
                const network = updatedNetworks[key];
                if (network.rpcUrls && network.rpcUrls?.length) {
                    defaultRpcUrl = network.rpcUrls[0];
                    currentRpcUrl = network.rpcUrls[0];
                } else {
                    defaultRpcUrl = '';
                    currentRpcUrl = network.currentRpcUrl ?? '';
                }
                backupRpcUrls = [];
            }

            if (rpcUrls && rpcUrls.length > 0) {
                currentRpcUrl = rpcUrls[0];
                delete updatedNetworks[key].rpcUrls;
            }
            updatedNetworks[key] = {
                ...updatedNetworks[key],
                defaultRpcUrl,
                currentRpcUrl,
                backupRpcUrls,
            };
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
    version: '1.1.9',
} as IMigration;
