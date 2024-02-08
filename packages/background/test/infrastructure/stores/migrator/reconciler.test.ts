import { BlankAppState } from '../../../../src/utils/constants/initialState';
import { BigNumber } from '@ethersproject/bignumber';
import reconcileState from '../../../../src/infrastructure/stores/migrator/reconcileState';
import { expect } from 'chai';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';
import { AddressBook } from '@block-wallet/background/controllers/AddressBookController';
import { TransactionControllerState } from '@block-wallet/background/controllers/transactions/TransactionController';
import { TransactionWatcherControllerState } from '@block-wallet/background/controllers/TransactionWatcherController';
import { SIGN_TRANSACTION_TIMEOUT } from '@block-wallet/background/utils/constants/time';
import {
    AccountStatus,
    AccountType,
} from '@block-wallet/background/controllers/AccountTrackerController';
import { DeepPartial } from '@block-wallet/background/utils/types/helpers';

type newBlankAppState = BlankAppState & {
    OnboardingController: { newAddedKeyOnLevel2: boolean };
    PreferencesController: { newAddedKeyOnLevel2: string };
};

const persistedState: DeepPartial<BlankAppState> = {
    TransactionWatcherControllerState: {
        tokenAllowanceEvents: {},
        transactions: {},
    },
    TokenController: {
        userTokens: {},
        cachedPopulatedTokens: {},
        deletedUserTokens: {},
    },
    BlockFetchController: {
        blockFetchData: {
            1: {
                offChainSupport: false,
                checkingOffChainSupport: false,
                currentBlockNumber: 0,
                lastBlockOffChainChecked: -100,
            },
        },
    },
    AddressBookController: {
        addressBook: {} as AddressBook,
        recentAddresses: {} as AddressBook,
    },
    AccountTrackerController: {
        isRefreshingAllowances: false,
        isAccountTrackerLoading: false,
        accounts: {
            '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb': {
                address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                name: 'Account1',
                accountType: AccountType.HD_ACCOUNT,
                allowances: {},
                balances: {},
                index: 0,
                status: AccountStatus.ACTIVE,
            },

            '0xd7d4e99b3e796a528590f5f6b84c2b2f967e7ccb': {
                address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                name: 'Account2',
                accountType: AccountType.HD_ACCOUNT,
                allowances: {},
                balances: {},
                index: 0,
                status: AccountStatus.ACTIVE,
            },
        },
        hiddenAccounts: {},
    },
    AppStateController: {
        idleTimeout: 5,
        isAppUnlocked: true,
        lastActiveTime: 0,
        lockedByTimeout: false,
    },
    BlankDepositController: {
        pendingWithdrawals: {
            goerli: { pending: [] },
            mainnet: { pending: [] },
            polygon: { pending: [] },
            arbitrum: { pending: [] },
            avalanchec: { pending: [] },
            bsc: { pending: [] },
            optimism: { pending: [] },
            xdai: { pending: [] },
        },
        vaultState: {
            vault: 'encrypted-deposits-vault',
        },
    },
    ExchangeRatesController: {
        exchangeRates: { ETH: 2786.23, USDT: 1 },
        isRatesChangingAfterNetworkChange: false,
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
    KeyringController: {
        isUnlocked: false,
        keyringTypes: {},
        keyrings: [],
        vault: 'encrypted-vault',
    },
    OnboardingController: { isOnboarded: true, isSeedPhraseBackedUp: false },
    PreferencesController: {
        localeInfo: 'en-GB',
        nativeCurrency: 'GBP',
        selectedAddress: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
        showTestNetworks: true,
    },
    NetworkController: {
        selectedNetwork: 'mainnet',
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
    TransactionController: {
        transactions: [],
        txSignTimeout: SIGN_TRANSACTION_TIMEOUT,
    },
    BlockUpdatesController: { blockData: { 5: { blockNumber: -1 } } },
};

const initialState: newBlankAppState = {
    TransactionWatcherControllerState: {
        transactions: {},
        tokenAllowanceEvents: {},
    },
    CampaignsController: {
        enrollments: {},
    },
    BridgeController: {
        bridgeReceivingTransactions: {},
        perndingBridgeReceivingTransactions: {},
    },
    BlockFetchController: {
        blockFetchData: {
            1: {
                offChainSupport: false,
                checkingOffChainSupport: false,
                currentBlockNumber: 0,
                lastBlockOffChainChecked: -100,
            },
        },
    },
    BlockUpdatesController: {
        blockData: { 5: { blockNumber: -1 } },
    },
    AddressBookController: {
        addressBook: {} as AddressBook,
        recentAddresses: {} as AddressBook,
    },
    PermissionsController: {
        permissions: {},
        permissionRequests: {},
    },
    AccountTrackerController: {
        isAccountTrackerLoading: false,
        isRefreshingAllowances: false,
        hiddenAccounts: {},
        accounts: {},
        accountTokensOrder: {},
    },
    AppStateController: {
        idleTimeout: 5,
        isAppUnlocked: true,
        lastActiveTime: 0,
        lockedByTimeout: false,
    },
    KeyringController: {
        isUnlocked: false,
        keyringTypes: {},
        keyrings: [],
        vault: '',
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
    OnboardingController: {
        isOnboarded: false,
        isSeedPhraseBackedUp: false,
        newAddedKeyOnLevel2: false,
    },
    PreferencesController: {
        selectedAddress: '',
        localeInfo: 'en-US',
        showWelcomeMessage: false,
        showDefaultWalletPreferences: false,
        nativeCurrency: 'usd',
        newAddedKeyOnLevel2: '',
        showTestNetworks: false,
        popupTab: 'activity',
        antiPhishingImage: '',
        settings: {
            hideAddressWarning: false,
            hideSendToContractWarning: false,
            hideSendToNullWarning: false,
            subscribedToReleaseaNotes: true,
            subscribedToNotifications: true,
            useAntiPhishingProtection: true,
            defaultBrowserWallet: true,
            hideEstimatedGasExceedsThresholdWarning: false,
            hideDepositsExternalAccountsWarning: false,
            hideBridgeInsufficientNativeTokenWarning: false,
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
    } as TransactionControllerState,
    BlankDepositController: {
        vaultState: { vault: '' },
        pendingWithdrawals: {
            mainnet: { pending: [] },
            goerli: { pending: [] },
            polygon: { pending: [] },
            arbitrum: { pending: [] },
            avalanchec: { pending: [] },
            bsc: { pending: [] },
            optimism: { pending: [] },
            xdai: { pending: [] },
        },
    },
    ExchangeRatesController: {
        exchangeRates: { ETH: 0, DAI: 0 }, // DAI shouldn't be added (level 3)
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
        userTokens: {} as any,
        deletedUserTokens: {} as any,
        cachedPopulatedTokens: {} as any,
    },
    RemoteConfigsController: {
        provider: {
            incompatibleSites: [],
        },
    },
};

describe('State reconciler', () => {
    it('Should reconcile two levels of the persisted state with the initial state correctly', () => {
        const newState = reconcileState<newBlankAppState>(
            persistedState,
            initialState
        );
        expect(newState).to.be.deep.equal({
            TransactionWatcherControllerState: {
                transactions: {},
                tokenAllowanceEvents: {},
            } as TransactionWatcherControllerState,
            BlockFetchController: {
                blockFetchData: {
                    1: {
                        offChainSupport: false,
                        checkingOffChainSupport: false,
                        currentBlockNumber: 0,
                        lastBlockOffChainChecked: -100,
                    },
                },
            },
            BlockUpdatesController: {
                blockData: { 5: { blockNumber: -1 } },
            },
            CampaignsController: {
                enrollments: {},
            },
            AddressBookController: {
                addressBook: {} as AddressBook,
                recentAddresses: {} as AddressBook,
            },
            BridgeController: {
                bridgeReceivingTransactions: {},
                perndingBridgeReceivingTransactions: {},
            },
            AccountTrackerController: {
                isAccountTrackerLoading: false,
                isRefreshingAllowances: false,
                accounts: {
                    '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb': {
                        address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                        name: 'Account1',
                        accountType: AccountType.HD_ACCOUNT,
                        allowances: {},
                        balances: {},
                        index: 0,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xd7d4e99b3e796a528590f5f6b84c2b2f967e7ccb': {
                        address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                        name: 'Account2',
                        accountType: AccountType.HD_ACCOUNT,
                        allowances: {},
                        balances: {},
                        index: 0,
                        status: AccountStatus.ACTIVE,
                    },
                },
                hiddenAccounts: {},
                accountTokensOrder: {},
            },
            AppStateController: {
                idleTimeout: 5,
                isAppUnlocked: true,
                lastActiveTime: 0,
                lockedByTimeout: false,
            },
            BlankDepositController: {
                pendingWithdrawals: {
                    goerli: { pending: [] },
                    mainnet: { pending: [] },
                    polygon: { pending: [] },
                    arbitrum: { pending: [] },
                    avalanchec: { pending: [] },
                    bsc: { pending: [] },
                    optimism: { pending: [] },
                    xdai: { pending: [] },
                },
                vaultState: {
                    vault: 'encrypted-deposits-vault',
                },
            },
            ExchangeRatesController: {
                exchangeRates: { ETH: 2786.23, USDT: 1 },
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
            KeyringController: {
                isUnlocked: false,
                keyringTypes: {},
                keyrings: [],
                vault: 'encrypted-vault',
            },
            OnboardingController: {
                isOnboarded: true,
                isSeedPhraseBackedUp: false,
                newAddedKeyOnLevel2: false,
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
            PreferencesController: {
                localeInfo: 'en-GB',
                nativeCurrency: 'GBP',
                selectedAddress: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                newAddedKeyOnLevel2: '',
                antiPhishingImage: '',
                showTestNetworks: true,
                showWelcomeMessage: false,
                showDefaultWalletPreferences: false,
                popupTab: 'activity',
                settings: {
                    subscribedToNotifications: true,
                    subscribedToReleaseaNotes: true,
                    hideAddressWarning: false,
                    hideSendToContractWarning: false,
                    hideSendToNullWarning: false,
                    useAntiPhishingProtection: true,
                    defaultBrowserWallet: true,
                    hideEstimatedGasExceedsThresholdWarning: false,
                    hideDepositsExternalAccountsWarning: false,
                    hideBridgeInsufficientNativeTokenWarning: false,
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
            TokenController: {
                userTokens: {},
                deletedUserTokens: {},
                cachedPopulatedTokens: {} as any,
            },
            PermissionsController: {
                permissions: {},
                permissionRequests: {},
            },
            RemoteConfigsController: {
                provider: {
                    incompatibleSites: [],
                },
            },
        } as newBlankAppState);
    });
});
