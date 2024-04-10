import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';
import { BigNumber } from '@ethersproject/bignumber';

/**
 * This migration updates the gas lower cap for bnb
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks['BSC'] = {
            ...updatedNetworks['BSC'],
            gasLowerCap: {
                maxPriorityFeePerGas: BigNumber.from('3000000000'), // 3 GWEI,
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
    version: '1.1.24',
} as IMigration;
