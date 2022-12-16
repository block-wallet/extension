import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { TESTNET_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { FEATURES } from '../../../../utils/constants/features';
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

        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            name: 'zksync_alpha_testnet',
            desc: 'zkSync Alpha Testnet',
            chainId: 280,
            networkVersion: '280',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zksync/info/logo.png',
            ],
            isCustomNetwork: true,
            enable: true,
            test: true,
            order: 15,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: true,
            rpcUrls: [`https://zksync2-testnet.zksync.dev`],
            blockExplorerUrls: ['https://explorer.zksync.io/'],
            blockExplorerName: 'zkSync Explorer',
            actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
            tornadoIntervals: {
                depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
                derivationsForward: DERIVATIONS_FORWARD,
            },
            nativelySupported: true,
        } as any;

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            chainId: 31337,
            networkVersion: '31337',
            order: 16,
        };
        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.7.1',
} as IMigration;
