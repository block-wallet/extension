import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import {
    SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES,
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
} from '../../../../utils/constants/networks';
import { FEATURES } from '../../../../utils/constants/features';
import {
    DEFAULT_TORNADO_CONFIRMATION,
    DERIVATIONS_FORWARD,
} from '../../../../controllers/blank-deposit/types';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * This migration adds RSK Mainnet and RSK Testnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.RSK = {
            name: 'rsk',
            desc: 'RSK Mainnet',
            chainId: 30,
            networkVersion: '30',
            nativeCurrency: {
                name: 'Smart Bitcoin',
                symbol: 'RBTC',
                decimals: 18,
            },
            hasFixedGasCost: false,
            enable: true,
            test: false,
            order: 9,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/rsk/assets/0x/logo.png',
            ],
            rpcUrls: ['https://did.rsk.co:4444'],
            blockExplorerName: 'RSK Explorer',
            blockExplorerUrls: ['https://explorer.rsk.co'],
            actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
            tornadoIntervals: {
                depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                derivationsForward: DERIVATIONS_FORWARD,
            },
            nativelySupported: true,
        };
        updatedNetworks.RSK_TESTNET = {
            name: 'rsk_testnet',
            desc: 'RSK Testnet',
            chainId: 31,
            networkVersion: '31',
            nativeCurrency: {
                name: 'Testnet Smart Bitcoin',
                symbol: 'tRBTC',
                decimals: 18,
            },
            hasFixedGasCost: false,
            enable: true,
            test: true,
            order: 10,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/rsk/assets/0x/logo.png',
            ],
            rpcUrls: ['https://did.testnet.rsk.co:4444'],
            blockExplorerName: 'RSK Testnet Explorer',
            blockExplorerUrls: ['https://explorer.testnet.rsk.co'],
            actionsTimeIntervals: { ... SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            tornadoIntervals: {
                depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                derivationsForward: DERIVATIONS_FORWARD,
            },
            nativelySupported: true,
        };
        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            order: 11,
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
    version: '0.8.3',
} as IMigration;
