import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { IMigration } from '../IMigration';
/**
 * This migration updates some actions intervals for bsc
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.BSC = {
            ...updatedNetworks.BSC,
            actionsTimeIntervals: {
                ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            },
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.32',
} as IMigration;
