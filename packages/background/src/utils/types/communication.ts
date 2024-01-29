/* eslint-disable @typescript-eslint/no-empty-interface */
import { Flatten } from './helpers';
import { BlankAppUIState } from '../constants/initialState';
import { BigNumber } from '@ethersproject/bignumber';
import {
    AccountInfo,
    DeviceAccountInfo,
} from '../../controllers/AccountTrackerController';
import {
    GasPriceValue,
    FeeMarketEIP1559Values,
} from '../../controllers/transactions/TransactionController';
import {
    IToken,
    ITokens,
    SearchTokensResponse,
    Token,
} from '../../controllers/erc-20/Token';
import {
    TransactionAdvancedData,
    TransactionMeta,
    TransactionStatus,
} from '../../controllers/transactions/utils/types';
import { ImportStrategy, ImportArguments } from '../account';
import {
    SwapParameters,
    ExchangeType,
    SwapQuoteResponse,
    SwapTransaction,
    SwapQuoteParams,
    SwapRequestParams,
} from '../../controllers/SwapController';
import {
    ProviderEvents,
    SiteMetadata,
    RequestArguments,
    ProviderSetupData,
} from '@block-wallet/provider/types';

import {
    AddressBookEntry,
    NetworkAddressBook,
} from '@block-wallet/background/controllers/AddressBookController';
import { DappReq, DappRequestConfirmOptions } from './ethereum';
import { TransactionGasEstimation } from '@block-wallet/background/controllers/transactions/TransactionController';
import {
    DefaultGasOptions,
    PopupTabs,
    ReleaseNote,
    UserSettings,
} from '@block-wallet/background/controllers/PreferencesController';
import { TransactionFeeData } from '@block-wallet/background/controllers/erc-20/transactions/SignedTransaction';
import { Currency } from '../currency';
import { Devices } from './hardware';
import { ChainListItem } from '@block-wallet/chains-assets';
import { IChain } from './chain';
import {
    BridgeQuoteRequest,
    BridgeRoutesRequest,
    BridgeTransaction,
    GetBridgeAvailableRoutesResponse,
    GetBridgeQuoteResponse,
} from '@block-wallet/background/controllers/BridgeController';
import { GasPriceData } from '@block-wallet/background/controllers/GasPricesController';
import { RemoteConfigsControllerState } from '@block-wallet/background/controllers/RemoteConfigsController';
import { TypedTransaction } from '@ethereumjs/tx';
import browser from 'webextension-polyfill';
import { GetOnRampCurrencies } from '@block-wallet/background/controllers/OnrampController';
import { SwapTxMeta } from '../swaps/1inch';

enum ACCOUNT {
    CREATE = 'CREATE_ACCOUNT',
    EXPORT_JSON = 'EXPORT_ACCOUNT_JSON',
    EXPORT_PRIVATE_KEY = 'EXPORT_ACCOUNT_PK',
    IMPORT_JSON = 'IMPORT_ACCOUNT_JSON',
    IMPORT_PRIVATE_KEY = 'IMPORT_ACCOUNT_PK',
    REMOVE = 'REMOVE_ACCOUNT',
    RESET = 'RESET_ACCOUNT',
    RENAME = 'RENAME_ACCOUNT',
    SELECT = 'SELECT_ACCOUNT',
    GET_BALANCE = 'GET_ACCOUNT_BALANCE',
    HIDE = 'HIDE_ACCOUNT',
    REFRESH_TOKEN_ALLOWANCES = 'REFRESH_TOKEN_ALLOWANCES',
    UNHIDE = 'UNHIDE_ACCOUNT',
    GET_NATIVE_TOKEN_BALANCE = 'GET_NATIVE_TOKEN_BALANCE',
    EDIT_ACCOUNT_TOKENS_ORDER = 'EDIT_ACCOUNT_TOKENS_ORDER',
    SET_ACCOUNT_SORT_VALUE = 'SET_ACCOUNT_SORT_VALUE',
    ORDER_ACCOUNTS = 'ORDER_ACCOUNTS',
}

enum ADDRESS {
    GET_TYPE = 'GET_TYPE',
}

enum APP {
    LOCK = 'LOCK_APP',
    UNLOCK = 'UNLOCK_APP',
    GET_IDLE_TIMEOUT = 'GET_IDLE_TIMEOUT',
    SET_IDLE_TIMEOUT = 'SET_IDLE_TIMEOUT',
    SET_LAST_USER_ACTIVE_TIME = 'SET_LAST_USER_ACTIVE_TIME',
    RETURN_TO_ONBOARDING = 'RETURN_TO_ONBOARDING',
    OPEN_RESET = 'OPEN_RESET',
    OPEN_HW_CONNECT = 'OPEN_HW_CONNECT',
    OPEN_HW_REMOVE = 'OPEN_HW_REMOVE',
    OPEN_HW_RECONNECT = 'OPEN_HW_RECONNECT',
    SET_USER_SETTINGS = 'SET_USER_SETTINGS',
    UPDATE_POPUP_TAB = 'UPDATE_POPUP_TAB',
    REJECT_UNCONFIRMED_REQUESTS = 'REJECT_UNCONFIRMED_REQUESTS',
    SET_USER_ONLINE = 'SET_USER_ONLINE',
}

enum BACKGROUND {
    ACTION = 'ACTION',
}

enum DAPP {
    CONFIRM_REQUEST = 'CONFIRM_DAPP_REQUEST',
    ATTEMPT_REJECT_REQUEST = 'ATTEMPT_REJECT_DAPP_REQUEST',
}

enum EXCHANGE {
    CHECK_ALLOWANCE = 'CHECK_ALLOWANCE',
    APPROVE = 'APPROVE_EXCHANGE',
    GET_QUOTE = 'GET_EXCHANGE_QUOTE',
    GET_EXCHANGE = 'GET_EXCHANGE',
    GET_SPENDER = 'GET_SPENDER',
    EXECUTE = 'EXECUTE_EXCHANGE',
}

enum BRIDGE {
    APPROVE_BRIDGE_ALLOWANCE = 'APPROVE_BRIDGE_ALLOWANCE',
    GET_BRIDGE_AVAILABLE_CHAINS = 'GET_BRIDGE_AVAILABLE_CHAINS',
    GET_BRIDGE_TOKENS = 'GET_BRIDGE_TOKENS',
    GET_BRIDGE_QUOTE = 'GET_BRIDGE_QUOTE',
    GET_BRIDGE_ROUTES = 'GET_BRIDGE_ROUTES',
    EXECUTE_BRIDGE = 'EXECUTE_BRIDGE',
}

export enum EXTERNAL {
    EVENT_SUBSCRIPTION = 'EVENT_SUBSCRIPTION',
    REQUEST = 'EXTERNAL_REQUEST',
    SETUP_PROVIDER = 'SETUP_PROVIDER',
    SW_REINIT = 'SW_REINIT',
    SET_ICON = 'SET_ICON',
    GET_PROVIDER_CONFIG = 'GET_PROVIDER_CONFIG',
    IS_ENROLLED = 'IS_ENROLLED',
}

export enum CONTENT {
    SHOULD_INJECT = 'SHOULD_INJECT',
    SW_KEEP_ALIVE = 'SW_KEEP_ALIVE',
}

enum NETWORK {
    CHANGE = 'NETWORK_CHANGE',
    SET_SHOW_TEST_NETWORKS = 'SHOW_TEST_NETWORKS',
    ADD_NETWORK = 'ADD_NETWORK',
    EDIT_NETWORK = 'EDIT_NETWORK',
    EDIT_NETWORKS_ORDER = 'EDIT_NETWORKS_ORDER',
    REMOVE_NETWORK = 'REMOVE_NETWORK',
    SWITCH_PROVIDER = 'SWITCH_PROVIDER',
    GET_SPECIFIC_CHAIN_DETAILS = 'GET_SPECIFIC_CHAIN_DETAILS',
    GET_DEFAULT_RPC = 'GET_DEFAULT_RPC',
    GET_RPCS = 'GET_RPCS',
    GET_RPC_CHAIN_ID = 'GET_RPC_CHAIN_ID',
    IS_RPC_VALID = 'IS_RPC_VALID',
    SEARCH_CHAINS = 'SEARCH_CHAINS',
}

enum PASSWORD {
    VERIFY = 'VERIFY_PASSWORD',
    CHANGE = 'CHANGE_PASSWORD',
}

enum PERMISSION {
    ADD_NEW = 'ADD_NEW_SITE_PERMISSIONS',
    CONFIRM = 'CONFIRM_PERMISSION_REQUEST',
    GET_ACCOUNT_PERMISSIONS = 'GET_ACCOUNT_PERMISSIONS',
    REMOVE_ACCOUNT_FROM_SITE = 'REMOVE_ACCOUNT_FROM_SITE',
    UPDATE_SITE_PERMISSIONS = 'UPDATE_SITE_PERMISSIONS',
}

enum STATE {
    GET = 'GET_STATE',
    SUBSCRIBE = 'STATE_SUBSCRIBE',
    GET_REMOTE_CONFIG = 'GET_REMOTE_CONFIG',
}

enum ENS {
    LOOKUP_ADDRESS = 'LOOKUP_ADDRESS_ENS',
    RESOLVE_NAME = 'RESOLVE_ENS_NAME',
}

enum UD {
    RESOLVE_NAME = 'RESOLVE_UD_NAME',
}

enum TRANSACTION {
    ADD_NEW_SEND_TRANSACTION = 'ADD_NEW_SEND_TRANSACTION',
    ADD_NEW_APPROVE_TRANSACTION = 'ADD_NEW_APPROVE_TRANSACTION',
    UPDATE_SEND_TRANSACTION_GAS = 'UPDATE_SEND_TRANSACTION_GAS',
    APPROVE_SEND_TRANSACTION = 'APPROVE_SEND_TRANSACTION',
    GET_SEND_TRANSACTION_RESULT = 'GET_SEND_TRANSACTION_RESULT',
    CALCULATE_SEND_TRANSACTION_GAS_LIMIT = 'CALCULATE_SEND_TRANSACTION_GAS_LIMIT',
    CALCULATE_APPROVE_TRANSACTION_GAS_LIMIT = 'CALCULATE_APPROVE_TRANSACTION_GAS_LIMIT',
    CALCULATE_SWAP_TRANSACTION_GAS_LIMIT = 'CALCULATE_SWAP_TRANSACTION_GAS_LIMIT',
    CONFIRM = 'CONFIRM_TRANSACTION',
    REJECT = 'REJECT_TRANSACTION',
    UPDATE_STATUS = 'UPDATE_STATUS',
    GET_LATEST_GAS_PRICE = 'GET_LATEST_GAS_PRICE',
    UPDATE_GAS_PRICE = 'UPDATE_GAS_PRICE',
    FETCH_LATEST_GAS_PRICE = 'FETCH_LATEST_GAS_PRICE',
    SEND_ETHER = 'SEND_ETHER',
    CANCEL_TRANSACTION = 'CANCEL_TRANSACTION',
    SPEED_UP_TRANSACTION = 'SPEED_UP_TRANSACTION',
    GET_SPEED_UP_GAS_PRICE = 'GET_SPEED_UP_GAS_PRICE',
    GET_CANCEL_GAS_PRICE = 'GET_CANCEL_GAS_PRICE',
    GET_NEXT_NONCE = 'GET_NEXT_NONCE',
    REJECT_REPLACEMENT_TRANSACTION = 'REJECT_REPLACEMENT_TRANSACTION',
}

enum WALLET {
    CREATE = 'CREATE_WALLET',
    IMPORT = 'IMPORT_WALLET',
    VERIFY_SEED_PHRASE = 'VERIFY_SEED_PHRASE',
    REQUEST_SEED_PHRASE = 'REQUEST_SEED_PHRASE',
    SETUP_COMPLETE = 'SETUP_COMPLETE',
    RESET = 'RESET',
    DISMISS_WELCOME_MESSAGE = 'DISMISS_WELCOME_MESSAGE',
    DISMISS_DEFAULT_WALLET_PREFERENCES = 'DISMISS_DEFAULT_WALLET_PREFERENCES',
    DISMISS_RELEASE_NOTES = 'DISMISS_RELEASE_NOTES',
    TOGGLE_RELEASE_NOTES_SUBSCRIPTION = 'TOGGLE_RELEASE_NOTES_SUBSCRIPTION',
    GENERATE_ON_DEMAND_RELEASE_NOTES = 'GENERATE_ON_DEMAND_RELEASE_NOTES',
    UPDATE_ANTI_PHISHING_IMAGE = 'UPDATE_ANTI_PHISHING_IMAGE',
    TOGGLE_ANTI_PHISHING_PROTECTION = 'TOGGLE_ANTI_PHISHING_PROTECTION',
    TOGGLE_DEFAULT_BROWSER_WALLET = 'TOGGLE_DEFAULT_BROWSER_WALLET',
    SET_NATIVE_CURRENCY = 'SET_NATIVE_CURRENCY',
    GET_VALID_CURRENCIES = 'GET_VALID_CURRENCIES',
    HARDWARE_CONNECT = 'HARDWARE_CONNECT',
    HARDWARE_REMOVE = 'HARDWARE_REMOVE',
    HARDWARE_GET_ACCOUNTS = 'HARDWARE_GET_ACCOUNTS',
    HARDWARE_IMPORT_ACCOUNTS = 'HARDWARE_IMPORT_ACCOUNTS',
    HARDWARE_GET_HD_PATH = 'HARDWARE_GET_HD_PATH',
    HARDWARE_SET_HD_PATH = 'HARDWARE_SET_HD_PATH',
    HARDWARE_IS_LINKED = 'HARDWARE_IS_LINKED',
    SET_DEFAULT_GAS = 'SET_DEFAULT_GAS',
    // qr hardware devices
    HARDWARE_QR_SUBMIT_CRYPTO_HD_KEY_OR_ACCOUNT = 'HARDWARE_QR_SUBMIT_CRYPTO_HD_KEY_OR_ACCOUNT',
    HARDWARE_QR_SUBMIT_SIGNATURE = 'HARDWARE_QR_SUBMIT_SIGNATURE',
    HARDWARE_QR_CANCEL_SIGN_REQUEST = 'HARDWARE_QR_CANCEL_SIGN_REQUEST',
    //hotkeys
    SET_HOTKEYS_ENABLED = 'SET_HOTKEYS_ENABLED',
    //onramp
    GET_ONRAMP_CURRENCIES = 'GET_ONRAMP_CURRENCIES',
    SET_HIDESMALLBALANCES = 'SET_HIDESMALLBALANCES',
}

enum TOKEN {
    GET_BALANCE = 'GET_TOKEN_BALANCE',
    GET_TOKENS = 'GET_TOKENS',
    GET_USER_TOKENS = 'GET_USER_TOKENS',
    GET_TOKEN = 'GET_TOKEN',
    ADD_CUSTOM_TOKEN = 'ADD_CUSTOM_TOKEN',
    DELETE_CUSTOM_TOKEN = 'DELETE_CUSTOM_TOKEN',
    ADD_CUSTOM_TOKENS = 'ADD_CUSTOM_TOKENS',
    SEND_TOKEN = 'SEND_TOKEN',
    POPULATE_TOKEN_DATA = 'POPULATE_TOKEN_DATA',
    SEARCH_TOKEN = 'SEARCH_TOKEN',
    APPROVE_ALLOWANCE = 'APPROVE_ALLOWANCE',
}

enum ADDRESS_BOOK {
    CLEAR = 'CLEAR',
    DELETE = 'DELETE',
    SET = 'SET',
    GET = 'GET',
    GET_BY_ADDRESS = 'GET_BY_ADDRESS',
    GET_RECENT_ADDRESSES = 'GET_RECENT_ADDRESSES',
}

enum BROWSER {
    GET_WINDOW_ID = 'GET_WINDOW_ID',
}

enum FILTERS {
    SET_ACCOUNT_FILTERS = 'SET_ACCOUNT_FILTERS',
}

export enum ProviderType {
    DEFAULT = 'DEFAULT',
    BACKUP = 'BACKUP',
    CUSTOM = 'CUSTOM',
    CURRENT = 'CURRENT',
}

export const Messages = {
    ACCOUNT,
    ADDRESS,
    APP,
    BACKGROUND,
    CONTENT,
    DAPP,
    EXCHANGE,
    EXTERNAL,
    NETWORK,
    PASSWORD,
    PERMISSION,
    STATE,
    ENS,
    UD,
    TRANSACTION,
    WALLET,
    TOKEN,
    ADDRESS_BOOK,
    BROWSER,
    FILTERS,
    BRIDGE,
};

// [MessageType]: [RequestType, ResponseType, SubscriptionMessageType?]
export interface RequestSignatures {
    [Messages.BROWSER.GET_WINDOW_ID]: [undefined, string];
    [Messages.ADDRESS.GET_TYPE]: [string, AddressType];
    [Messages.ACCOUNT.CREATE]: [RequestAccountCreate, AccountInfo];
    [Messages.ACCOUNT.EXPORT_JSON]: [RequestAccountExportJson, string];
    [Messages.ACCOUNT.EXPORT_PRIVATE_KEY]: [RequestAccountExportPK, string];
    [Messages.ACCOUNT.IMPORT_JSON]: [RequestAccountImportJson, AccountInfo];
    [Messages.ACCOUNT.IMPORT_PRIVATE_KEY]: [
        RequestAccountImportPK,
        AccountInfo
    ];
    [Messages.ACCOUNT.REMOVE]: [RequestAccountRemove, boolean];
    [Messages.ACCOUNT.RESET]: [RequestAccountReset, void];
    [Messages.ACCOUNT.HIDE]: [RequestAccountHide, boolean];
    [Messages.ACCOUNT.UNHIDE]: [RequestAccountUnhide, boolean];
    [Messages.ACCOUNT.RENAME]: [RequestAccountRename, boolean];
    [Messages.ACCOUNT.SELECT]: [RequestAccountSelect, boolean];
    [Messages.ACCOUNT.GET_BALANCE]: [string, BigNumber];
    [Messages.ACCOUNT.REFRESH_TOKEN_ALLOWANCES]: [void, void];
    [Messages.ACCOUNT.GET_NATIVE_TOKEN_BALANCE]: [
        number,
        BigNumber | undefined
    ];
    [Messages.ACCOUNT.EDIT_ACCOUNT_TOKENS_ORDER]: [RequestTokensOrder, void];
    [Messages.ACCOUNT.SET_ACCOUNT_SORT_VALUE]: [string, void];
    [Messages.ACCOUNT.ORDER_ACCOUNTS]: [RequestOrderAccounts, void];
    [Messages.APP.GET_IDLE_TIMEOUT]: [undefined, number];
    [Messages.APP.SET_IDLE_TIMEOUT]: [RequestSetIdleTimeout, void];
    [Messages.APP.SET_LAST_USER_ACTIVE_TIME]: [undefined, void];
    [Messages.APP.LOCK]: [undefined, boolean];
    [Messages.APP.UNLOCK]: [RequestAppUnlock, boolean];
    [Messages.APP.RETURN_TO_ONBOARDING]: [undefined, void];
    [Messages.APP.OPEN_RESET]: [undefined, void];
    [Messages.APP.OPEN_HW_CONNECT]: [undefined, void];
    [Messages.APP.OPEN_HW_REMOVE]: [undefined, void];
    [Messages.APP.OPEN_HW_RECONNECT]: [RequestReconnectDevice, void];

    [Messages.APP.SET_USER_SETTINGS]: [RequestUserSettings, UserSettings];
    [Messages.APP.UPDATE_POPUP_TAB]: [RequestUpdatePopupTab, void];
    [Messages.APP.REJECT_UNCONFIRMED_REQUESTS]: [undefined, void];
    [Messages.APP.SET_USER_ONLINE]: [RequestSetUserOnline, void];
    [Messages.BACKGROUND.ACTION]: [];
    [Messages.DAPP.CONFIRM_REQUEST]: [RequestConfirmDappRequest, void];
    [Messages.DAPP.ATTEMPT_REJECT_REQUEST]: [RequestRejectDappRequest, void];
    [Messages.EXCHANGE.CHECK_ALLOWANCE]: [
        RequestCheckExchangeAllowance,
        boolean
    ];
    [Messages.EXCHANGE.APPROVE]: [RequestApproveExchange, boolean];
    [Messages.EXCHANGE.GET_QUOTE]: [RequestGetExchangeQuote, SwapQuoteResponse];
    [Messages.EXCHANGE.GET_EXCHANGE]: [RequestGetExchange, SwapParameters];
    [Messages.EXCHANGE.GET_SPENDER]: [RequestGetExchangeSpender, string];
    [Messages.EXCHANGE.EXECUTE]: [RequestExecuteExchange, string];
    [Messages.EXTERNAL.REQUEST]: [RequestExternalRequest, unknown];
    [Messages.EXTERNAL.SETUP_PROVIDER]: [undefined, ProviderSetupData];
    [Messages.EXTERNAL.SW_REINIT]: [void, void];
    [Messages.EXTERNAL.SET_ICON]: [RequestSetIcon, boolean];
    [Messages.EXTERNAL.GET_PROVIDER_CONFIG]: [
        undefined,
        RemoteConfigsControllerState['provider']
    ];
    [Messages.EXTERNAL.IS_ENROLLED]: [RequestIsEnrolled, boolean];
    [Messages.BRIDGE.GET_BRIDGE_TOKENS]: [RequestGetBridgeTokens, IToken[]];

    [Messages.BRIDGE.APPROVE_BRIDGE_ALLOWANCE]: [
        RequestApproveBridgeAllowance,
        boolean
    ];
    [Messages.BRIDGE.GET_BRIDGE_AVAILABLE_CHAINS]: [
        RequestGetBridgeAvailableChains,
        IChain[]
    ];
    [Messages.BRIDGE.GET_BRIDGE_QUOTE]: [
        RequestGetBridgeQuote,
        GetBridgeQuoteResponse
    ];
    [Messages.BRIDGE.GET_BRIDGE_ROUTES]: [
        RequestGetBridgeRoutes,
        GetBridgeAvailableRoutesResponse
    ];
    [Messages.BRIDGE.EXECUTE_BRIDGE]: [RequestExecuteBridge, string];

    [Messages.NETWORK.CHANGE]: [RequestNetworkChange, boolean];
    [Messages.NETWORK.SET_SHOW_TEST_NETWORKS]: [
        RequestShowTestNetworks,
        boolean
    ];
    [Messages.NETWORK.ADD_NETWORK]: [RequestAddNetwork, void];
    [Messages.NETWORK.EDIT_NETWORK]: [RequestEditNetwork, void];
    [Messages.NETWORK.EDIT_NETWORKS_ORDER]: [RequestEditNetworksOrder, void];
    [Messages.NETWORK.REMOVE_NETWORK]: [RequestRemoveNetwork, void];
    [Messages.NETWORK.SWITCH_PROVIDER]: [RequestSwitchProvider, void];
    [Messages.NETWORK.GET_SPECIFIC_CHAIN_DETAILS]: [
        RequestGetChainData,
        ChainListItem
    ];
    [Messages.NETWORK.GET_DEFAULT_RPC]: [
        RequestGetChainData,
        string | undefined
    ];
    [Messages.NETWORK.GET_RPC_CHAIN_ID]: [RequestGetRpcChainId, number];
    [Messages.NETWORK.SEARCH_CHAINS]: [
        RequestSearchChains,
        { name: string; logo: string }
    ];
    [Messages.PASSWORD.VERIFY]: [RequestPasswordVerify, boolean];
    [Messages.PASSWORD.CHANGE]: [RequestPasswordChange, boolean];
    [Messages.PERMISSION.ADD_NEW]: [RequestAddNewSiteWithPermissions, boolean];
    [Messages.PERMISSION.CONFIRM]: [RequestConfirmPermission, boolean];
    [Messages.PERMISSION.GET_ACCOUNT_PERMISSIONS]: [
        RequestGetAccountPermissions,
        string[]
    ];
    [Messages.PERMISSION.REMOVE_ACCOUNT_FROM_SITE]: [
        RequestRemoveAccountFromSite,
        boolean
    ];
    [Messages.PERMISSION.UPDATE_SITE_PERMISSIONS]: [
        RequestUpdateSitePermissions,
        boolean
    ];
    [Messages.STATE.GET]: [undefined, ResponseGetState];
    [Messages.ENS.RESOLVE_NAME]: [RequestEnsResolve, string | null];
    [Messages.ENS.LOOKUP_ADDRESS]: [RequestEnsLookup, string | null];
    [Messages.UD.RESOLVE_NAME]: [RequestUDResolve, string | null];
    [Messages.TRANSACTION.CONFIRM]: [RequestConfirmTransaction, string];
    [Messages.TRANSACTION.REJECT]: [RequestRejectTransaction, boolean];
    [Messages.TRANSACTION.UPDATE_STATUS]: [
        RequestUpdateTransactionStatus,
        boolean
    ];
    [Messages.TRANSACTION.REJECT_REPLACEMENT_TRANSACTION]: [
        RequestRejectTransaction,
        boolean
    ];
    [Messages.TRANSACTION.GET_LATEST_GAS_PRICE]: [undefined, BigNumber];
    [Messages.TRANSACTION.UPDATE_GAS_PRICE]: [undefined, undefined];
    [Messages.TRANSACTION.FETCH_LATEST_GAS_PRICE]: [number, GasPriceData];
    [Messages.TRANSACTION.SEND_ETHER]: [RequestSendEther, string];
    [Messages.TRANSACTION.ADD_NEW_SEND_TRANSACTION]: [
        RequestAddAsNewSendTransaction,
        TransactionMeta
    ];
    [Messages.TRANSACTION.ADD_NEW_APPROVE_TRANSACTION]: [
        RequestAddAsNewApproveTransaction,
        TransactionMeta
    ];
    [Messages.TRANSACTION.UPDATE_SEND_TRANSACTION_GAS]: [
        RequestUpdateSendTransactionGas,
        void
    ];
    [Messages.TRANSACTION.APPROVE_SEND_TRANSACTION]: [
        RequestApproveSendTransaction,
        void
    ];
    [Messages.TRANSACTION.GET_SEND_TRANSACTION_RESULT]: [
        RequestSendTransactionResult,
        string
    ];
    [Messages.TRANSACTION.CALCULATE_APPROVE_TRANSACTION_GAS_LIMIT]: [
        RequestCalculateApproveTransactionGasLimit,
        TransactionGasEstimation
    ];
    [Messages.TRANSACTION.CALCULATE_SEND_TRANSACTION_GAS_LIMIT]: [
        RequestCalculateSendTransactionGasLimit,
        TransactionGasEstimation
    ];
    [Messages.TRANSACTION.CALCULATE_SWAP_TRANSACTION_GAS_LIMIT]: [
        RequestCalculateSwapTransactionGasLimit,
        TransactionGasEstimation
    ];
    [Messages.TRANSACTION.CANCEL_TRANSACTION]: [RequestCancelTransaction, void];
    [Messages.TRANSACTION.SPEED_UP_TRANSACTION]: [
        RequestSpeedUpTransaction,
        void
    ];
    [Messages.TRANSACTION.GET_SPEED_UP_GAS_PRICE]: [
        RequestGetCancelSpeedUpGasPriceTransaction,
        GasPriceValue | FeeMarketEIP1559Values
    ];
    [Messages.TRANSACTION.GET_CANCEL_GAS_PRICE]: [
        RequestGetCancelSpeedUpGasPriceTransaction,
        GasPriceValue | FeeMarketEIP1559Values
    ];
    [Messages.TRANSACTION.GET_NEXT_NONCE]: [RequestNextNonce, number];
    [Messages.WALLET.CREATE]: [RequestWalletCreate, void];
    [Messages.WALLET.IMPORT]: [RequestWalletImport, boolean];
    [Messages.WALLET.VERIFY_SEED_PHRASE]: [RequestVerifySeedPhrase, boolean];
    [Messages.WALLET.REQUEST_SEED_PHRASE]: [RequestSeedPhrase, string];
    [Messages.WALLET.SETUP_COMPLETE]: [RequestCompleteSetup, void];
    [Messages.WALLET.RESET]: [RequestWalletReset, boolean];
    [Messages.STATE.SUBSCRIBE]: [undefined, boolean, StateSubscription];
    [Messages.STATE.GET_REMOTE_CONFIG]: [
        undefined,
        RemoteConfigsControllerState
    ];
    [Messages.TOKEN.GET_BALANCE]: [RequestGetTokenBalance, BigNumber];
    [Messages.TOKEN.GET_TOKENS]: [RequestGetTokens, ITokens];
    [Messages.TOKEN.GET_USER_TOKENS]: [RequestGetUserTokens, ITokens];
    [Messages.TOKEN.GET_TOKEN]: [RequestGetToken, Token];
    [Messages.TOKEN.ADD_CUSTOM_TOKEN]: [RequestAddCustomToken, void | void[]];
    [Messages.TOKEN.DELETE_CUSTOM_TOKEN]: [RequestDeleteCustomToken, void];
    [Messages.TOKEN.ADD_CUSTOM_TOKENS]: [RequestAddCustomTokens, void | void[]];
    [Messages.TOKEN.SEND_TOKEN]: [RequestSendToken, string];
    [Messages.TOKEN.POPULATE_TOKEN_DATA]: [RequestPopulateTokenData, Token];
    [Messages.TOKEN.SEARCH_TOKEN]: [RequestSearchToken, SearchTokensResponse];
    [Messages.TOKEN.APPROVE_ALLOWANCE]: [RequestApproveAllowance, boolean];
    [Messages.EXTERNAL.EVENT_SUBSCRIPTION]: [
        undefined,
        boolean,
        ExternalEventSubscription
    ];
    [Messages.ADDRESS_BOOK.CLEAR]: [RequestAddressBookClear, boolean];
    [Messages.ADDRESS_BOOK.DELETE]: [RequestAddressBookDelete, boolean];
    [Messages.ADDRESS_BOOK.SET]: [RequestAddressBookSet, boolean];
    [Messages.ADDRESS_BOOK.GET]: [RequestAddressBookGet, NetworkAddressBook];
    [Messages.ADDRESS_BOOK.GET_BY_ADDRESS]: [
        RequestAddressBookGetByAddress,
        AddressBookEntry | undefined
    ];
    [Messages.ADDRESS_BOOK.GET_RECENT_ADDRESSES]: [
        RequestAddressBookGetRecentAddresses,
        NetworkAddressBook
    ];
    [Messages.WALLET.DISMISS_WELCOME_MESSAGE]: [DismissMessage, boolean];
    [Messages.WALLET.DISMISS_DEFAULT_WALLET_PREFERENCES]: [
        DismissMessage,
        boolean
    ];
    [Messages.WALLET.DISMISS_RELEASE_NOTES]: [DismissMessage, boolean];
    [Messages.WALLET.TOGGLE_RELEASE_NOTES_SUBSCRIPTION]: [
        RequestToggleReleaseNotesSubscription,
        void
    ];
    [Messages.WALLET.TOGGLE_DEFAULT_BROWSER_WALLET]: [
        RequestToggleDefaultBrowserWallet,
        void
    ];
    [Messages.WALLET.SET_DEFAULT_GAS]: [RequestSetDefaultGas, void];

    [Messages.WALLET.UPDATE_ANTI_PHISHING_IMAGE]: [
        RequestUpdateAntiPhishingImage,
        void
    ];

    [Messages.WALLET.TOGGLE_ANTI_PHISHING_PROTECTION]: [
        RequestToggleAntiPhishingProtection,
        void
    ];

    [Messages.WALLET.SET_NATIVE_CURRENCY]: [RequestSetNativeCurrency, void];
    [Messages.WALLET.GET_VALID_CURRENCIES]: [
        RequestGetValidCurrencies,
        Currency[]
    ];
    [Messages.WALLET.HARDWARE_CONNECT]: [RequestConnectHardwareWallet, boolean];
    [Messages.WALLET.HARDWARE_REMOVE]: [RequestRemoveHardwareWallet, boolean];
    [Messages.WALLET.HARDWARE_GET_ACCOUNTS]: [
        RequestGetHardwareWalletAccounts,
        AccountInfo[]
    ];
    [Messages.WALLET.HARDWARE_IMPORT_ACCOUNTS]: [
        RequestImportHardwareWalletAccounts,
        AccountInfo[]
    ];
    [Messages.WALLET.HARDWARE_GET_HD_PATH]: [RequestWalletGetHDPath, string];
    [Messages.WALLET.HARDWARE_SET_HD_PATH]: [RequestWalletSetHDPath, void];
    [Messages.WALLET.HARDWARE_IS_LINKED]: [RequestIsDeviceConnected, boolean];
    [Messages.FILTERS.SET_ACCOUNT_FILTERS]: [
        RequestSetAccountFilters,
        undefined
    ];
    [Messages.WALLET.GENERATE_ON_DEMAND_RELEASE_NOTES]: [
        RequestGenerateOnDemandReleaseNotes,
        ReleaseNote[]
    ];
    [Messages.WALLET.HARDWARE_QR_SUBMIT_CRYPTO_HD_KEY_OR_ACCOUNT]: [
        SubmitQRHardwareCryptoHDKeyOrAccountMessage,
        boolean
    ];
    [Messages.WALLET.HARDWARE_QR_SUBMIT_SIGNATURE]: [
        SubmitQRHardwareSignatureMessage,
        boolean
    ];
    [Messages.WALLET.HARDWARE_QR_CANCEL_SIGN_REQUEST]: [
        CancelQRHardwareSignRequestMessage,
        boolean
    ];
    [Messages.WALLET.SET_HOTKEYS_ENABLED]: [RequestSetHotkeys, void];
    [Messages.WALLET.GET_ONRAMP_CURRENCIES]: [void, GetOnRampCurrencies];
    [Messages.WALLET.SET_HIDESMALLBALANCES]: [
        RequestSetHideSmallBalances,
        void
    ];
}

export type MessageTypes = keyof RequestSignatures;

export type RequestTypes = {
    [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][0];
};

export enum AddressType {
    NORMAL = 'NORMAL',
    SMART_CONTRACT = 'SMART_CONTRACT',
    ERC20 = 'ERC20',
    NULL = 'NULL',
}

export interface RequestSetUserOnline {
    networkStatus: boolean;
}

export interface RequestAccountCreate {
    name: string;
}

export interface RequestAccountExportJson {
    address: string;
    password: string;
    encryptPassword: string;
}

export interface RequestAccountExportPK {
    address: string;
    password: string;
}

export interface RequestAccountImportJson {
    importArgs: ImportArguments[ImportStrategy.JSON_FILE];
    name: string;
}

export interface RequestAccountImportPK {
    importArgs: ImportArguments[ImportStrategy.PRIVATE_KEY];
    name: string;
}

export interface RequestAccountRemove {
    address: string;
}

export interface RequestAccountReset {
    address: string;
}

export interface RequestAccountHide {
    address: string;
}

export interface RequestAccountUnhide {
    address: string;
}

export interface RequestAccountRename {
    address: string;
    name: string;
}

export interface RequestAccountSelect {
    address: string;
}

export interface RequestAppUnlock {
    password: string;
}

export interface RequestSetIdleTimeout {
    idleTimeout: number;
}

export interface RequestConfirmDappRequest {
    id: string;
    isConfirmed: boolean;
    confirmOptions?: DappRequestConfirmOptions[DappReq];
}

export interface RequestRejectDappRequest {
    id: string;
}

export interface RequestReconnectDevice {
    address: string;
}

export interface RequestIsEnrolled {
    campaignId: string;
}
export interface RequestCheckExchangeAllowance {
    account: string;
    amount: BigNumber;
    exchangeType: ExchangeType;
    tokenAddress: string;
}

export interface RequestApproveExchange {
    allowance: BigNumber;
    amount: BigNumber;
    exchangeType: ExchangeType;
    feeData: TransactionFeeData;
    tokenAddress: string;
    customNonce?: number;
}

export interface RequestGetExchangeQuote {
    exchangeType: ExchangeType;
    quoteParams: SwapQuoteParams;
}

export interface RequestGetExchange {
    exchangeType: ExchangeType;
    exchangeParams: SwapRequestParams;
}

export interface RequestGetExchangeSpender {
    exchangeType: ExchangeType;
}

export interface RequestExecuteExchange {
    exchangeType: ExchangeType;
    exchangeParams: SwapTransaction;
}

export interface RequestApproveBridgeAllowance {
    allowance: BigNumber;
    amount: BigNumber;
    spenderAddress: string;
    feeData: TransactionFeeData;
    tokenAddress: string;
    customNonce?: number;
}
export interface RequestApproveAllowance {
    allowance: BigNumber;
    amount: BigNumber;
    spenderAddress: string;
    feeData: TransactionFeeData;
    tokenAddress: string;
    customNonce?: number;
}

export interface RequestGetBridgeTokens {}
export interface RequestGetBridgeAvailableChains {}
export interface RequestGetBridgeQuote {
    checkAllowance: boolean;
    quoteRequest: BridgeQuoteRequest;
}

export interface RequestGetBridgeRoutes {
    routesRequest: BridgeRoutesRequest;
}
export interface RequestExecuteBridge {
    bridgeTransaction: BridgeTransaction;
}

export type RequestExternalRequest = RequestArguments;

export interface RequestSetIcon {
    iconURL: string;
}

export interface RequestNetworkChange {
    networkName: string;
}

export interface RequestShowTestNetworks {
    showTestNetworks: boolean;
}
export interface RequestAddNetwork {
    name: string;
    rpcUrl: string;
    chainId: string;
    currencySymbol: string;
    blockExplorerUrl: string;
    test: boolean;
    // Flag to indicate if we should switch to the added/edited network after saving changes.
    switchToNetwork: boolean;
}

export interface RequestEditNetwork {
    chainId: string;
    updates: {
        rpcUrl: string;
        blockExplorerUrl?: string;
        name: string;
        test: boolean;
    };
}

export interface editNetworkOrder {
    chainId: number;
    order: number;
}

export interface RequestEditNetworksOrder {
    networksOrder: editNetworkOrder[];
}

export interface RequestRemoveNetwork {
    chainId: number;
}

export interface RequestSwitchProvider {
    chainId: number;
    providerType: ProviderType;
    customRpcUrl?: string;
}

export interface RequestGetChainData {
    chainId: number;
}

export interface RequestGetRpcChainId {
    rpcUrl: string;
}

export interface RequestSearchChains {
    term: string;
}

export interface RequestPasswordVerify {
    password: string;
}

export interface RequestPasswordChange {
    password: string;
}

export interface RequestEnsResolve {
    name: string;
}

export interface RequestEnsLookup {
    address: string;
}

export interface RequestUDResolve {
    name: string;
}

export interface RequestAddNewSiteWithPermissions {
    accounts: string[];
    origin: string;
    siteMetadata: SiteMetadata;
}

export interface RequestConfirmPermission {
    id: string;
    accounts: string[] | null;
}

export interface RequestGetAccountPermissions {
    account: string;
}

export interface RequestRemoveAccountFromSite {
    origin: string;
    account: string;
}

export interface RequestUpdateSitePermissions {
    origin: string;
    accounts: string[] | null;
}

export interface RequestConfirmTransaction {
    id: string;
    feeData: TransactionFeeData;
    advancedData: TransactionAdvancedData;
}

export interface RequestSendEther {
    to: string;
    value: BigNumber;
    feeData: TransactionFeeData;
    advancedData: TransactionAdvancedData;
}

export interface RequestWalletCreate {
    password: string;
    antiPhishingImage: string;
}

export interface RequestSeedPhrase {
    password: string;
}
export interface RequestCompleteSetup {
    sendNotification: boolean;
}

export interface RequestWalletImport {
    password: string;
    seedPhrase: string;
    antiPhishingImage: string;
    reImport?: boolean;
    defaultNetwork?: string;
}

export interface RequestWalletReset {
    password: string;
    seedPhrase: string;
    antiPhishingImage: string;
}

export interface RequestWalletGetHDPath {
    device: Devices;
}

export interface RequestWalletSetHDPath {
    device: Devices;
    path: string;
}

export interface RequestVerifySeedPhrase {
    password: string;
    seedPhrase: string;
}

export interface RequestGetTokenBalance {
    tokenAddress: string;
    account: string;
}

export interface RequestGetTokens {
    chainId?: number;
}
export interface RequestGetUserTokens {
    accountAddress?: string;
    chainId?: number;
}

export interface RequestGetToken {
    tokenAddress: string;
    accountAddress?: string;
    chainId?: number;
}

export interface RequestAddCustomToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logo: string;
    type: string;
}
export interface RequestDeleteCustomToken {
    address: string;
    accountAddress?: string;
    chainId?: number;
}

export interface RequestAddCustomTokens {
    tokens: RequestAddCustomToken[];
    accountAddress?: string;
    chainId?: number;
}

export interface RequestSendToken {
    tokenAddress: string;
    to: string;
    value: BigNumber;
    feeData: TransactionFeeData;
    advancedData: TransactionAdvancedData;
}

export interface RequestAddAsNewSendTransaction {
    address: string;
    to: string;
    value: BigNumber;
    feeData: TransactionFeeData;
}

export interface RequestAddAsNewApproveTransaction {
    tokenAddress: string;
    spenderAddress: string;
    allowance: BigNumber;
}

export interface RequestUpdateSendTransactionGas {
    transactionId: string;
    feeData: TransactionFeeData;
}

export interface RequestApproveSendTransaction {
    transactionId: string;
}

export interface RequestSendTransactionResult {
    transactionId: string;
}
export interface RequestCalculateApproveTransactionGasLimit {
    tokenAddress: string;
    spender: string;
    amount: BigNumber | 'UNLIMITED';
}

export interface RequestCalculateSwapTransactionGasLimit {
    tx: SwapTxMeta;
}

export interface RequestCalculateSendTransactionGasLimit {
    address: string;
    to: string;
    value: BigNumber;
}

export interface RequestCancelTransaction {
    transactionId: string;
    gasValues?: GasPriceValue | FeeMarketEIP1559Values;
    gasLimit?: BigNumber;
}

export interface RequestSpeedUpTransaction {
    transactionId: string;
    gasValues?: GasPriceValue | FeeMarketEIP1559Values;
    gasLimit?: BigNumber;
}

export interface RequestGetCancelSpeedUpGasPriceTransaction {
    transactionId: string;
}

export interface RequestPopulateTokenData {
    tokenAddress: string;
}

export interface RequestSearchToken {
    query: string;
    exact?: boolean;
    accountAddress?: string;
    chainId?: number;
    manualAddToken?: boolean;
}

export interface RequestAntiPhishingImage {
    antiPhishingImage: string;
}

export interface RequestUpdateAntiPhishingImage {
    antiPhishingImage: string;
}

export interface RequestToggleAntiPhishingProtection {
    antiPhishingProtectionEnabeld: boolean;
}

export interface RequestSetNativeCurrency {
    currencyCode: string;
}

export interface RequestGetValidCurrencies {}

export interface RequestToggleReleaseNotesSubscription {
    releaseNotesSubscriptionEnabled: boolean;
}

export interface RequestToggleDefaultBrowserWallet {
    defaultBrowserWalletEnabled: boolean;
}

export interface RequestSetDefaultGas {
    defaultGasOption: DefaultGasOptions;
}

export interface RequestRejectTransaction {
    transactionId: string;
}

export interface RequestUpdateTransactionStatus {
    transactionId: string;
    status: TransactionStatus;
}

export interface RequestAddressBookClear {}

export interface RequestAddressBookDelete {
    address: string;
}

export interface RequestAddressBookSet {
    address: string;
    name: string;
    note?: string;
}

export interface RequestAddressBookGet {}
export interface RequestAddressBookGetByAddress {
    address: string;
}
export interface RequestAddressBookGetRecentAddresses {
    limit?: number;
}
export interface RequestUserSettings {
    settings: UserSettings;
}

export interface RequestUpdatePopupTab {
    popupTab: PopupTabs;
}

export interface RequestNextNonce {
    address: string;
}

export interface RequestConnectHardwareWallet {
    device: Devices;
}
export interface RequestRemoveHardwareWallet {
    device: Devices;
}

export interface RequestGetHardwareWalletAccounts {
    device: Devices;
    pageIndex: number;
    pageSize: number;
}

export interface RequestImportHardwareWalletAccounts {
    device: Devices;
    deviceAccounts: DeviceAccountInfo[];
}

export interface RequestIsDeviceConnected {
    address: string;
}

export interface RequestSetAccountFilters {
    accountFilters: string[];
}

export interface RequestGenerateOnDemandReleaseNotes {
    version: string;
}

export type ResponseTypes = {
    [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][1];
};

export type ResponseType<TMessageType extends keyof RequestSignatures> =
    RequestSignatures[TMessageType][1];

export type ResponseGetState = Flatten<BlankAppUIState>;

export type SubscriptionMessageTypes = {
    [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][2];
};

export type StateSubscription = Flatten<BlankAppUIState>;

export interface ExternalEventSubscription {
    eventName: ProviderEvents;
    payload: any;
    portId?: string;
}

export interface TransportRequestMessage<TMessageType extends MessageTypes> {
    id: string;
    message: TMessageType;
    request: RequestTypes[TMessageType];
}

export interface WindowTransportRequestMessage
    extends TransportRequestMessage<EXTERNAL> {
    origin: Origin;
}

export interface TransportResponseMessage<TMessageType extends MessageTypes> {
    error?: string;
    id: string;
    response?: ResponseTypes[TMessageType];
    subscription?: SubscriptionMessageTypes[TMessageType];
}

export interface WindowTransportResponseMessage
    extends TransportResponseMessage<EXTERNAL> {
    origin: Origin;
}

export interface URParameter {
    type: string;
    cbor: string;
}
export interface SubmitQRHardwareCryptoHDKeyOrAccountMessage {
    ur: URParameter;
}

export interface SubmitQRHardwareSignatureMessage {
    requestId: string;
    ur: URParameter;
}
export interface CancelQRHardwareSignRequestMessage {}

export interface DismissMessage {}

export interface GetQRHardwareETHSignRequestMessage {
    ethTx: TypedTransaction;
    _fromAddress: string;
}

export enum Origin {
    BACKGROUND = 'BLANK_BACKGROUND',
    EXTENSION = 'BLANK_EXTENSION',
    PROVIDER = 'BLANK_PROVIDER',
    TREZOR_CONNECT = 'trezor-connect',
}

export interface ExtensionInstances {
    [id: string]: { port: browser.Runtime.Port };
}

export interface ProviderInstances {
    [id: string]: ProviderInstance;
}

export interface ProviderInstance {
    port: browser.Runtime.Port;
    tabId: number;
    windowId: number;
    origin: string;
    siteMetadata: SiteMetadata;
}

export interface Handler {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    subscriber?: (data: any) => void;
}

export interface UnlockHandler extends Handler {
    //port that is handling the unlock
    portId: string;
}

export type Handlers = Record<string, Handler>;

export enum BackgroundActions {
    CLOSE_WINDOW = 'CLOSE_WINDOW',
}

export interface RequestSetHotkeys {
    enabled: boolean;
}

export interface RequestTokensOrder {
    [tokenAddress: string]: number;
}

export interface RequestOrderAccounts {
    accountsInfo: AccountInfo[];
}

export interface RequestSetHideSmallBalances {
    enabled: boolean;
}
