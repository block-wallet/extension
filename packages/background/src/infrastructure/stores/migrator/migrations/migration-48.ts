import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { FEATURES } from '../../../../utils/constants/features';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import {
    DEFAULT_TORNADO_CONFIRMATION,
    DERIVATIONS_FORWARD,
} from '../../../../controllers/privacy/types';
/**
 * This migration adds the zkSync alpha testnet network to the networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.SCROLL_L1_TESTNET = {
            name: 'scroll_l1_testnet',
            desc: 'Scroll L1 Testnet',
            chainId: 534351,
            networkVersion: '534351',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'TSETH',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
            ],
            isCustomNetwork: true,
            enable: true,
            test: true,
            order: 8,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: true,
            rpcUrls: [`https://prealpha.scroll.io/l1`],
            blockExplorerUrls: ['https://l1scan.scroll.io/'],
            blockExplorerName: 'Scroll L1 Explorer',
            actionsTimeIntervals: {
                ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
            },
            tornadoIntervals: {
                depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                derivationsForward: DERIVATIONS_FORWARD,
            },
            nativelySupported: true,
        } as any;

        updatedNetworks.SCROLL_L2_TESTNET = {
            name: 'scroll_l2_testnet',
            desc: 'Scroll L2 Testnet',
            chainId: 534354,
            networkVersion: '534354',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'TSETH',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
            ],
            isCustomNetwork: true,
            enable: true,
            test: true,
            order: 9,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: true,
            rpcUrls: [`https://prealpha.scroll.io/l2`],
            blockExplorerUrls: ['https://l2scan.scroll.io/'],
            blockExplorerName: 'Scroll L2 Explorer',
            actionsTimeIntervals: {
                ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
            },
            tornadoIntervals: {
                depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                derivationsForward: DERIVATIONS_FORWARD,
            },
            nativelySupported: true,
        } as any;

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            order: 10,
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
    version: '0.7.6',
} as IMigration;
