import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
/**
 * This migration updates the network endpoints and also removes a spam token from the user's token
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        // update network endpoints

        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.MAINNET = {
            ...updatedNetworks.MAINNET,
            rpcUrls: ['https://mainnet-node.blockwallet.io'],
        };

        updatedNetworks.POLYGON = {
            ...updatedNetworks.POLYGON,
            rpcUrls: ['https://polygon-node.blockwallet.io'],
        };

        updatedNetworks.GOERLI = {
            ...updatedNetworks.GOERLI,
            rpcUrls: ['https://goerli-node.blockwallet.io'],
        };

        updatedNetworks.ROPSTEN = {
            ...updatedNetworks.ROPSTEN,
            rpcUrls: ['https://ropsten-node.blockwallet.io'],
        };

        updatedNetworks.KOVAN = {
            ...updatedNetworks.KOVAN,
            rpcUrls: ['https://kovan-node.blockwallet.io'],
        };

        updatedNetworks.RINKEBY = {
            ...updatedNetworks.RINKEBY,
            rpcUrls: ['https://rinkeby-node.blockwallet.io'],
        };

        // remove spam token
        const { userTokens } = persistedState.TokenController;
        const updatedUserTokens = { ...userTokens };

        // remove spam token "IOV" from every address on mainnet
        for (const userAddress in updatedUserTokens) {
            if (1 in updatedUserTokens[userAddress]) {
                if (
                    '0x0E69D0A2bbB30aBcB7e5CfEA0E4FDe19C00A8d47' in
                    updatedUserTokens[userAddress][1]
                ) {
                    delete updatedUserTokens[userAddress][1][
                        '0x0E69D0A2bbB30aBcB7e5CfEA0E4FDe19C00A8d47'
                    ];
                }
            }
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            TokenController: {
                ...persistedState.TokenController,
                userTokens: { ...updatedUserTokens },
            },
        };
    },
    version: '0.1.26',
} as IMigration;
