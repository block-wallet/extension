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
            blockNumberPull: 45 * SECOND,
            balanceFetch: 80 * SECOND,
            gasPricesUpdate: 30 * SECOND,
            exchangeRatesFetch: 1 * MINUTE,
            transactionsStatusesUpdate: 15 * SECOND,
            providerSubscriptionsUpdate: 15 * SECOND,
            transactionWatcherUpdate: 90 * SECOND,
        };

        const FAST_TIME_INTERVALS_DEFAULT_VALUES = {
            ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            ...{
                blockNumberPull: 20 * SECOND,
                balanceFetch: 30 * SECOND,
                gasPricesUpdate: 15 * SECOND,
                transactionsStatusesUpdate: 6 * SECOND,
                providerSubscriptionsUpdate: 6 * SECOND,
                transactionWatcherUpdate: 45 * SECOND,
            },
        };

        const networkBlockInterfals: {
            [x: string]: Network['actionsTimeIntervals'];
        } = {
            MAINNET: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            OPTIMISM: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            XDAI: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            RSK: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            GOERLI: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            LOCALHOST: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },

            ARBITRUM: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
            BSC: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
            POLYGON: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
            AVALANCHEC: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
            FANTOM: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
        };

        for (const network in updatedNetworks) {
            if (networkBlockInterfals[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    actionsTimeIntervals: networkBlockInterfals[network],
                };
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
    version: '1.0.2',
} as IMigration;
