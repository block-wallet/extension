import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { IMigration } from '../IMigration';

/**
 * This migration reorder networks and separates order of testnets and mainnets each starting from zero
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const currentNetworks =
            persistedState.NetworkController.availableNetworks;

        const orderedNetworks = normalizeNetworksOrder(currentNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '0.7.3',
} as IMigration;
