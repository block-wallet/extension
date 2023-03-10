import { FEATURES } from '../../../../utils/constants/features';
import { BlankAppState } from '../../../../utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { IMigration } from '../IMigration';

/**
 * This migration updates Scroll and zkSync networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        // Remove Scroll L1 testnet
        delete updatedNetworks['SCROLL_L1_TESTNET'];

        // Update Scroll L2 Alpha
        updatedNetworks.SCROLL_L2_TESTNET = {
            ...updatedNetworks.SCROLL_L2_TESTNET,
            desc: 'Scroll Alpha Testnet',
            chainId: 534353,
            networkVersion: '534353',
            blockExplorerUrls: ['https://blockscout.scroll.io/'],
        };

        // Add new zkSync Era Mainnet
        updatedNetworks.ZKSYNC_ERA_MAINNET = {
            name: 'zksync_era_mainnet',
            desc: 'zkSync Era Mainnet',
            chainId: 324,
            networkVersion: '324',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zksync/info/logo.png',
            ],
            hasFixedGasCost: false,
            enable: true,
            test: false,
            order: 7,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            rpcUrls: [`https://zksync-node.blockwallet.io`],
            defaultRpcUrl: `https://zksync-node.blockwallet.io`,
            blockExplorerUrls: ['https://explorer.zksync.io/'],
            blockExplorerName: 'zkSync Explorer',
            actionsTimeIntervals: {
                ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            },
            tornadoIntervals: {
                depositConfirmations: 0,
                derivationsForward: 0,
            },
            nativelySupported: true,
        };

        // Update zkSync Era Testnet
        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            desc: 'zkSync Era Testnet',
            blockExplorerName: 'zkSync Testnet Explorer',
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
