import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration increases the block fetch intervals for all the networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const key in updatedNetworks) {
            const network = updatedNetworks[key];
            if (network.nativelySupported) {
                const currentInterval =
                    network.actionsTimeIntervals.blockNumberPull;

                // increase the current interval by 50%
                const newInterval = Math.trunc(
                    currentInterval + currentInterval / 2
                );

                // update the value
                updatedNetworks[key] = {
                    ...updatedNetworks[key],
                    actionsTimeIntervals: {
                        ...updatedNetworks[key].actionsTimeIntervals,
                        blockNumberPull: newInterval,
                    },
                };
            }
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.8.0',
} as IMigration;
