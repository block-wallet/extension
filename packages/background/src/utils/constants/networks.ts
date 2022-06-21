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
    etherscanApiUrl?: string;
    actionsTimeIntervals: ActionsTimeInterval;
    tornadoIntervals?: TornadoIntervals;
};

export interface ActionsTimeInterval {
    blockNumberPull: Duration; // wait between block pulls
    balanceFetch: Duration; // native and watched tokens balance feth
    gasPricesUpdate: Duration; // fee's data update
    exchangeRatesFetch: Duration; // exchange rates fetch
    incomingTransactionsUpdate: Duration; // incoming transactions update
    transactionsStatusesUpdate: Duration; // active transactions statuses update
    providerSubscriptionsUpdate: Duration; // dapp subscribed to new heads or logs update
    erc20TransactionWatcherUpdate: Duration; // erc20 transactions watcher
}

// If the interval is < than blockNumberPull the action will happend 'every new block'.
export const ACTIONS_TIME_INTERVALS_DEFAULT_VALUES = {
    blockNumberPull: 10 * SECOND,
    balanceFetch: 20 * SECOND,
    gasPricesUpdate: 8 * SECOND,
    exchangeRatesFetch: 1 * MINUTE,
    incomingTransactionsUpdate: 20 * SECOND,
    transactionsStatusesUpdate: 8 * SECOND,
    providerSubscriptionsUpdate: 8 * SECOND,
    erc20TransactionWatcherUpdate: 30 * SECOND,
};

const FAST_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 4 * SECOND,
        balanceFetch: 8 * SECOND,
        gasPricesUpdate: 3 * SECOND,
        incomingTransactionsUpdate: 8 * SECOND,
        transactionsStatusesUpdate: 3 * SECOND,
        providerSubscriptionsUpdate: 3 * SECOND,
        erc20TransactionWatcherUpdate: 15 * SECOND,
    },
};

const TESTNET_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 20 * SECOND,
        balanceFetch: 30 * SECOND,
        gasPricesUpdate: 19 * SECOND,
        incomingTransactionsUpdate: 40 * SECOND,
        transactionsStatusesUpdate: 19 * SECOND,
        providerSubscriptionsUpdate: 19 * SECOND,
        erc20TransactionWatcherUpdate: 40 * SECOND,
    },
};

// TODO: Replace networks object to store them by chainId instead of by name
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
        etherscanApiUrl: 'https://api.etherscan.io',
        actionsTimeIntervals: {
            ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        etherscanApiUrl: 'https://api.arbiscan.io',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        rpcUrls: ['https://optimism-node.blockwallet.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
        etherscanApiUrl: 'https://api-optimistic.etherscan.io',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        etherscanApiUrl: 'https://api.bscscan.com',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: 18, // We wait 18 blocks that it's the same time as it'll take on mainnet considering each chain avg block time
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        features: [FEATURES.SENDS, FEATURES.TORNADO],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://polygon-node.blockwallet.io`],
        blockExplorerUrls: ['https://polygonscan.com'],
        etherscanApiUrl: 'https://api.polygonscan.com',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: 128, // We wait 128 blocks for safety purposes, as polygon chain reorgs can be very deep
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://avax-node.blockwallet.io`],
        blockExplorerUrls: ['https://snowtrace.io/'],
        etherscanApiUrl: 'https://api.snowtrace.io/',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
        },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://fantom-node.blockwallet.io`],
        blockExplorerUrls: ['https://ftmscan.com'],
        etherscanApiUrl: 'https://api.ftmscan.com',
        actionsTimeIntervals: { ...FAST_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 8,
        features: [FEATURES.SENDS, FEATURES.TORNADO],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://goerli-node.blockwallet.io`],
        blockExplorerUrls: ['https://goerli.etherscan.io'],
        etherscanApiUrl: 'https://api-goerli.etherscan.io',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 9,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://ropsten-node.blockwallet.io`],
        blockExplorerUrls: ['https://ropsten.etherscan.io'],
        etherscanApiUrl: 'https://api-ropsten.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 10,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://kovan-node.blockwallet.io`],
        blockExplorerUrls: ['https://kovan.etherscan.io'],
        etherscanApiUrl: 'https://api-kovan.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 11,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        rpcUrls: [`https://rinkeby-node.blockwallet.io`],
        blockExplorerUrls: ['https://rinkeby.etherscan.io'],
        etherscanApiUrl: 'https://api-rinkeby.etherscan.io',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 12,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.io'],
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
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
        order: 13,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        rpcUrls: [`https://matic-mumbai.chainstacklabs.com`],
        blockExplorerUrls: ['https://mumbai.polygonscan.com'],
        etherscanApiUrl: 'https://mumbai.polygonscan.com',
        actionsTimeIntervals: { ...TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
    },
    LOCALHOST: {
        name: 'localhost',
        desc: 'Localhost 8545',
        chainId: 1337,
        networkVersion: '1337',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        isCustomNetwork: true,
        enable: true,
        test: true,
        order: 14,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        rpcUrls: ['http://localhost:8545'],
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
    },
};

export const HARDFORKS = {
    BERLIN: 'berlin',
    LONDON: 'london',
};
