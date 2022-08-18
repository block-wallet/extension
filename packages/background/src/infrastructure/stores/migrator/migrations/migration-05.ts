import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import {
    BlockFetchData,
    BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
} from '../../../../controllers/block-updates/BlockFetchController';

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
            MAINNET: 20,
            ARBITRUM: 30,
            OPTIMISM: 30,
            BSC: 45,
            POLYGON: 75,
            GOERLI: 30,
            ROPSTEN: 30,
            KOVAN: 30,
            RINKEBY: 30,
            BSC_TESTNET: 75,
            LOCALHOST: 1,
        };

        const blockFetchData: { [chainId: number]: BlockFetchData } = {};

        for (const network in updatedNetworks) {
            if (networkAssetsAutoDiscoveryInterfal[network]) {
                updatedNetworks[network] = {
                    ...updatedNetworks[network],
                    assetsAutoDiscoveryInterval:
                        networkAssetsAutoDiscoveryInterfal[network],
                } as any;
            }

            blockFetchData[updatedNetworks[network].chainId] = {
                offChainSupport: false,
                checkingOffChainSupport: false,
                currentBlockNumber: 0,
                lastBlockOffChainChecked:
                    -1 * BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
            };
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            BlockFetchController: {
                blockFetchData: blockFetchData,
            },
        };
    },
    version: '0.1.11',
} as IMigration;
