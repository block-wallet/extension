import { FEATURES } from '../../../../utils/constants/features';
import { BlankAppState } from '../../../../utils/constants/initialState';
import { SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { IMigration } from '../IMigration';

/**
 * This migration removes RSK Testnet and adds OKX's testnet.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        // Remove RSK Testnet
        delete updatedNetworks['RSK_TESTNET'];

        // Add new OKX X1 testnet
        updatedNetworks.X1_TESTNET = {
            name: 'X1 Testnet',
            desc: 'X1 Testnet',
            chainId: 195,
            networkVersion: '195',
            nativeCurrency: {
                name: 'OKB',
                symbol: 'OKB',
                decimals: 18,
                logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/x1/info/logo.png',
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/x1/info/logo.png',
            ],
            hasFixedGasCost: false,
            enable: true,
            test: true,
            order: 10,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: false,
            currentRpcUrl: `https://testrpc.x1.tech/`,
            defaultRpcUrl: `https://testrpc.x1.tech/`,
            backupRpcUrls: ['https://x1testrpc.okx.com/'],
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
    version: '1.1.23',
} as IMigration;
