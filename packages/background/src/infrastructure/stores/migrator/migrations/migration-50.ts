import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration deletes the swaps feature flag
 * Now it is being calculated dinmaically depending on the 1inch supported networks.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = Object.entries({ ...availableNetworks }).reduce(
            (acc, [currentKey, currentNetwork]) => {
                return {
                    ...acc,
                    [currentKey]: {
                        ...currentNetwork,
                        features: currentNetwork.features.filter(
                            (feature) => feature !== 'swaps'
                        ),
                    },
                };
            },
            availableNetworks
        );

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.8.1',
} as IMigration;
