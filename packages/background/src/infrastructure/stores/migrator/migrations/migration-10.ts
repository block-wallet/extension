import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { IMigration } from '../IMigration';

/**
 * This migration adds the fantom network to the networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.FANTOM = {
            name: 'fantom',
            desc: 'Fantom Opera',
            chainId: 250,
            networkVersion: '250',
            nativeCurrency: {
                name: 'Fantom',
                symbol: 'FTM',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/fantom/info/logo.png',
            ],
            isCustomNetwork: false,
            gasLowerCap: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            } as any,
            enable: true,
            test: false,
            order: 7,
            features: ['sends'],
            ens: false,
            showGasLevels: true,
            rpcUrls: [`https://rpc.ftm.tools`],
            blockExplorerUrls: ['https://ftmscan.com'],
            etherscanApiUrl: 'https://api.ftmscan.com',
            actionsTimeIntervals: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            nativelySupported: true,
        };

        updatedNetworks.GOERLI = {
            ...updatedNetworks.GOERLI,
            order: 8,
        };

        updatedNetworks.ROPSTEN = {
            ...updatedNetworks.ROPSTEN,
            order: 9,
        };

        updatedNetworks.KOVAN = {
            ...updatedNetworks.KOVAN,
            order: 10,
        };

        updatedNetworks.RINKEBY = {
            ...updatedNetworks.RINKEBY,
            order: 11,
        };

        updatedNetworks.BSC_TESTNET = {
            ...updatedNetworks.BSC_TESTNET,
            order: 12,
        };

        updatedNetworks.POLYGON_TESTNET_MUMBAI = {
            ...updatedNetworks.POLYGON_TESTNET_MUMBAI,
            order: 13,
        };

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            order: 14,
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.17',
} as IMigration;
