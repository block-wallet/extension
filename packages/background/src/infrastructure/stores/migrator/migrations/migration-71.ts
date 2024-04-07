import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { FEATURES } from '../../../../utils/constants/features';
import { SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';

/**
 * This migration adds ZetaChain Testnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.ZETACHAIN_TESTNET = {
            name: 'zetachain_testnet',
            desc: 'ZetaChain Testnet',
            chainId: 7001,
            networkVersion: '7001',
            nativeCurrency: {
                name: 'Testnet ZETA',
                symbol: 'aZETA',
                decimals: 18,
                logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zetachaintestnet/info/logo.png',
            },
            hasFixedGasCost: false,
            enable: true,
            test: true,
            order: 11,
            features: [FEATURES.SENDS],
            ens: false,
            showGasLevels: true,
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zetachaintestnet/info/logo.png',
            ],
            currentRpcUrl: 'https://rpc.ankr.com/zetachain_evm_athens_testnet',
            blockExplorerName: 'ZetaChain Testnet Explorer',
            blockExplorerUrls: ['https://zetachain-athens-3.blockscout.com/'],
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
    version: '1.1.19',
} as IMigration;
