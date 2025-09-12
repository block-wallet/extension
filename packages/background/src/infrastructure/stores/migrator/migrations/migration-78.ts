import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { normalizeNetworksOrder } from '../../../../utils/networks';
import { FEATURES } from '../../../../utils/constants/features';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';

/**
 * Adds ZenChain Testnet (chainId 8408) to availableNetworks for existing users
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        if (!updatedNetworks.ZENCHAIN_TESTNET) {
            updatedNetworks.ZENCHAIN_TESTNET = {
                name: 'zenchain_testnet',
                desc: 'ZenChain Testnet',
                chainId: 8408,
                networkVersion: '8408',
                nativeCurrency: {
                    name: 'ZenChain',
                    symbol: 'ZTC',
                    decimals: 18,
                },
                hasFixedGasCost: false,
                iconUrls: [
                    'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zenchaintestnet/info/logo.png',
                ],
                enable: true,
                test: true,
                order: 13,
                features: [FEATURES.SENDS],
                ens: false,
                showGasLevels: false,
                currentRpcUrl: 'https://zenchain-testnet.api.onfinality.io/public',
                defaultRpcUrl: 'https://zenchain-testnet.api.onfinality.io/public',
                blockExplorerUrls: ['https://zentrace.io'],
                blockExplorerName: 'Zentrace',
                actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
                nativelySupported: true,
            };
        }

        if (updatedNetworks.HELIOS_TESTNET) {
            updatedNetworks.HELIOS_TESTNET = {
                ...updatedNetworks.HELIOS_TESTNET,
                order: 14,
            };
        }

        const orderedNetworks = normalizeNetworksOrder(updatedNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        } as BlankAppState;
    },
    version: '1.1.27',
} as IMigration;


