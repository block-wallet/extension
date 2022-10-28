import { BigNumber } from 'ethers';
import { ContractMethodSignature } from '../transactions/ContractSignatureParser';
import { TransactionReceipt } from '@ethersproject/providers';

/**
 * List of known supported networks
 */
export enum AvailableNetworks {
    MAINNET = 'mainnet',
    GOERLI = 'goerli',
    POLYGON = 'polygon',
    BSC = 'bsc',
    xDAI = 'xdai',
    ARBITRUM = 'arbitrum',
    AVALANCHEC = 'avalanchec',
    OPTIMISM = 'optimism',
}

/**
 * List of known supported currencies
 */
export enum KnownCurrencies {
    ETH = 'eth',
    DAI = 'dai',
    cDAI = 'cdai',
    USDC = 'usdc',
    USDT = 'usdt',
    WBTC = 'wbtc',
    MATIC = 'matic',
    BNB = 'bnb',
    xDAI = 'xdai',
    AVAX = 'avax',
}

/**
 * List of known native supported currencies
 */
export type NativeKnownCurrencies =
    | KnownCurrencies.ETH
    | KnownCurrencies.MATIC
    | KnownCurrencies.AVAX
    | KnownCurrencies.xDAI
    | KnownCurrencies.BNB;

/**
 * List of known ERC20 supported currencies
 */
export type ERC20KnownCurrencies = Exclude<
    KnownCurrencies,
    NativeKnownCurrencies
>;

/**
 * Defines a type that associates each available currency with their respective amount types
 */
export type CurrencyAmountType = {
    eth: '0.1' | '1' | '10' | '100';
    dai: '100' | '1000' | '10000' | '100000';
    cdai: '5000' | '50000' | '500000' | '5000000';
    usdc: '100' | '1000';
    usdt: '100' | '1000';
    wbtc: '0.1' | '1' | '10';
    matic: '100' | '1000' | '10000' | '100000';
    bnb: '0.1' | '1' | '10' | '100';
    avax: '10' | '100' | '500';
    xdai: '100' | '1000' | '10000' | '100000';
};

// export type CurrencyAmountType = {
//     [currency in KnownCurrencies]: keyof typeof instances.currencies[currency]['instances'];
// };

/**
 * Type to match currencies with their specific
 * available deposits.
 *
 * FIXME: Change it to { currency: KnownCurrencies, amount: string }
 * when scaling supported currencies
 */
export type CurrencyAmountPair =
    | {
          currency: KnownCurrencies.ETH;
          amount: CurrencyAmountType[KnownCurrencies.ETH];
      }
    | {
          currency: KnownCurrencies.DAI;
          amount: CurrencyAmountType[KnownCurrencies.DAI];
      }
    | {
          currency: KnownCurrencies.cDAI;
          amount: CurrencyAmountType[KnownCurrencies.cDAI];
      }
    | {
          currency: KnownCurrencies.USDC;
          amount: CurrencyAmountType[KnownCurrencies.USDC];
      }
    | {
          currency: KnownCurrencies.USDT;
          amount: CurrencyAmountType[KnownCurrencies.USDT];
      }
    | {
          currency: KnownCurrencies.WBTC;
          amount: CurrencyAmountType[KnownCurrencies.WBTC];
      }
    | {
          currency: KnownCurrencies.MATIC;
          amount: CurrencyAmountType[KnownCurrencies.MATIC];
      }
    | {
          currency: KnownCurrencies.BNB;
          amount: CurrencyAmountType[KnownCurrencies.BNB];
      }
    | {
          currency: KnownCurrencies.xDAI;
          amount: CurrencyAmountType[KnownCurrencies.xDAI];
      }
    | {
          currency: KnownCurrencies.AVAX;
          amount: CurrencyAmountType[KnownCurrencies.AVAX];
      };

/**
 * Generic Currency/Amount dictionary type
 */
export type CurrencyAmountDict<T> = {
    [currency in KnownCurrencies]: {
        [amount in CurrencyAmountType[currency]]: T;
    };
};

/**
 * Blank deposits type organized by Currency and Amount
 */
export type AvailableBlankDeposits = CurrencyAmountDict<{
    count: number;
}>;

export enum DepositStatus {
    FAILED = 'FAILED',
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
}

export const CurrencyAmountArray: {
    [ccy in KnownCurrencies]: CurrencyAmountType[ccy][];
} = {
    eth: ['0.1', '1', '10', '100'],
    dai: ['100', '1000', '10000', '100000'],
    cdai: ['5000', '50000', '500000', '5000000'],
    usdc: ['100', '1000'],
    usdt: ['100', '1000'],
    wbtc: ['0.1', '1', '10'],
    matic: ['100', '1000', '10000', '100000'],
    bnb: ['0.1', '1', '10', '100'],
    avax: ['10', '100', '500'],
    xdai: ['100', '1000', '10000', '100000'],
};

export type CurrencyAmountArrayType = typeof CurrencyAmountArray;

/**
 * List of available currencies by chain
 */
export const CurrenciesByChain: {
    [chain in AvailableNetworks]: KnownCurrencies[];
} = {
    polygon: [KnownCurrencies.MATIC],
    arbitrum: [KnownCurrencies.ETH],
    optimism: [KnownCurrencies.ETH],
    avalanchec: [KnownCurrencies.AVAX],
    bsc: [KnownCurrencies.BNB],
    xdai: [KnownCurrencies.xDAI],
    goerli: [
        KnownCurrencies.ETH,
        KnownCurrencies.DAI,
        KnownCurrencies.ETH,
        KnownCurrencies.DAI,
        KnownCurrencies.cDAI,
        KnownCurrencies.USDC,
        KnownCurrencies.USDT,
        KnownCurrencies.WBTC,
    ],
    mainnet: [
        KnownCurrencies.ETH,
        KnownCurrencies.DAI,
        KnownCurrencies.ETH,
        KnownCurrencies.DAI,
        KnownCurrencies.cDAI,
        KnownCurrencies.USDC,
        KnownCurrencies.USDT,
        KnownCurrencies.WBTC,
    ],
};

/**
 * The amount of derivations forward to do as safeguard
 * for possible holes in the derivations due to chain reorganization
 */
export const DERIVATIONS_FORWARD = 10;

/**
 * Default Tornado deposits block confirmations
 */
export const DEFAULT_TORNADO_CONFIRMATION = 4;

/**
 * Default transaction receipt timeout
 */
export const DEFAULT_TX_RECEIPT_TIMEOUT = 60000;

//
export interface PrivacyControllerStoreState {
    pendingWithdrawals: PendingWithdrawalsStore;
    vaultState: { vault: string };
}
export enum PendingWithdrawalStatus {
    UNSUBMITTED = 'UNSUBMITTED',
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
    MINED = 'MINED',
}

export type PendingWithdrawal = {
    pendingId: string;
    relayerUrl: string;
    jobId: string;
    depositId: string;
    pair: CurrencyAmountPair;
    toAddress: string;
    time: number;
    fee?: BigNumber;
    decimals?: number;
    transactionReceipt?: TransactionReceipt;
    errMessage?: string;
    transactionHash?: string;
    status?: PendingWithdrawalStatus;
    statusMessage?: string;
    chainId: number;
    data?: string;
    methodSignature?: ContractMethodSignature;
    value?: BigNumber;
    nonce?: number;
    gasLimit?: BigNumber;
    gasPrice?: BigNumber;
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
};

export type PendingWithdrawalsStore = {
    [network in AvailableNetworks]: {
        pending: PendingWithdrawal[];
    };
};

export type PairCount = {
    pair: CurrencyAmountPair;
    count: number;
}[];

export interface PrivacyControllerUIStoreState {
    previousWithdrawals: {
        depositId: string;
        time: number;
        pair: CurrencyAmountPair;
    }[];
    depositsCount: {
        [key in KnownCurrencies]?: PairCount;
    };
    pendingWithdrawals: PendingWithdrawal[];
    pendingDeposits: {
        [currency in KnownCurrencies]?: {
            [amount in CurrencyAmountType[currency]]: boolean;
        };
    };
    isVaultInitialized: boolean;
    isImportingDeposits: boolean;
    areDepositsPending: boolean;
    areWithdrawalsPending: boolean;
    importingErrors: string[];
}
