import {
    DEFAULT_TORNADO_CONFIRMATION,
    DERIVATIONS_FORWARD,
} from '../../../../controllers/privacy/types';
import { BlankAppState } from '../../../../utils/constants/initialState';
import { FEATURES } from '../../../../utils/constants/features';
import { IMigration } from '../IMigration';
/**
 * This migration adds flags to be used by Tornado logic which are specific by network
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        //// NETWORK CHANGES ////
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const network in updatedNetworks) {
            updatedNetworks[network] = {
                ...updatedNetworks[network],
                tornadoIntervals: {
                    depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                    derivationsForward: DERIVATIONS_FORWARD,
                },
            };
        }

        updatedNetworks['BSC'] = {
            ...updatedNetworks['BSC'],
            tornadoIntervals: {
                depositConfirmations: 18, // We wait 18 blocks that it's the same time as it'll take on mainnet considering each chain avg block time
                derivationsForward: DERIVATIONS_FORWARD,
            },
            features: [...updatedNetworks['BSC'].features, FEATURES.TORNADO],
        };

        //// PRIVACY FEATURE CHANGES ////
        const { pendingWithdrawals } = persistedState.BlankDepositController;
        const updatedPendingWithdrawals = {
            ...pendingWithdrawals,
            polygon: { pending: [] },
            arbitrum: { pending: [] },
            optimism: { pending: [] },
            avalanchec: { pending: [] },
            bsc: { pending: [] },
            xdai: { pending: [] },
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            BlankDepositController: {
                ...persistedState.BlankDepositController,
                pendingWithdrawals: { ...updatedPendingWithdrawals },
            },
        };
    },
    version: '0.2.0',
} as IMigration;
