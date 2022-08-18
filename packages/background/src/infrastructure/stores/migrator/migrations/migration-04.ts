import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds the websocket rpc endpoints to the current networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const networkAssetsAutoDiscoveryInterfal: {
            [x: string]: number;
        } = {
            MAINNET: 10,
            ARBITRUM: 15,
            OPTIMISM: 15,
            BSC: 15,
            POLYGON: 15,
            GOERLI: 15,
            ROPSTEN: 15,
            KOVAN: 15,
            RINKEBY: 15,
            BSC_TESTNET: 15,
            LOCALHOST: 1,
        };

        for (const network in updatedNetworks) {
            if (networkAssetsAutoDiscoveryInterfal[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    assetsAutoDiscoveryInterval:
                        networkAssetsAutoDiscoveryInterfal[network],
                } as any;
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
    version: '0.1.10',
} as IMigration;
