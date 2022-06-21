import {
    KeyringControllerState,
    KeyringControllerMemState,
} from 'eth-keyring-controller';
import { ValuesOf } from '../types/helpers';
import { IObservableStore } from '../../infrastructure/stores/ObservableStore';

import { AccountTrackerState } from '../../controllers/AccountTrackerController';
import {
    AppStateControllerMemState,
    AppStateControllerState,
} from '../../controllers/AppStateController';
import { OnboardingControllerState } from '../../controllers/OnboardingController';
import { PreferencesControllerState } from '../../controllers/PreferencesController';
import {
    BlankDepositControllerStoreState,
    BlankDepositControllerUIStoreState,
} from '../../controllers/blank-deposit/BlankDepositController';
import { ExchangeRatesControllerState } from '../../controllers/ExchangeRatesController';
import { GasPricesControllerState } from '../../controllers/GasPricesController';
import { BigNumber } from '@ethersproject/bignumber';

import { TokenControllerState } from '../../controllers/erc-20/TokenController';
import { IncomingTransactionControllerState } from '../../controllers/IncomingTransactionController';
import { INITIAL_NETWORKS } from './networks';
import { IActivityListState } from '../../controllers/ActivityListController';
import { PermissionsControllerState } from '../../controllers/PermissionsController';

import {
    AddressBook,
    AddressBookControllerMemState,
} from '@block-wallet/background/controllers/AddressBookController';
import { BlankProviderControllerState } from '@block-wallet/background/controllers/BlankProviderController';
import {
    IAccountTokens,
    INetworkTokens,
} from '@block-wallet/background/controllers/erc-20/Token';
import { NetworkControllerState } from '../../controllers/NetworkController';
import { BlockUpdatesControllerState } from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import {
    TransactionControllerState,
    TransactionVolatileControllerState,
} from '@block-wallet/background/controllers/transactions/TransactionController';
import {
    BlockFetchControllerState,
    BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
} from '../../controllers/block-updates/BlockFetchController';
import { ERC20TransactionWatcherControllerState } from '@block-wallet/background/controllers/erc-20/TransactionWatcherController';
import { SIGN_TRANSACTION_TIMEOUT } from './time';

export type BlankAppState = {
    AccountTrackerController: AccountTrackerState;
    AppStateController: AppStateControllerState;
    KeyringController: KeyringControllerState;
    OnboardingController: OnboardingControllerState;
    PreferencesController: PreferencesControllerState;
    TransactionController: TransactionControllerState;
    BlankDepositController: BlankDepositControllerStoreState;
    BlockUpdatesController: BlockUpdatesControllerState;
    ExchangeRatesController: ExchangeRatesControllerState;
    GasPricesController: GasPricesControllerState;
    IncomingTransactionController: IncomingTransactionControllerState;
    TokenController: TokenControllerState;
    PermissionsController: PermissionsControllerState;
    NetworkController: NetworkControllerState;
    AddressBookController: AddressBookControllerMemState;
    BlockFetchController: BlockFetchControllerState;
    ERC20TransactionWatcherControllerState: ERC20TransactionWatcherControllerState;
};

export type BlankAppUIState = {
    AccountTrackerController: AccountTrackerState;
    AppStateController: AppStateControllerMemState;
    KeyringController: KeyringControllerMemState;
    OnboardingController: OnboardingControllerState;
    PreferencesController: PreferencesControllerState;
    TransactionController: TransactionVolatileControllerState;
    BlankDepositController: BlankDepositControllerUIStoreState;
    BlockUpdatesController: BlockUpdatesControllerState;
    ExchangeRatesController: ExchangeRatesControllerState;
    GasPricesController: GasPricesControllerState;
    IncomingTransactionController: IncomingTransactionControllerState;
    ActivityListController: IActivityListState;
    TokenController: TokenControllerState;
    PermissionsController: PermissionsControllerState;
    NetworkController: NetworkControllerState;
    AddressBookController: AddressBookControllerMemState;
    BlankProviderController: BlankProviderControllerState;
};

export type BlankAppStoreConfig<S> = {
    [controller in keyof Partial<S>]: IObservableStore<ValuesOf<S>>;
};

const initialState: BlankAppState = {
    ERC20TransactionWatcherControllerState: {
        transactions: {},
    } as ERC20TransactionWatcherControllerState,
    BlockFetchController: {
        blockFetchData: {
            1: {
                offChainSupport: false,
                checkingOffChainSupport: false,
                currentBlockNumber: 0,
                lastBlockOffChainChecked:
                    -1 * BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
            },
        },
    },
    AddressBookController: {
        addressBook: {} as AddressBook,
        recentAddresses: {} as AddressBook,
    },
    AccountTrackerController: {
        accounts: {},
        hiddenAccounts: {},
        isAccountTrackerLoading: false,
    },
    AppStateController: {
        idleTimeout: 5,
    },
    BlockUpdatesController: { blockData: {} },
    KeyringController: {
        isUnlocked: false,
        keyringTypes: [],
        keyrings: [],
        vault: '',
    },
    OnboardingController: {
        isOnboarded: false,
        isSeedPhraseBackedUp: false,
    },
    PreferencesController: {
        selectedAddress: '',
        showWelcomeMessage: false,
        showDefaultWalletPreferences: false,
        localeInfo: 'en-US',
        nativeCurrency: 'usd',
        showTestNetworks: false,
        antiPhishingImage: '',
        popupTab: 'activity',
        settings: {
            hideAddressWarning: false, // Shown by default,
            subscribedToReleaseaNotes: true,
            useAntiPhishingProtection: true,
            defaultBrowserWallet: true,
            hideEstimatedGasExceedsThresholdWarning: false, // Shown by default,
            hideDepositsExternalAccountsWarning: false,
        },
        releaseNotesSettings: {
            lastVersionUserSawNews: '0.1.3',
            latestReleaseNotes: [],
        },
        filters: {
            account: [],
        },
    },
    TransactionController: {
        transactions: [],
        txSignTimeout: SIGN_TRANSACTION_TIMEOUT,
    },
    BlankDepositController: {
        vaultState: { vault: '' },
        pendingWithdrawals: {
            mainnet: { pending: [] },
            goerli: { pending: [] },
            polygon: { pending: [] },
            arbitrum: { pending: [] },
            optimism: { pending: [] },
            avalanchec: { pending: [] },
            bsc: { pending: [] },
            xdai: { pending: [] },
        },
    },
    NetworkController: {
        selectedNetwork: 'mainnet',
        availableNetworks: INITIAL_NETWORKS,
        isNetworkChanging: false,
        isUserNetworkOnline: true,
        isProviderNetworkOnline: true,
        isEIP1559Compatible: {},
    },
    ExchangeRatesController: {
        exchangeRates: { ETH: 0 },
        networkNativeCurrency: {
            symbol: 'ETH',
            // Default Coingecko id for ETH rates
            coingeckoPlatformId: 'ethereum',
        },
    },
    GasPricesController: {
        gasPriceData: {
            1: {
                blockGasLimit: BigNumber.from(0),
                gasPricesLevels: {
                    average: {
                        gasPrice: null,
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                    },
                    fast: {
                        gasPrice: null,
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                    },
                    slow: {
                        gasPrice: null,
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                    },
                },
            },
        },
    },
    IncomingTransactionController: {
        incomingTransactions: {},
    },
    TokenController: {
        userTokens: {} as IAccountTokens,
        deletedUserTokens: {} as IAccountTokens,
        cachedPopulatedTokens: {} as INetworkTokens,
    },
    PermissionsController: {
        permissions: {},
        permissionRequests: {},
    },
};

export default initialState;
