import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration changes the endpoint for the polygon network
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.POLYGON = {
            ...updatedNetworks.POLYGON,
            rpcUrls: [`https://polygon-node.goblank.io/`],
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.12',
} as IMigration;
