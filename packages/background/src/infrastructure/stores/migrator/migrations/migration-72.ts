import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { FEATURES } from '../../../../utils/constants/features';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
} from '../../../../utils/constants/networks';

/**
 * This migration adds Scroll Mainnet network and updates Scrol Sepolia Tesnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.SCROLL_MAINNET = {
            name: 'scroll_mainnet',
            desc: 'Scroll',
            chainId: 534352,
            networkVersion: '534352',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
                logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
            ],
            hasFixedGasCost: false,
            enable: true,
            test: false,
            order: 12,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            currentRpcUrl: 'https://scroll-node.blockwallet.io',
            defaultRpcUrl: 'https://scroll-node.blockwallet.io',
            backupRpcUrls: [
                'https://scroll.blockwallet.io',
                'https://rpc.scroll.io/',
            ],
            blockExplorerName: 'Scroll Blockchain Explorer',
            blockExplorerUrls: ['https://scrollscan.com/'],
            actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            tornadoIntervals: {
                depositConfirmations: 0,
                derivationsForward: 0,
            },
            nativelySupported: true,
        };

        updatedNetworks.SCROLL_L2_TESTNET = {
            name: 'scroll_l2_testnet',
            desc: 'Scroll Sepolia Testnet',
            chainId: 534351,
            networkVersion: '534351',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
                logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
            ],
            hasFixedGasCost: false,
            enable: true,
            test: true,
            order: 9,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            currentRpcUrl: `https://sepolia-rpc.scroll.io/`,
            defaultRpcUrl: `https://sepolia-rpc.scroll.io/`,
            backupRpcUrls: ['https://rpc.ankr.com/scroll_sepolia_testnet/'],
            blockExplorerUrls: ['https://sepolia.scrollscan.com/'],
            blockExplorerName: 'Scroll Sepolia Explorer',
            actionsTimeIntervals: {
                ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
            },
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
    version: '1.1.20',
} as IMigration;
