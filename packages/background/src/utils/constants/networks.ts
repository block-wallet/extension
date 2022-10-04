import { BigNumber } from '@ethersproject/bignumber';
import { BlankSupportedFeatures, FEATURES } from './features';
import { Duration, MINUTE, SECOND } from './time';
import {
    DEFAULT_TORNADO_CONFIRMATION,
    DERIVATIONS_FORWARD,
} from '../../controllers/blank-deposit/types';

export type TornadoIntervals = {
    depositConfirmations: number;
    derivationsForward: number;
};

export type Network = {
    name: string;
    desc: string;
    chainId: number;
    networkVersion: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    isCustomNetwork?: boolean;
    iconUrls?: string[];
    enable: boolean;
    features: BlankSupportedFeatures[];
    test: boolean;
    order: number;
    ens: boolean;
    showGasLevels: boolean;
    gasLowerCap?: {
        baseFee?: BigNumber;
        maxPriorityFeePerGas?: BigNumber;
        gasPrice?: BigNumber;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    blockExplorerName?: string;
    etherscanApiUrl?: string;
    actionsTimeIntervals: ActionsTimeInterval;
    tornadoIntervals?: TornadoIntervals;

    /**
     * Indicates whether the network is natively supported
     * by the app or has been added by the user.
     */
    nativelySupported: boolean;
};

export interface AddNetworkType {
    /**
     * Network chain ID
     *
     * Should be of type number
     */
    chainId: number;
    chainName?: string;
    blockExplorerUrls?: string[];
    iconUrls?: string[];

    /**
     * The chain native currency.
     * Only `symbol` is required, decimals and name will be populated
     * from the list or defaulted.
     */
    nativeCurrency?: {
        symbol: string;
        name?: string;
        decimals?: number;
    };
    rpcUrls?: string[];
    test: boolean;
}

export interface EditNetworkUpdatesType {
    blockExplorerUrls?: string[];
    rpcUrls?: string[];
    name: string;
}

export interface ActionsTimeInterval {
    blockNumberPull: Duration; // wait between block pulls
    balanceFetch: Duration; // native and watched tokens balance feth
    gasPricesUpdate: Duration; // fee's data update
    exchangeRatesFetch: Duration; // exchange rates fetch
    transactionsStatusesUpdate: Duration; // active transactions statuses update
    providerSubscriptionsUpdate: Duration; // dapp subscribed to new heads or logs update
    transactionWatcherUpdate: Duration; // transactions watcher
}

// If the interval is < than blockNumberPull the action will happend 'every new block'.
export const ACTIONS_TIME_INTERVALS_DEFAULT_VALUES = {
    blockNumberPull: 10 * SECOND,
    balanceFetch: 30 * SECOND,
    gasPricesUpdate: 8 * SECOND,
    exchangeRatesFetch: 1 * MINUTE,
    transactionsStatusesUpdate: 8 * SECOND,
    providerSubscriptionsUpdate: 8 * SECOND,
    transactionWatcherUpdate: 45 * SECOND,
};

export const FAST_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 4 * SECOND,
        balanceFetch: 20 * SECOND,
        gasPricesUpdate: 3 * SECOND,
        transactionsStatusesUpdate: 3 * SECOND,
        providerSubscriptionsUpdate: 3 * SECOND,
        transactionWatcherUpdate: 30 * SECOND,
    },
};

export const TESTNET_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 20 * SECOND,
        balanceFetch: 1 * MINUTE,
        gasPricesUpdate: 19 * SECOND,
        transactionsStatusesUpdate: 19 * SECOND,
        providerSubscriptionsUpdate: 19 * SECOND,
        transactionWatcherUpdate: 1 * MINUTE,
    },
};

export type Networks = {
    [key: string]: Network;
};

export const INITIAL_NETWORKS: Networks = {
    MAINNET: {
        name: 'mainnet',
        desc: 'Ethereum Mainnet',
        chainId: 1,
        networkVersion: '1',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: false,
        enable: true,
        test: false,
        order: 1,
        features: [FEATURES.SENDS, FEATURES.SWAPS, FEATURES.TORNADO],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://mainnet-node.blockwallet.io`],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api.etherscan.io',
        actionsTimeIntervals: {
            ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    ARBITRUM: {
        name: 'arbitrum',
        desc: 'Arbitrum Mainnet',
        chainId: 42161,
        networkVersion: '42161',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: true,
        enable: true,
        test: false,
        order: 2,
        features: [FEATURES.SENDS, FEATURES.SWAPS],
        ens: false,
        showGasLevels: false,
        rpcUrls: ['https://arbitrum-node.blockwallet.io'],
        blockExplorerUrls: ['https://arbiscan.io'],
        blockExplorerName: 'Arbiscan',
        etherscanApiUrl: 'https://api.arbiscan.io',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    OPTIMISM: {
        name: 'optimism',
        desc: 'Optimism Mainnet',
        chainId: 10,
        networkVersion: '10',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: true,
        enable: false,
        test: false,
        order: 3,
        features: [FEATURES.SENDS, FEATURES.SWAPS],
        ens: false,
        showGasLevels: false,
        rpcUrls: ['https://optimism-node.blockwallet.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api-optimistic.etherscan.io',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    BSC: {
        name: 'bsc',
        desc: 'BNB Chain Mainnet',
        chainId: 56,
        networkVersion: '56',
        nativeCurrency: {
            name: 'BNB Chain Native Token',
            symbol: 'BNB',
            decimals: 18,
        },
        isCustomNetwork: false,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/smartchain/info/logo.png',
        ],
        enable: true,
        test: false,
        order: 4,
        features: [FEATURES.SENDS, FEATURES.SWAPS, FEATURES.TORNADO],
        ens: false,
        showGasLevels: true,
        rpcUrls: ['https://bsc-node.blockwallet.io'],
        blockExplorerUrls: ['https://bscscan.com'],
        blockExplorerName: 'Bscscan',
        etherscanApiUrl: 'https://api.bscscan.com',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: 18, // We wait 18 blocks that it's the same time as it'll take on mainnet considering each chain avg block time
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    POLYGON: {
        name: 'polygon',
        desc: 'Polygon Mainnet',
        chainId: 137,
        networkVersion: '137',
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
            maxPriorityFeePerGas: BigNumber.from('0x6fc23ac00'), // 30 GWEI,
        },
        enable: true,
        test: false,
        order: 5,
        features: [FEATURES.SENDS, FEATURES.TORNADO, FEATURES.SWAPS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://polygon-node.blockwallet.io`],
        blockExplorerUrls: ['https://polygonscan.com'],
        blockExplorerName: 'Polygonscan',
        etherscanApiUrl: 'https://api.polygonscan.com',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: 128, // We wait 128 blocks for safety purposes, as polygon chain reorgs can be very deep
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    AVALANCHEC: {
        name: 'avalanchec',
        desc: 'Avalanche Network',
        chainId: 43114,
        networkVersion: '43114',
        nativeCurrency: {
            name: 'AVAX',
            symbol: 'AVAX',
            decimals: 18,
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/avalanchec/info/logo.png',
        ],
        isCustomNetwork: false,
        gasLowerCap: {
            baseFee: BigNumber.from('0x5d21dba00'), // 25 GWEI,
        },
        enable: true,
        test: false,
        order: 6,
        features: [FEATURES.SENDS, FEATURES.SWAPS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://avax-node.blockwallet.io`],
        blockExplorerUrls: ['https://snowtrace.io/'],
        blockExplorerName: 'Snowtrace',
        etherscanApiUrl: 'https://api.snowtrace.io/',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    FANTOM: {
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
        enable: true,
        test: false,
        order: 7,
        features: [FEATURES.SENDS, FEATURES.SWAPS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://fantom-node.blockwallet.io`],
        blockExplorerUrls: ['https://ftmscan.com'],
        blockExplorerName: 'FTMScan',
        etherscanApiUrl: 'https://api.ftmscan.com',
        actionsTimeIntervals: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    XDAI: {
        name: 'xdai',
        desc: 'Gnosis',
        chainId: 100,
        networkVersion: '100',
        nativeCurrency: {
            name: 'xDAI',
            symbol: 'xDAI',
            decimals: 18,
        },
        isCustomNetwork: true,
        enable: false,
        test: false,
        order: 8,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/xdai/assets/0x/logo.png',
        ],
        rpcUrls: ['https://xdai-node.blockwallet.io'],
        blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
        blockExplorerName: 'Blockscout',
        etherscanApiUrl: 'https://api-gnosis.etherscan.io',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    GOERLI: {
        name: 'goerli',
        desc: 'Goerli Testnet',
        chainId: 5,
        networkVersion: '5',
        nativeCurrency: {
            name: 'Görli Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: false,
        enable: true,
        test: true,
        order: 9,
        features: [FEATURES.SENDS, FEATURES.TORNADO],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://goerli-node.blockwallet.io`],
        blockExplorerUrls: ['https://goerli.etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api-goerli.etherscan.io',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    ROPSTEN: {
        name: 'ropsten',
        desc: 'Ropsten Testnet',
        chainId: 3,
        networkVersion: '3',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: false,
        enable: false,
        test: true,
        order: 10,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://ropsten-node.blockwallet.io`],
        blockExplorerUrls: ['https://ropsten.etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api-ropsten.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    KOVAN: {
        name: 'kovan',
        desc: 'Kovan Testnet',
        chainId: 42,
        networkVersion: '42',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: false,
        enable: false,
        test: true,
        order: 11,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://kovan-node.blockwallet.io`],
        blockExplorerUrls: ['https://kovan.etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api-kovan.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    RINKEBY: {
        name: 'rinkeby',
        desc: 'Rinkeby Testnet',
        chainId: 4,
        networkVersion: '4',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: false,
        enable: false,
        test: true,
        order: 12,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://rinkeby-node.blockwallet.io`],
        blockExplorerUrls: ['https://rinkeby.etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api-rinkeby.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    BSC_TESTNET: {
        name: 'bsc_testnet',
        desc: 'BNB Chain Testnet',
        chainId: 97,
        networkVersion: '97',
        nativeCurrency: {
            name: 'BNB Chain Native Token',
            symbol: 'BNB',
            decimals: 18,
        },
        isCustomNetwork: false,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/smartchain/info/logo.png',
        ],
        enable: true,
        test: true,
        order: 13,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.io'],
        blockExplorerName: 'Bscscan',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    POLYGON_TESTNET_MUMBAI: {
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
        enable: true,
        test: true,
        order: 14,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://matic-mumbai.chainstacklabs.com`],
        blockExplorerUrls: ['https://mumbai.polygonscan.com'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://mumbai.polygonscan.com',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    ZKSYNC_ALPHA_TESTNET: {
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
        blockExplorerUrls: ['https://zksync2-testnet.zkscan.io'],
        blockExplorerName: 'zkScan',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    LOCALHOST: {
        name: 'localhost',
        desc: 'Localhost 8545',
        chainId: 31337,
        networkVersion: '31337',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: true,
        enable: true,
        test: true,
        order: 16,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        rpcUrls: ['http://localhost:8545'],
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
};

export const HARDFORKS = {
    BERLIN: 'berlin',
    LONDON: 'london',
};
