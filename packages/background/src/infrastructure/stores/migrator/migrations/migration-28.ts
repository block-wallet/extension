import { BlankAppState } from '../../../../utils/constants/initialState';
import { FEATURES } from '../../../../utils/constants/features';
import { IMigration } from '../IMigration';

// We set the flag here to prevent possible changes in the future
const DERIVATIONS_FORWARD = 10;

/**
 * This migration enables privacy pools on Polygon
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks['POLYGON'] = {
            ...updatedNetworks['POLYGON'],
            tornadoIntervals: {
                depositConfirmations: 128, // We wait 128 blocks for safety purposes, as polygon chain reorgs can be very deep
                derivationsForward:
                    updatedNetworks['POLYGON'].tornadoIntervals
                        ?.derivationsForward || DERIVATIONS_FORWARD,
            },
            features: [
                ...updatedNetworks['POLYGON'].features,
                FEATURES.TORNADO,
            ],
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.2.2',
} as IMigration;
