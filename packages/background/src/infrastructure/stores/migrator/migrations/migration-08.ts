import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../../../utils/constants/networks';
import { IMigration } from '../IMigration';

/**
 * This migration changes the endpoint for the polygon network
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.BSC_TESTNET = {
            ...updatedNetworks.BSC_TESTNET,
            enable: true,
            order: 10,
        };

        updatedNetworks.POLYGON = {
            ...updatedNetworks.POLYGON,
            gasLowerCap: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            } as any,
        };

        updatedNetworks.POLYGON_TESTNET_MUMBAI = {
            name: 'polygon_testnet_mumbai',
            desc: 'Polygon Mumbai',
            chainId: 80001,
            networkVersion: '80001',
            nativeCurrency: {
                name: 'Matic',
                symbol: 'MATIC',
                decimals: 18,
            },
            iconUrls: [
                'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/polygon/info/logo.png',
            ],
            isCustomNetwork: false,
            gasLowerCap: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            } as any,
            enable: true,
            test: true,
            order: 11,
            features: ['sends'],
            ens: false,
            showGasLevels: true,
            rpcUrls: [`https://matic-mumbai.chainstacklabs.com`],
            blockExplorerUrls: ['https://mumbai.polygonscan.com'],
            etherscanApiUrl: 'https://mumbai.polygonscan.com',
            actionsTimeIntervals: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
            nativelySupported: true,
        } as any;

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            order: 12,
        };

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.1.15',
} as IMigration;
