import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Update Network and native currency logos
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.MAINNET = {
            ...updatedNetworks.MAINNET,
            iconUrls: INITIAL_NETWORKS.MAINNET.iconUrls,
        };

        updatedNetworks.ARBITRUM = {
            ...updatedNetworks.ARBITRUM,
            iconUrls: INITIAL_NETWORKS.ARBITRUM.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.ARBITRUM.nativeCurrency,
                logo: INITIAL_NETWORKS.ARBITRUM.nativeCurrency.logo,
            },
        };

        updatedNetworks.OPTIMISM = {
            ...updatedNetworks.OPTIMISM,
            iconUrls: INITIAL_NETWORKS.OPTIMISM.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.OPTIMISM.nativeCurrency,
                logo: INITIAL_NETWORKS.OPTIMISM.nativeCurrency.logo,
            },
        };

        updatedNetworks.XDAI = {
            ...updatedNetworks.XDAI,
            iconUrls: INITIAL_NETWORKS.XDAI.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.XDAI.nativeCurrency,
                logo: INITIAL_NETWORKS.XDAI.nativeCurrency.logo,
            },
        };

        updatedNetworks.ZKSYNC_ERA_MAINNET = {
            ...updatedNetworks.ZKSYNC_ERA_MAINNET,
            iconUrls: INITIAL_NETWORKS.ZKSYNC_ERA_MAINNET.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.ZKSYNC_ERA_MAINNET.nativeCurrency,
                logo: INITIAL_NETWORKS.ZKSYNC_ERA_MAINNET.nativeCurrency.logo,
            },
        };

        updatedNetworks.RSK = {
            ...updatedNetworks.RSK,
            iconUrls: INITIAL_NETWORKS.RSK.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.RSK.nativeCurrency,
                logo: INITIAL_NETWORKS.RSK.nativeCurrency.logo,
            },
        };

        updatedNetworks.GOERLI = {
            ...updatedNetworks.GOERLI,
            iconUrls: INITIAL_NETWORKS.GOERLI.iconUrls,
        };

        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            nativeCurrency: {
                ...updatedNetworks.ZKSYNC_ALPHA_TESTNET.nativeCurrency,
                logo: INITIAL_NETWORKS.ZKSYNC_ALPHA_TESTNET.nativeCurrency.logo,
            },
        };

        updatedNetworks.RSK_TESTNET = {
            ...updatedNetworks.RSK_TESTNET,
            iconUrls: INITIAL_NETWORKS.RSK_TESTNET.iconUrls,
            nativeCurrency: {
                ...updatedNetworks.RSK_TESTNET.nativeCurrency,
                logo: INITIAL_NETWORKS.RSK_TESTNET.nativeCurrency.logo,
            },
        };

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            nativeCurrency: {
                ...updatedNetworks.LOCALHOST.nativeCurrency,
                logo: INITIAL_NETWORKS.LOCALHOST.nativeCurrency.logo,
            },
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
    version: '1.1.4',
} as IMigration;
