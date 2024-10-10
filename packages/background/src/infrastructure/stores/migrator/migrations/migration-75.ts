import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration updates the currency icon for morph
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const key = `CHAIN-2810`;
        if (key in availableNetworks) {
            updatedNetworks[key] = {
                ...updatedNetworks[key],
                nativeCurrency: {
                    ...updatedNetworks[key].nativeCurrency,
                    logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
                },
            };
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '1.1.25',
} as IMigration;
