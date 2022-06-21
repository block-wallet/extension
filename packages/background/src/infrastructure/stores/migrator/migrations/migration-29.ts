import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';
import { BigNumber } from 'ethers';

/**
 * This migration updates the gas lower cap for polygon
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const network in updatedNetworks) {
            updatedNetworks[network] = {
                ...updatedNetworks[network],
                gasLowerCap: undefined,
            };
        }

        updatedNetworks['POLYGON'] = {
            ...updatedNetworks['POLYGON'],
            gasLowerCap: {
                maxPriorityFeePerGas: BigNumber.from('0x6fc23ac00'), // 30 GWEI,
            },
        };

        updatedNetworks['AVALANCHEC'] = {
            ...updatedNetworks['AVALANCHEC'],
            gasLowerCap: {
                baseFee: BigNumber.from('0x5d21dba00'), // 25 GWEI,
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
    version: '0.2.3',
} as IMigration;
