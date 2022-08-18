import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration disables kovan, ropsten and rinkeby because these networks are deprecated.
 * https://ethereum.org/nb/developers/docs/networks/#ropsten
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.ROPSTEN = {
            ...updatedNetworks.ROPSTEN,
            enable: false,
        };
        updatedNetworks.KOVAN = {
            ...updatedNetworks.KOVAN,
            enable: false,
        };
        updatedNetworks.RINKEBY = {
            ...updatedNetworks.RINKEBY,
            enable: false,
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.2.5',
} as IMigration;
