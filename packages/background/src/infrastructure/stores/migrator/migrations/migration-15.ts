import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../../../../utils/constants/networks';
import { SECOND } from '../../../../utils/constants/time';

/**
 * This migration adds the websocket rpc endpoints to the current networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const networkBlockInterfals: {
            [x: string]: Network['actionsTimeIntervals'];
        } = {
            MAINNET: {
                ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
                blockNumberPull: 10 * SECOND,
            },
            ARBITRUM: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            OPTIMISM: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            BSC: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            POLYGON: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            AVALANCHE: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            FANTOM: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            GOERLI: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            ROPSTEN: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            KOVAN: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            RINKEBY: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            BSC_TESTNET: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            POLYGON_TESTNET_MUMBAI: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            LOCALHOST: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
        };

        for (const network in updatedNetworks) {
            if (networkBlockInterfals[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    actionsTimeIntervals: networkBlockInterfals[network],
                };
            }
        }

        const updateObj: {
            blockData: {
                [chainId: number]: {
                    blockNumber: number;
                };
            };
        } = { blockData: {} };

        Object.keys(persistedState.BlockUpdatesController.blockData).reduce(
            (_, cv) => {
                updateObj.blockData[Number(cv)] = {
                    blockNumber:
                        persistedState.BlockUpdatesController.blockData[
                            Number(cv)
                        ].blockNumber,
                };
                return '';
            },
            ''
        );

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            BlockUpdatesController: { ...updateObj },
        };
    },
    version: '0.1.22',
} as IMigration;
