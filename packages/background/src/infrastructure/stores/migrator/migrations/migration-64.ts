import { FEATURES } from '../../../../utils/constants/features';
import { BlankAppState } from '../../../../utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES, INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { IMigration } from '../IMigration';

/**
 * This migration adds polygon zkEvm network
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };


        updatedNetworks.MAINNET = {
            ...updatedNetworks.MAINNET,
            rpcUrls: INITIAL_NETWORKS.MAINNET.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.MAINNET.defaultRpcUrl,
        };

        updatedNetworks.POLYGON = {
            ...updatedNetworks.POLYGON,
            rpcUrls: INITIAL_NETWORKS.POLYGON.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.POLYGON.defaultRpcUrl,
        };

        updatedNetworks.BSC = {
            ...updatedNetworks.BSC,
            rpcUrls: INITIAL_NETWORKS.BSC.rpcUrls,
            defaultRpcUrl: INITIAL_NETWORKS.BSC.defaultRpcUrl,
        };


        // Add new Polygon zkEVM
        updatedNetworks.POLYGON_ZKEVM = {
            name: 'polygon_zkevm',
            desc: 'Polygon zkEVM',
            chainId: 1101,
            networkVersion: '1101',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/polygonzkevm/info/logo.png',
            ],
            hasFixedGasCost: false,
            enable: true,
            test: false,
            order: 11,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            rpcUrls: [`https://polygon-zkevm-node.blockwallet.io`],
            defaultRpcUrl: `https://polygon-zkevm-node.blockwallet.io`,
            blockExplorerUrls: ['https://zkevm.polygonscan.com/'],
            blockExplorerName: 'Polygon zkEVM Explorer',
            actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            tornadoIntervals: {
                depositConfirmations: 0,
                derivationsForward: 0,
            },
            nativelySupported: true,
        };
        const orderedNetworks = normalizeNetworksOrder(updatedNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '1.1.2',
} as IMigration;
