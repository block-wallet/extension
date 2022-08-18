import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { SECOND } from '../../../../utils/constants/time';
import { IMigration } from '../IMigration';
/**
 * This migration updates some actions intervals for mainnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.MAINNET = {
            ...updatedNetworks.MAINNET,
            actionsTimeIntervals: {
                ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
                balanceFetch: 30 * SECOND,
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
    version: '0.1.27',
} as IMigration;
