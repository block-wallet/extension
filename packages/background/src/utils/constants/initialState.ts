import {
    KeyringControllerState,
    KeyringControllerMemState,
} from 'eth-keyring-controller';
import { ValuesOf } from '../types/helpers';
import { IObservableStore } from '../../infrastructure/stores/ObservableStore';

import { AccountTrackerState } from '../../controllers/AccountTrackerController';
import { AppStateControllerState } from '../../controllers/AppStateController';
import { OnboardingControllerState } from '../../controllers/OnboardingController';
import { PreferencesControllerState } from '../../controllers/PreferencesController';
import { ExchangeRatesControllerState } from '../../controllers/ExchangeRatesController';
import { GasPricesControllerState } from '../../controllers/GasPricesController';
import { BigNumber } from '@ethersproject/bignumber';

import { TokenControllerState } from '../../controllers/erc-20/TokenController';
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
import { SIGN_TRANSACTION_TIMEOUT } from './time';
import { TransactionWatcherControllerState } from '@block-wallet/background/controllers/TransactionWatcherController';
import {
    PrivacyControllerStoreState,
    PrivacyControllerUIStoreState,
} from '@block-wallet/background/controllers/privacy/types';
import {
    BridgeControllerMemState,
    BridgeControllerState,
} from '@block-wallet/background/controllers/BridgeController';
import { SwapControllerMemState } from '@block-wallet/background/controllers/SwapController';
import { RemoteConfigsControllerState } from '@block-wallet/background/controllers/RemoteConfigsController';
import CACHED_INCOMPATIBLE_SITES from '@block-wallet/remote-configs/provider/incompatible_sites.json';
import { CampaignsControllerState } from '@block-wallet/background/controllers/CampaignsController';
import { OnrampControllerMemState } from '@block-wallet/background/controllers/OnrampController';

export type BlankAppState = {
    AccountTrackerController: AccountTrackerState;
    AppStateController: AppStateControllerState;
    KeyringController: KeyringControllerState;
    OnboardingController: OnboardingControllerState;
    PreferencesController: PreferencesControllerState;
    TransactionController: TransactionControllerState;
    BlankDepositController: PrivacyControllerStoreState;
    BlockUpdatesController: BlockUpdatesControllerState;
    ExchangeRatesController: ExchangeRatesControllerState;
    GasPricesController: GasPricesControllerState;
    TokenController: TokenControllerState;
    PermissionsController: PermissionsControllerState;
    NetworkController: NetworkControllerState;
    AddressBookController: AddressBookControllerMemState;
    BlockFetchController: BlockFetchControllerState;
    TransactionWatcherControllerState: TransactionWatcherControllerState;
    BridgeController: BridgeControllerState;
    RemoteConfigsController: RemoteConfigsControllerState;
    CampaignsController: CampaignsControllerState;
};

export type BlankAppUIState = {
    AccountTrackerController: AccountTrackerState;
    AppStateController: AppStateControllerState;
    KeyringController: KeyringControllerMemState;
    OnboardingController: OnboardingControllerState;
    PreferencesController: PreferencesControllerState;
    TransactionController: TransactionVolatileControllerState;
    BlankDepositController: PrivacyControllerUIStoreState;
    ExchangeRatesController: ExchangeRatesControllerState;
    GasPricesController: GasPricesControllerState;
    ActivityListController: IActivityListState;
    TokenController: TokenControllerState;
    PermissionsController: PermissionsControllerState;
    NetworkController: NetworkControllerState;
    AddressBookController: AddressBookControllerMemState;
    BridgeController: BridgeControllerMemState;
    SwapController: SwapControllerMemState;
    BlankProviderController: BlankProviderControllerState;
    OnrampController: OnrampControllerMemState;
};

export type BlankAppStoreConfig<S> = {
    [controller in keyof Partial<S>]: IObservableStore<ValuesOf<S>>;
};

const initialState: BlankAppState = {
    TransactionWatcherControllerState: {
        transactions: {},
        tokenAllowanceEvents: {},
    },
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
        isRefreshingAllowances: false,
        isAccountTrackerLoading: false,
        accountTokensOrder: {},
    },
    AppStateController: {
        idleTimeout: 5,
        isAppUnlocked: false,
        lastActiveTime: 0,
        lockedByTimeout: false,
    },
    BlockUpdatesController: { blockData: {} },
    CampaignsController: {
        enrollments: {},
    },
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
            hideSendToContractWarning: false, // Shown by default
            hideSendToNullWarning: false, // Shown by default
            subscribedToReleaseaNotes: true,
            subscribedToNotifications: true,
            useAntiPhishingProtection: true,
            defaultBrowserWallet: true,
            hideEstimatedGasExceedsThresholdWarning: false, // Shown by default,
            hideDepositsExternalAccountsWarning: false,
            hideBridgeInsufficientNativeTokenWarning: false, // Shown by default
            displayNetWorth: true,
        },
        releaseNotesSettings: {
            lastVersionUserSawNews: '0.1.3',
            latestReleaseNotes: [],
        },
        filters: {
            account: [],
        },
        defaultGasOption: 'medium',
        hotkeysEnabled: true,
        tokensSortValue: 'CUSTOM',
        hideSmallBalances: false,
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
        providerStatus: {
            isCurrentProviderOnline: true,
            isDefaultProviderOnline: true,
            isBackupProviderOnline: true,
            isUsingBackupProvider: false,
        },
        isEIP1559Compatible: {},
    },
    ExchangeRatesController: {
        exchangeRates: { ETH: 0 },
        networkNativeCurrency: {
            symbol: 'ETH',
            // Default Coingecko id for ETH rates
            coingeckoPlatformId: 'ethereum',
        },
        isRatesChangingAfterNetworkChange: false,
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
                        lastBaseFeePerGas: null,
                    },
                    fast: {
                        gasPrice: null,
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                        lastBaseFeePerGas: null,
                    },
                    slow: {
                        gasPrice: null,
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                        lastBaseFeePerGas: null,
                    },
                },
            },
        },
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
    BridgeController: {
        bridgeReceivingTransactions: {},
        perndingBridgeReceivingTransactions: {},
    },
    RemoteConfigsController: {
        provider: {
            incompatibleSites: CACHED_INCOMPATIBLE_SITES,
        },
    },
};

export default initialState;
