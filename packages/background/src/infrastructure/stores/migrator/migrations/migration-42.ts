import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { FEATURES } from '../../../../utils/constants/features';

/**
 * This migration adds the swap feature to networks compatible
 * with the 1Inch aggregator protocol v4.0 that didn't
 * previously have this property
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        ['OPTIMISM', 'POLYGON', 'AVALANCHEC', 'FANTOM'].forEach((network) => {
            const newFeatures = [...updatedNetworks[network].features];

            newFeatures.push(FEATURES.SWAPS);

            updatedNetworks[network] = {
                ...updatedNetworks[network],
                features: newFeatures,
            };
        });

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.6.0',
} as IMigration;
