import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { Network } from '../../../../utils/constants/networks';

/**
 * This migration adds the websocket rpc endpoints to the current networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const networkWsUrls: { [x: string]: string[] } = {
            MAINNET: ['wss://mainnet-node.goblank.io/ws'],
            ARBITRUM: ['wss://arb1.arbitrum.io/ws'],
            OPTIMISM: ['wss://ws-mainnet.optimism.io'],
            POLYGON: ['wss://ws-matic-mainnet.chainstacklabs.com'],
            GOERLI: ['wss://goerli-node.goblank.io/ws'],
            ROPSTEN: ['wss://ropsten-node.goblank.io/ws'],
            KOVAN: ['wss://kovan-node.goblank.io/ws'],
            RINKEBY: ['wss://rinkeby-node.goblank.io/ws'],
        };

        for (const network in updatedNetworks) {
            if (networkWsUrls[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    wsUrls: networkWsUrls[network],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    version: '0.1.9',
} as IMigration;
