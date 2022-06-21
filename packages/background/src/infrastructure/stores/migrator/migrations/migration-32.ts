import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { Network } from '../../../../utils/constants/networks';
import { MINUTE, SECOND } from '../../../../utils/constants/time';

/**
 * This migration adds the websocket rpc endpoints to the current networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const ACTIONS_TIME_INTERVALS_DEFAULT_VALUES = {
            blockNumberPull: 10 * SECOND,
            balanceFetch: 20 * SECOND,
            gasPricesUpdate: 8 * SECOND,
            exchangeRatesFetch: 1 * MINUTE,
            incomingTransactionsUpdate: 20 * SECOND,
            transactionsStatusesUpdate: 8 * SECOND,
            providerSubscriptionsUpdate: 8 * SECOND,
            erc20TransactionWatcherUpdate: 30 * SECOND,
        };

        const FAST_TIME_INTERVALS_DEFAULT_VALUES = {
            ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            ...{
                blockNumberPull: 4 * SECOND,
                balanceFetch: 8 * SECOND,
                gasPricesUpdate: 3 * SECOND,
                incomingTransactionsUpdate: 8 * SECOND,
                transactionsStatusesUpdate: 3 * SECOND,
                providerSubscriptionsUpdate: 3 * SECOND,
                erc20TransactionWatcherUpdate: 15 * SECOND,
            },
        };

        const TESTNET_TIME_INTERVALS_DEFAULT_VALUES = {
            ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            ...{
                blockNumberPull: 20 * SECOND,
                balanceFetch: 30 * SECOND,
                gasPricesUpdate: 19 * SECOND,
                incomingTransactionsUpdate: 40 * SECOND,
                transactionsStatusesUpdate: 19 * SECOND,
                providerSubscriptionsUpdate: 19 * SECOND,
                erc20TransactionWatcherUpdate: 40 * SECOND,
            },
        };

        const networkBlockInterfals: {
            [x: string]: Network['actionsTimeIntervals'];
        } = {
            MAINNET: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            ARBITRUM: {
                ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
            },
            OPTIMISM: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            BSC: {
                ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
            },
            POLYGON: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
            AVALANCHE: {
                ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
            },
            FANTOM: {
                ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
            },
            // goerli is the most used chain for our tests, we can keep a good time-experience.
            GOERLI: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            ROPSTEN: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            KOVAN: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            RINKEBY: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            BSC_TESTNET: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            POLYGON_TESTNET_MUMBAI: {
                ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
            },
            LOCALHOST: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        };

        for (const network in updatedNetworks) {
            if (networkBlockInterfals[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    actionsTimeIntervals: networkBlockInterfals[network],
                };
            }
        }

        // cached populated tokens
        const { userTokens, cachedPopulatedTokens } =
            persistedState.TokenController;
        const updatedCachedPopulatedTokens = { ...cachedPopulatedTokens };

        for (const userAddress in userTokens) {
            for (const chainId in userTokens[userAddress]) {
                updatedCachedPopulatedTokens[parseInt(chainId)] = {};
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
                cachedPopulatedTokens: { ...updatedCachedPopulatedTokens },
            },
        };
    },
    version: '0.3.0',
} as IMigration;
