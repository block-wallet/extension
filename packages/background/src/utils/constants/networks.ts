import { BigNumber } from '@ethersproject/bignumber';
import { BlankSupportedFeatures, FEATURES } from './features';
import { Duration, MINUTE, SECOND } from './time';
import {
    DEFAULT_TORNADO_CONFIRMATION,
    DERIVATIONS_FORWARD,
} from '../../controllers/privacy/types';

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
        logo?: string; // Used if the native currency logo is different from network logo
    };
    hasFixedGasCost?: boolean;
    iconUrls?: string[]; // Network logo
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
    currentRpcUrl: string;
    defaultRpcUrl?: string;
    backupRpcUrls?: string[];
    blockExplorerUrls?: string[];
    blockExplorerName?: string;
    etherscanApiUrl?: string;
    actionsTimeIntervals: ActionsTimeInterval;
    tornadoIntervals?: TornadoIntervals;
    rpcUrls?: string[];

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
        logo?: string;
    };
    rpcUrls?: string[];
    test: boolean;
}

export interface EditNetworkUpdatesType {
    blockExplorerUrls?: string[];
    rpcUrls?: string[];
    name: string;
    test: boolean;
}

export type EditNetworkOrderType = Pick<Network, 'chainId' | 'order'>;

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
    blockNumberPull: 45 * SECOND,
    balanceFetch: 80 * SECOND,
    gasPricesUpdate: 30 * SECOND,
    exchangeRatesFetch: 1 * MINUTE,
    transactionsStatusesUpdate: 15 * SECOND,
    providerSubscriptionsUpdate: 15 * SECOND,
    transactionWatcherUpdate: 90 * SECOND,
};

export const FAST_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 20 * SECOND,
        balanceFetch: 30 * SECOND,
        gasPricesUpdate: 10 * SECOND,
        transactionsStatusesUpdate: 6 * SECOND,
        providerSubscriptionsUpdate: 6 * SECOND,
        transactionWatcherUpdate: 45 * SECOND,
    },
};

export const TESTNET_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 30 * SECOND,
        balanceFetch: 1 * MINUTE,
        gasPricesUpdate: 19 * SECOND,
        transactionsStatusesUpdate: 19 * SECOND,
        providerSubscriptionsUpdate: 19 * SECOND,
        transactionWatcherUpdate: 1 * MINUTE,
    },
};

export const SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES = {
    ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    ...{
        blockNumberPull: 40 * SECOND,
        balanceFetch: 1 * MINUTE,
        gasPricesUpdate: 29 * SECOND,
        transactionsStatusesUpdate: 29 * SECOND,
        providerSubscriptionsUpdate: 29 * SECOND,
        transactionWatcherUpdate: 2 * MINUTE,
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
        hasFixedGasCost: true,
        enable: true,
        test: false,
        order: 1,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        currentRpcUrl: `https://mainnet-node.blockwallet.io`,
        defaultRpcUrl: `https://mainnet-node.blockwallet.io`,
        backupRpcUrls: [
            'https://mainnet.blockwallet.io',
            'https://rpc.ankr.com/eth/',
        ],
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerName: 'Etherscan',
        etherscanApiUrl: 'https://api.etherscan.io',
        actionsTimeIntervals: {
            ...FAST_TIME_INTERVALS_DEFAULT_VALUES,
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
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 2,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: 'https://arbitrum-node.blockwallet.io',
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/arbitrum/info/logo.png',
        ],
        defaultRpcUrl: 'https://arbitrum-node.blockwallet.io',
        backupRpcUrls: [
            'https://arbitrum.blockwallet.io',
            'https://rpc.ankr.com/arbitrum',
        ],
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
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        hasFixedGasCost: false,
        gasLowerCap: {
            gasPrice: BigNumber.from('1000000'),
        },
        enable: true,
        test: false,
        order: 3,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: 'https://optimism-node.blockwallet.io',
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/optimism/info/logo.png',
        ],
        defaultRpcUrl: 'https://optimism-node.blockwallet.io',
        backupRpcUrls: [
            'https://optimism.blockwallet.io',
            'https://rpc.ankr.com/optimism/',
        ],
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
        hasFixedGasCost: true,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/smartchain/info/logo.png',
        ],
        enable: true,
        test: false,
        order: 4,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: 'https://bsc-node.blockwallet.io',
        defaultRpcUrl: 'https://bsc-node.blockwallet.io',
        backupRpcUrls: [
            'https://bsc.blockwallet.io',
            'https://rpc.ankr.com/bsc/',
        ],
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
        gasLowerCap: {
            maxPriorityFeePerGas: BigNumber.from('3000000000'), // 3 GWEI,
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
        hasFixedGasCost: true,
        gasLowerCap: {
            maxPriorityFeePerGas: BigNumber.from('0x6fc23ac00'), // 30 GWEI,
        },
        enable: true,
        test: false,
        order: 5,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: `https://polygon-node.blockwallet.io`,
        defaultRpcUrl: `https://polygon-node.blockwallet.io`,
        backupRpcUrls: [
            'https://polygon.blockwallet.io',
            'https://rpc.ankr.com/polygon/',
        ],
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
        hasFixedGasCost: true,
        gasLowerCap: {
            baseFee: BigNumber.from('0x5d21dba00'), // 25 GWEI,
        },
        enable: true,
        test: false,
        order: 6,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: `https://avax-node.blockwallet.io`,
        defaultRpcUrl: `https://avax-node.blockwallet.io`,
        backupRpcUrls: [
            'https://avax.blockwallet.io',
            'https://rpc.ankr.com/avalanche/',
        ],
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
        hasFixedGasCost: true,
        enable: true,
        test: false,
        order: 7,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: `https://fantom-node.blockwallet.io`,
        defaultRpcUrl: `https://fantom-node.blockwallet.io`,
        backupRpcUrls: [
            'https://fantom.blockwallet.io',
            'https://rpc.ankr.com/fantom/',
        ],
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
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/xdai/assets/0x/logo.png',
        },
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 8,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/xdai/info/logo.png',
        ],
        currentRpcUrl: 'https://xdai-node.blockwallet.io',
        defaultRpcUrl: 'https://xdai-node.blockwallet.io',
        backupRpcUrls: [
            'https://xdai.blockwallet.io',
            'https://rpc.ankr.com/gnosis/',
        ],
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
    RSK: {
        name: 'rsk',
        desc: 'Rootstock',
        chainId: 30,
        networkVersion: '30',
        nativeCurrency: {
            name: 'Smart Bitcoin',
            symbol: 'RBTC',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/rsk/assets/0x/logo.png',
        },
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 9,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false, // "Slow" gas level might be lower than the minimumGasPrice so the tx will be rejected
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/rsk/info/logo.png',
        ],
        currentRpcUrl: 'https://rsk-node.blockwallet.io',
        defaultRpcUrl: 'https://rsk-node.blockwallet.io',
        backupRpcUrls: [
            'https://rsk.blockwallet.io',
            'https://public-node.rsk.co	',
        ],
        blockExplorerName: 'RSK Explorer',
        blockExplorerUrls: ['https://explorer.rsk.co'],
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    ZKSYNC_ERA_MAINNET: {
        name: 'zksync_era_mainnet',
        desc: 'zkSync Era Mainnet',
        chainId: 324,
        networkVersion: '324',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zksync/info/logo.png',
        ],
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 10,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: `https://zksync-node.blockwallet.io`,
        defaultRpcUrl: `https://zksync-node.blockwallet.io`,
        backupRpcUrls: [
            'https://zksync.blockwallet.io',
            'https://mainnet.era.zksync.io',
        ],
        blockExplorerUrls: ['https://explorer.zksync.io/'],
        blockExplorerName: 'zkSync Explorer',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    POLYGON_ZKEVM: {
        name: 'polygon_zkevm',
        desc: 'Polygon zkEVM',
        chainId: 1101,
        networkVersion: '1101',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/polygonzkevm/info/logo.png',
        ],
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 11,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: `https://polygon-zkevm-node.blockwallet.io`,
        defaultRpcUrl: `https://polygon-zkevm-node.blockwallet.io`,
        backupRpcUrls: [
            'https://polygon-zkevm.blockwallet.io',
            'https://rpc.ankr.com/polygon_zkevm',
        ],
        blockExplorerUrls: ['https://zkevm.polygonscan.com/'],
        blockExplorerName: 'Polygon zkEVM Explorer',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    SCROLL_MAINNET: {
        name: 'scroll_mainnet',
        desc: 'Scroll',
        chainId: 534352,
        networkVersion: '534352',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
        ],
        hasFixedGasCost: false,
        enable: true,
        test: false,
        order: 12,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: 'https://scroll-node.blockwallet.io',
        defaultRpcUrl: 'https://scroll-node.blockwallet.io',
        backupRpcUrls: [
            'https://scroll.blockwallet.io',
            'https://rpc.scroll.io/',
        ],
        blockExplorerName: 'Scroll Blockchain Explorer',
        blockExplorerUrls: ['https://scrollscan.com/'],
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
        hasFixedGasCost: true,
        enable: true,
        test: true,
        order: 1,
        features: [FEATURES.SENDS],
        ens: true,
        showGasLevels: true,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        ],
        currentRpcUrl: `https://goerli-node.blockwallet.io`,
        defaultRpcUrl: `https://goerli-node.blockwallet.io`,
        backupRpcUrls: [
            'https://goerli.blockwallet.io',
            'https://rpc.ankr.com/eth_goerli',
        ],
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
    BSC_TESTNET: {
        name: 'bsc_testnet',
        desc: 'BNB Chain Testnet',
        chainId: 97,
        networkVersion: '97',
        nativeCurrency: {
            name: 'BNB Chain Native Token',
            symbol: 'tBNB',
            decimals: 18,
        },
        hasFixedGasCost: true,
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/smartchain/info/logo.png',
        ],
        enable: true,
        test: true,
        order: 5,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
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
        hasFixedGasCost: true,
        enable: true,
        test: true,
        order: 6,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: true,
        currentRpcUrl: `https://matic-mumbai.chainstacklabs.com`,
        blockExplorerUrls: ['https://mumbai.polygonscan.com'],
        blockExplorerName: 'Polygonscan',
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
        desc: 'zkSync Era Testnet',
        chainId: 280,
        networkVersion: '280',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/zksync/info/logo.png',
        ],
        hasFixedGasCost: false,
        enable: true,
        test: true,
        order: 7,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: `https://zksync-testnet-node.blockwallet.io`,
        defaultRpcUrl: `https://zksync-testnet-node.blockwallet.io`,
        backupRpcUrls: [
            'https://zksync-testnet.blockwallet.io',
            'https://testnet.era.zksync.dev',
        ],
        blockExplorerUrls: ['https://goerli.explorer.zksync.io'],
        blockExplorerName: 'zkSync Testnet Explorer',
        actionsTimeIntervals: { ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    SCROLL_L2_TESTNET: {
        name: 'scroll_l2_testnet',
        desc: 'Scroll Sepolia Testnet',
        chainId: 534351,
        networkVersion: '534351',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        iconUrls: [
            'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/scroll/info/logo.png',
        ],
        hasFixedGasCost: false,
        enable: true,
        test: true,
        order: 9,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: `https://sepolia-rpc.scroll.io/`,
        defaultRpcUrl: `https://sepolia-rpc.scroll.io/`,
        backupRpcUrls: ['https://rpc.ankr.com/scroll_sepolia_testnet/'],
        blockExplorerUrls: ['https://sepolia.scrollscan.com/'],
        blockExplorerName: 'Scroll Sepolia Explorer',
        actionsTimeIntervals: { ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    X1_TESTNET: {
        name: 'X1_Testnet',
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
        blockExplorerUrls: ['https://www.oklink.com/x1-test'],
        blockExplorerName: 'X1 Testnet Explorer',
        actionsTimeIntervals: { ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
    ZETACHAIN_TESTNET: {
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
        actionsTimeIntervals: { ...SLOW_TESTNET_TIME_INTERVALS_DEFAULT_VALUES },
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
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png',
        },
        hasFixedGasCost: false,
        enable: true,
        test: true,
        order: 11,
        features: [FEATURES.SENDS],
        ens: false,
        showGasLevels: false,
        currentRpcUrl: 'http://localhost:8545',
        actionsTimeIntervals: { ...ACTIONS_TIME_INTERVALS_DEFAULT_VALUES },
        tornadoIntervals: {
            depositConfirmations: DEFAULT_TORNADO_CONFIRMATION,
            derivationsForward: DERIVATIONS_FORWARD,
        },
        nativelySupported: true,
    },
};
