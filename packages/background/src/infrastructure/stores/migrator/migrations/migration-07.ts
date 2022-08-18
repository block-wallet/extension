import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration removes the wsUrls from the networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const network in updatedNetworks) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (updatedNetworks[network] as any)['wsUrls'];
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.14',
} as IMigration;
