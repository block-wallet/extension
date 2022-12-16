import { BigNumber } from "@ethersproject/bignumber"
import {
    AccountInfo,
    DeviceAccountInfo,
} from "@block-wallet/background/controllers/AccountTrackerController"
import {
    MessageTypes,
    RequestTypes,
    ResponseTypes,
    ResponseGetState,
    StateSubscription,
    SubscriptionMessageTypes,
    RequestAddNetwork,
    RequestEditNetwork,
    RequestEditNetworksOrder,
} from "@block-wallet/background/utils/types/communication"
import { Devices, ExchangeType, Messages } from "./commTypes"
import {
    IToken,
    ITokens,
    SearchTokensResponse,
    Token,
} from "@block-wallet/background/controllers/erc-20/Token"
import { SiteMetadata } from "@block-wallet/provider/types"
import {
    TransactionAdvancedData,
    TransactionMeta,
} from "@block-wallet/background/controllers/transactions/utils/types"
import {
    FeeMarketEIP1559Values,
    GasPriceValue,
    TransactionGasEstimation,
} from "@block-wallet/background/controllers/transactions/TransactionController"
import {
    PopupTabs,
    UserSettings,
} from "@block-wallet/background/controllers/PreferencesController"
import {
    DappReq,
    DappRequestConfirmOptions,
} from "@block-wallet/background/utils/types/ethereum"
import { TransactionFeeData } from "@block-wallet/background/controllers/erc-20/transactions/SignedTransaction"
import { handlers, port } from "./setup"
import { Currency } from "@block-wallet/background/utils/currency"
import {
    SwapParameters,
    SwapQuote,
    SwapTransaction,
} from "@block-wallet/background/controllers/SwapController"
import {
    OneInchSwapQuoteParams,
    OneInchSwapRequestParams,
} from "@block-wallet/background/utils/types/1inch"
import { generatePhishingPreventionBase64 } from "../util/phishingPrevention"
import {
    BridgeQuoteRequest,
    BridgeRoutesRequest,
    BridgeTransaction,
    GetBridgeAvailableRoutesResponse,
    GetBridgeQuoteResponse,
    GetBridgeQuoteNotFoundResponse,
} from "@block-wallet/background/controllers/BridgeController"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"

let requestId = 0

/**
 * Send message generic
 *
 */
const sendMessage = <TMessageType extends MessageTypes>(
    message: TMessageType,
    request?: RequestTypes[TMessageType],
    subscriber?: (data: SubscriptionMessageTypes[TMessageType]) => void
): Promise<ResponseTypes[TMessageType]> => {
    return new Promise((resolve, reject): void => {
        const id = `${Date.now()}.${++requestId}`

        handlers[id] = { reject, resolve, subscriber }

        port.postMessage({ id, message, request: request || {} })
    })
}

/**
 * Creates a new account on the current keyring
 */
export const createAccount = async (name: string): Promise<AccountInfo> => {
    return sendMessage(Messages.ACCOUNT.CREATE, { name })
}

/**
 * Returns account json data to export
 * Encrypted with password
 *
 * @param address account address
 * @param password Encrypting password
 * @returns Exported account info on JSON format
 */
export const exportAccountJson = async (
    address: string,
    password: string,
    encryptPassword: string
): Promise<string> => {
    return sendMessage(Messages.ACCOUNT.EXPORT_JSON, {
        address,
        password,
        encryptPassword,
    })
}

/**
 * Returns account private key data to export
 * Encrypted with password
 *
 * @param address account address
 * @param password vault password
 * @returns Exported account info on JSON format
 */
export const exportAccountPrivateKey = async (
    address: string,
    password: string
): Promise<string> => {
    return sendMessage(Messages.ACCOUNT.EXPORT_PRIVATE_KEY, {
        address,
        password,
    })
}

/**
 * Imports an account using a json file
 *
 * @param importArgs Import data
 * @param name Imported account name
 * @returns Imported account info
 */
export const importAccountJson = async (
    importArgs: { input: string; password: string },
    name: string
): Promise<AccountInfo> => {
    return sendMessage(Messages.ACCOUNT.IMPORT_JSON, { importArgs, name })
}

/**
 * Imports an account using the private key
 *
 * @param importArgs Import data
 * @param name Imported account name
 * @returns Imported account info
 */
export const importAccountPrivateKey = async (
    importArgs: { privateKey: string },
    name: string
): Promise<AccountInfo> => {
    return sendMessage(Messages.ACCOUNT.IMPORT_PRIVATE_KEY, {
        importArgs,
        name,
    })
}

/**
 * Hides the given account
 * It must be an internal account, otherwise the operation will not be performed.
 *
 * @param address account to be hidden
 */
export const hideAccount = async (address: string): Promise<boolean> => {
    return sendMessage(Messages.ACCOUNT.HIDE, { address })
}

/**
 * Unhides the given account
 *
 * It must be a hidden account, otherwise the operation will not be
performed.
 *
 * @param address account to be unhidden
 */
export const unhideAccount = async (address: string): Promise<boolean> => {
    return sendMessage(Messages.ACCOUNT.UNHIDE, { address })
}

/**
 * Deletes the selected account
 *
 * It must be the last account on the accountsIndex,
 * otherwise it will break when creating a new account
 *
 * @param address account to be deleted
 */
export const removeAccount = async (address: string): Promise<boolean> => {
    return sendMessage(Messages.ACCOUNT.REMOVE, { address })
}

/**
 * Renames selected account
 *
 * @param address account address
 * @param name new name
 */
export const renameAccount = async (
    address: string,
    name: string
): Promise<boolean> => {
    return sendMessage(Messages.ACCOUNT.RENAME, { address, name })
}

/**
 * Updates selected account
 *
 * @param address address to be selected
 */
export const selectAccount = async (address: string): Promise<boolean> => {
    return sendMessage(Messages.ACCOUNT.SELECT, { address })
}

/**
 * getAccountBalance
 *
 * It gets the specified account balance.
 *
 * @param address The account address
 * @returns The account balance.
 */
export const getAccountBalance = async (
    address: string
): Promise<BigNumber> => {
    return sendMessage(Messages.ACCOUNT.GET_BALANCE, address)
}

/**
 * getAccountNativeTokenBalanceForChain
 *
 * It gets the native token balance for a specified chain using the selected account.
 *
 * @param chainId The chain id
 * @returns The account's native token balance.
 */
export const getAccountNativeTokenBalanceForChain = async (
    chainId: number
): Promise<BigNumber | undefined> => {
    return sendMessage(Messages.ACCOUNT.GET_NATIVE_TOKEN_BALANCE, chainId)
}

/**
 * fetchLatestGasPriceForChain
 *
 * It fetches the latest gas price from the Fee service and/or the network for a specified chain
 *
 * @param chainId The chain id
 * @returns The gas price
 */
export const fetchLatestGasPriceForChain = async (
    chainId: number
): Promise<GasPriceData | undefined> => {
    return sendMessage(Messages.TRANSACTION.FETCH_LATEST_GAS_PRICE, chainId)
}
/**
 * Update last user activity time
 *
 * @param lastUserActivtyTime the new timeout
 */
export const setLastUserActiveTime = async (): Promise<void> => {
    return sendMessage(Messages.APP.SET_LAST_USER_ACTIVE_TIME)
}

/**
 * Set a custom time in minutes for the extension auto block
 *
 * @param idleTimeout the new timeout in minutes, should be greater than zero
 */
export const setIdleTimeout = async (idleTimeout: number): Promise<void> => {
    return sendMessage(Messages.APP.SET_IDLE_TIMEOUT, { idleTimeout })
}

/**
 * Returns the time in minutes for the extension auto block
 *
 */
export const getIdleTimeout = async (): Promise<number> => {
    return sendMessage(Messages.APP.GET_IDLE_TIMEOUT)
}

/**
 * Locks the current vault
 */
export const lockApp = async (): Promise<boolean> => {
    return sendMessage(Messages.APP.LOCK)
}

/**
 * Unlocks the current vault
 *
 * @param password user password
 */
export const unlockApp = async (password: string): Promise<boolean> => {
    return sendMessage(Messages.APP.UNLOCK, { password })
}

/**
 * Creates a new onboarding tab or focuses the current open one
 *
 */
export const returnToOnboarding = async (): Promise<void> => {
    return sendMessage(Messages.APP.RETURN_TO_ONBOARDING)
}

/**
 * Rejects all open and unconfirmed requests
 */
export const rejectUnconfirmedRequests = async (): Promise<void> => {
    return sendMessage(Messages.APP.REJECT_UNCONFIRMED_REQUESTS)
}

/**
 * It request the wallet seed phrase with the user password
 *
 * @returns The wallet seed phrase
 * @throws If the user password is invalid
 */
export const requestSeedPhrase = async (password: string): Promise<string> => {
    return sendMessage(Messages.WALLET.REQUEST_SEED_PHRASE, {
        password,
    })
}

/**
 * Verifies if the user has correctly completed the seed phrase challenge
 *
 * @param seedPhrase
 */
export const verifySeedPhrase = async (
    seedPhrase: string,
    password: string
): Promise<boolean> => {
    return sendMessage(Messages.WALLET.VERIFY_SEED_PHRASE, {
        password,
        seedPhrase,
    })
}

/**
 * Method to mark setup process as complete and to fire a notification.
 *
 */
export const completeSetup = async (
    sendNotification: boolean = true
): Promise<void> => {
    return sendMessage(Messages.WALLET.SETUP_COMPLETE, { sendNotification })
}

/**
 * Opens the tab-view to reset the wallet using a seed phrase
 *
 */
export const openReset = async (): Promise<void> => {
    return sendMessage(Messages.APP.OPEN_RESET)
}

/**
 * Verifies if the user's password is correct
 *
 * @param password user's password
 */
export const verifyPassword = async (password: string): Promise<boolean> => {
    return sendMessage(Messages.PASSWORD.VERIFY, {
        password,
    })
}

/**
 * Gets the current blank app state
 *
 * @returns Background state
 */
export const getState = async (): Promise<ResponseGetState> => {
    return sendMessage(Messages.STATE.GET)
}

/**
 * Resolves the address of an ENS name
 *
 * @returns address or null
 */
export const resolveEnsName = async (name: string): Promise<string | null> => {
    return sendMessage(Messages.ENS.RESOLVE_NAME, {
        name,
    })
}

/**
 * Looks up the ENS name of an address
 *
 * @returns ens name or null
 */
export const lookupAddressEns = async (
    address: string
): Promise<string | null> => {
    return sendMessage(Messages.ENS.LOOKUP_ADDRESS, {
        address,
    })
}

/**
 * Resolves the address of an UD name
 *
 * @returns address or null
 */
export const resolveUDName = async (name: string): Promise<string | null> => {
    return sendMessage(Messages.UD.RESOLVE_NAME, {
        name,
    })
}

/**
 * Sends ethereum or the network native currency
 *
 * @param to recipient
 * @param feeData gas fee data
 * @param value amount
 */
export const sendEther = async (
    to: string,
    feeData: TransactionFeeData,
    value: BigNumber,
    advancedData: TransactionAdvancedData
): Promise<string> => {
    return sendMessage(Messages.TRANSACTION.SEND_ETHER, {
        to,
        feeData,
        value,
        advancedData,
    })
}

/**
 * Adds a new unapproved send transaction
 *
 * @param address The token address (0x0 for the Network native currency)
 * @param to recipient
 * @param feeData gas fee data
 * @param value amount
 */
export const addNewSendTransaction = async (
    address: string,
    to: string,
    feeData: TransactionFeeData,
    value: BigNumber
): Promise<TransactionMeta> => {
    return sendMessage(Messages.TRANSACTION.ADD_NEW_SEND_TRANSACTION, {
        address,
        to,
        value,
        feeData,
    })
}

/**
 * Updates the gas on an existing unapproved Send transaction
 *
 * @param transactionId The transaction id
 * @param feeData gas fee data to update
 */
export const updateSendTransactionGas = async (
    transactionId: string,
    feeData: TransactionFeeData
): Promise<void> => {
    return sendMessage(Messages.TRANSACTION.UPDATE_SEND_TRANSACTION_GAS, {
        transactionId,
        feeData,
    })
}

/**
 * It approves an existing unapproved Send transaction
 *
 * @param transactionId The transaction id
 */
export const approveSendTransaction = async (
    transactionId: string
): Promise<void> => {
    return sendMessage(Messages.TRANSACTION.APPROVE_SEND_TRANSACTION, {
        transactionId,
    })
}

/**
 * It awaits for an already submitted Send transaction result
 *
 * @param transactionId The transaction id
 * @returns The transaction hash
 */
export const getSendTransactionResult = async (
    transactionId: string
): Promise<string> => {
    return sendMessage(Messages.TRANSACTION.GET_SEND_TRANSACTION_RESULT, {
        transactionId,
    })
}

/**
 * It calculates a Send transaction gas limit
 *
 * @param address The token contract address
 * @param to The `to` parameter
 * @param value The value to transfer
 * @returns The send estimated gas limit
 */
export const getSendTransactionGasLimit = async (
    address: string,
    to: string,
    value: BigNumber
): Promise<TransactionGasEstimation> => {
    return sendMessage(
        Messages.TRANSACTION.CALCULATE_SEND_TRANSACTION_GAS_LIMIT,
        {
            address,
            to,
            value,
        }
    )
}

/**
 * It obtains the current network latest gas price
 */
export const getLatestGasPrice = async (): Promise<BigNumber> => {
    return sendMessage(Messages.TRANSACTION.GET_LATEST_GAS_PRICE)
}

/**
 * Get all the erc20 tokens method
 *
 */
export const getTokens = (): Promise<ITokens> => {
    return sendMessage(Messages.TOKEN.GET_TOKENS, {})
}

/**
 * Get all the erc20 tokens that the user added method
 *
 */
export const getUserToken = (): Promise<ITokens> => {
    return sendMessage(Messages.TOKEN.GET_USER_TOKENS, {})
}

/**
 * get erc20 token method
 *
 * @param tokenAddress erc20 token address
 */
export const getToken = (tokenAddress: string): Promise<Token> => {
    return sendMessage(Messages.TOKEN.GET_TOKEN, {
        tokenAddress,
    })
}

/**
 * Get balance for a single token address
 *
 * @returns token balance for that account
 */
export const getTokenBalance = (
    tokenAddress: string,
    account: string
): Promise<BigNumber> => {
    return sendMessage(Messages.TOKEN.GET_BALANCE, {
        tokenAddress,
        account,
    })
}

/**
 * Add custom erc20 token method
 *
 * @param address erc20 token address
 * @param name erc20 token name
 * @param symbol erc20 token symbol
 * @param decimals erc20 token decimals
 */
export const addCustomToken = async (
    address: string,
    name: string,
    symbol: string,
    decimals: number,
    logo: string,
    type: string
): Promise<void | void[]> => {
    return sendMessage(Messages.TOKEN.ADD_CUSTOM_TOKEN, {
        address,
        name,
        symbol,
        decimals,
        logo,
        type,
    })
}

/**
 * Add custom erc20 tokens method
 *
 * @param tokens erc20 tokens array
 */
export const addCustomTokens = async (
    tokens: Token[]
): Promise<void | void[]> => {
    return sendMessage(Messages.TOKEN.ADD_CUSTOM_TOKENS, { tokens })
}

/**
 * Delete a custom erc20 tokens method
 *
 * @param address of the ERC20 token to delete
 */
export const deleteCustomToken = async (address: string): Promise<void> => {
    return sendMessage(Messages.TOKEN.DELETE_CUSTOM_TOKEN, { address })
}

/**
 * Sends erc20 token
 *
 * @param tokenAddress erc20 token address
 * @param to recipient
 * @param feeData gas fee data
 * @param value amount
 */
export const sendToken = async (
    tokenAddress: string,
    to: string,
    feeData: TransactionFeeData,
    value: BigNumber,
    advancedData: TransactionAdvancedData
): Promise<string> => {
    return sendMessage(Messages.TOKEN.SEND_TOKEN, {
        tokenAddress,
        to,
        value,
        feeData,
        advancedData,
    })
}

/**
 * Searches inside the assets list for tokens that matches the criteria
 *
 * @param query The user input query to search for (address, name, symbol)
 */
export const searchTokenInAssetsList = async (
    query: string,
    exact?: boolean,
): Promise<SearchTokensResponse> => {
    return sendMessage(Messages.TOKEN.SEARCH_TOKEN, {
        query,
        exact,
    })
}

/**
 * Search the token in the blockchain
 *
 * @param tokenAddress erc20 token address
 */
export const populateTokenData = async (
    tokenAddress: string
): Promise<Token> => {
    return sendMessage(Messages.TOKEN.POPULATE_TOKEN_DATA, {
        tokenAddress,
    })
}

/**
 * Creates a new BlockWallet
 *
 * @param password user password
 * @returns vault seed phrase
 */
export const createWallet = async (password: string): Promise<void> => {
    const antiPhishingImage = await generatePhishingPreventionBase64()
    return sendMessage(Messages.WALLET.CREATE, { password, antiPhishingImage })
}

/**
 * Imports the user's wallet to blank
 *
 * @param password user password
 * @param seedPhrase vault seed phrase
 */
export const importWallet = async (
    password: string,
    seedPhrase: string,
    defaultNetwork?: string
): Promise<boolean> => {
    const antiPhishingImage = await generatePhishingPreventionBase64()
    return sendMessage(Messages.WALLET.IMPORT, {
        password,
        seedPhrase,
        defaultNetwork,
        antiPhishingImage,
    })
}

/**
 * Reset the wallet with a seed phrase
 *
 * @param password user password
 * @param seedPhrase vault seed phrase
 */
export const resetWallet = async (
    password: string,
    seedPhrase: string
): Promise<boolean> => {
    const antiPhishingImage = await generatePhishingPreventionBase64()
    return sendMessage(Messages.WALLET.RESET, {
        password,
        seedPhrase,
        antiPhishingImage,
    })
}

/**
 * Updates the popup tab to focus when opening the popup next time
 */
export const updatePopupTab = async (popupTab: PopupTabs): Promise<void> => {
    return sendMessage(Messages.APP.UPDATE_POPUP_TAB, {
        popupTab,
    })
}

/**
 * Creates a new site with permissions
 *
 */
export const addNewSiteWithPermissions = (
    accounts: string[],
    origin: string,
    siteMetadata: SiteMetadata
) => {
    return sendMessage(Messages.PERMISSION.ADD_NEW, {
        accounts,
        origin,
        siteMetadata,
    })
}

/**
 * Confirms a pending permission request
 *
 */
export const confirmPermission = (id: string, accounts: string[] | null) => {
    return sendMessage(Messages.PERMISSION.CONFIRM, {
        id,
        accounts,
    })
}

/**
 * Confirms or rejects the specified dapp request
 *
 */
export const confirmDappRequest = <RequestType extends DappReq>(
    id: string,
    isConfirmed: boolean,
    confirmOptions?: DappRequestConfirmOptions[RequestType]
): Promise<void> => {
    return sendMessage(Messages.DAPP.CONFIRM_REQUEST, {
        id,
        isConfirmed,
        confirmOptions,
    })
}

/**
 * Attempts to reject the specified dapp request
 *
 */
export const attemptRejectDappRequest = (id: string): Promise<void> => {
    return sendMessage(Messages.DAPP.ATTEMPT_REJECT_REQUEST, {
        id,
    })
}

/**
 * Returns the sites the account is allowed to connect to
 *
 */
export const getAccountPermissions = (account: string) => {
    return sendMessage(Messages.PERMISSION.GET_ACCOUNT_PERMISSIONS, {
        account,
    })
}

/**
 * Remove account from a single site
 * If the site has no accounts left, then deletes the site
 *
 */
export const removeAccountFromSite = (origin: string, account: string) => {
    return sendMessage(Messages.PERMISSION.REMOVE_ACCOUNT_FROM_SITE, {
        origin,
        account,
    })
}

/**
 * Updates permissions for a specific site
 * If accounts is an empty array or null, deletes the site.
 *
 */
export const updateSitePermissions = (
    origin: string,
    accounts: string[] | null
) => {
    return sendMessage(Messages.PERMISSION.UPDATE_SITE_PERMISSIONS, {
        origin,
        accounts,
    })
}

/**
 * It calculates an Approve transaction gas limit
 *
 * @returns The Approve estimated gas limit
 */
export const getApproveTransactionGasLimit = async (
    tokenAddress: string,
    spender: string = "deposit",
    amount: BigNumber | "UNLIMITED" = "UNLIMITED"
): Promise<TransactionGasEstimation> => {
    return sendMessage(
        Messages.TRANSACTION.CALCULATE_APPROVE_TRANSACTION_GAS_LIMIT,
        {
            tokenAddress,
            spender,
            amount,
        }
    )
}

/**
 * Subscribes to state updates
 *
 * @param cb state update handler
 */
export const subscribeState = async (
    cb: (state: StateSubscription) => void
): Promise<boolean> => {
    return sendMessage(Messages.STATE.SUBSCRIBE, undefined, cb)
}

/**
 * Performs network change to the selected one.
 * @param networkName
 */
export const changeNetwork = async (networkName: string): Promise<boolean> => {
    return sendMessage(Messages.NETWORK.CHANGE, { networkName })
}

/**
 * Performs network change to the selected one.
 * @param networkName
 */
export const setShowTestNetworks = async (
    showTestNetworks: boolean
): Promise<boolean> => {
    return sendMessage(Messages.NETWORK.SET_SHOW_TEST_NETWORKS, {
        showTestNetworks,
    })
}

/**
 * Remove a network from the list of available networks
 *
 * @param chainId The chainId of the network to remove
 */
export const removeNetwork = async (chainId: number) => {
    return sendMessage(Messages.NETWORK.REMOVE_NETWORK, { chainId })
}

/**
 * Obtains the details(name, rpc list, icon, etc) of the specified chain
 *
 * @param chainId The chainId of the network to fetch the details from
 */
export const getSpecificChainDetails = async (chainId: number) => {
    return sendMessage(Messages.NETWORK.GET_SPECIFIC_CHAIN_DETAILS, { chainId })
}

/**
 * Adds a new network.
 *
 * @param networkInput The network information to be added.
 */
export const addNetwork = async (networkInput: RequestAddNetwork) => {
    return sendMessage(Messages.NETWORK.ADD_NETWORK, networkInput)
}

/**
 * Edit an existing network. You can only change the rpcUrl and the blockExplorerUrl fields.
 *
 * @param networkInput The network information to be edited.
 */
export const editNetwork = async (editNetworkInput: RequestEditNetwork) => {
    return sendMessage(Messages.NETWORK.EDIT_NETWORK, editNetworkInput)
}

/**
 * Edit networks order.
 *
 */
export const editNetworksOrder = async (
    editNetworksOrder: RequestEditNetworksOrder
) => {
    return sendMessage(Messages.NETWORK.EDIT_NETWORKS_ORDER, editNetworksOrder)
}

/**
 * Fetches the chainId from the specified rpc url
 *
 * @param rpcUrl The url of the chain rpc
 */
export const getRpcChainId = async (rpcUrl: string) => {
    return sendMessage(Messages.NETWORK.GET_RPC_CHAIN_ID, { rpcUrl })
}

/**
 * Performs transaction confirm with specific transaction meta.
 * @param transactionMeta
 */
export const confirmTransaction = async (
    transactionId: string,
    feeData: TransactionFeeData,
    advancedData: TransactionAdvancedData
) => {
    return sendMessage(Messages.TRANSACTION.CONFIRM, {
        id: transactionId,
        feeData,
        advancedData,
    })
}

/**
 * Rejects the transaction specified by id.
 * @param transactionId
 */
export const rejectTransaction = async (transactionId: string) => {
    return sendMessage(Messages.TRANSACTION.REJECT, { transactionId })
}

/**
 * Rejects an speedUp/cancel transaction
 * @param transactionId
 */
export const rejectReplacementTransaction = async (transactionId: string) => {
    return sendMessage(Messages.TRANSACTION.REJECT_REPLACEMENT_TRANSACTION, {
        transactionId,
    })
}

/**
 * Allow to cancel a transaction. It does it by creating a **new transaction**
 * with a 0 amount, but higher gas fee.
 * @param transactionId
 */
export const cancelTransaction = async (
    transactionId: string,
    gasLimit?: BigNumber,
    gasValues?: GasPriceValue | FeeMarketEIP1559Values
) => {
    return sendMessage(Messages.TRANSACTION.CANCEL_TRANSACTION, {
        transactionId,
        gasValues,
        gasLimit,
    })
}

/**
 * Allow to speed up a transaction. It does it by creating a **new transaction**
 * with the same amount, but higher gas fee.
 * @param transactionId
 */
export const speedUpTransaction = async (
    transactionId: string,
    gasLimit?: BigNumber,
    gasValues?: GasPriceValue | FeeMarketEIP1559Values
) => {
    return sendMessage(Messages.TRANSACTION.SPEED_UP_TRANSACTION, {
        transactionId,
        gasValues,
        gasLimit,
    })
}

/**
 * Get the gas price of a cancel transaction
 * @param transactionId
 */
export const getCancelGasPrice = async (transactionId: string) => {
    return sendMessage(Messages.TRANSACTION.GET_CANCEL_GAS_PRICE, {
        transactionId,
    })
}

/**
 * Get the gas price of a speed up transaction
 * @param transactionId
 */
export const getSpeedUpGasPrice = async (transactionId: string) => {
    return sendMessage(Messages.TRANSACTION.GET_SPEED_UP_GAS_PRICE, {
        transactionId,
    })
}

/**
 * Remove all entries in the book
 *
 */
export const addressBookClear = async () => {
    return sendMessage(Messages.ADDRESS_BOOK.CLEAR, {})
}

/**
 * Remove a contract entry by address
 *
 * @param address - Recipient address to delete
 */
export const addressBookDelete = async (address: string) => {
    return sendMessage(Messages.ADDRESS_BOOK.DELETE, { address })
}

/**
 * Add or update a contact entry by address
 *
 * @param address - Recipient address to add or update
 * @param name - Nickname to associate with this address
 * @param note - User's note about address
 * @returns - Boolean indicating if the address was successfully set
 */
export const addressBookSet = async (
    address: string,
    name: string,
    note: string
) => {
    return sendMessage(Messages.ADDRESS_BOOK.SET, { address, name, note })
}

/**
 * Get the contacts
 *
 * @returns - A map with the entries
 */
export const addressBookGet = async () => {
    return sendMessage(Messages.ADDRESS_BOOK.GET, {})
}

/**
 * Get the contacts
 *
 * @param address - Recipient address to search
 *
 * @returns - A address book entry
 */
export const addressBookByAddress = async (address: string) => {
    return sendMessage(Messages.ADDRESS_BOOK.GET_BY_ADDRESS, { address })
}

/**
 * Get the recent addresses with which the wallet has interacted
 *
 * @param limit - Optional. The maximun number of recent address to return.
 *
 * @returns - A map with the entries
 */
export const addressBookGetRecentAddresses = async (limit?: number) => {
    return sendMessage(Messages.ADDRESS_BOOK.GET_RECENT_ADDRESSES, { limit })
}

/**
 * Stores the user settings.
 * @param settings Object containing settings and values to store.
 */
export const setUserSettings = async (settings: UserSettings) => {
    return sendMessage(Messages.APP.SET_USER_SETTINGS, { settings })
}

/**
 * Get the contacts
 *
 * @param address - Recipient address to search
 *
 * @returns - A address book entry
 */
export const getNextNonce = async (address: string) => {
    return sendMessage(Messages.TRANSACTION.GET_NEXT_NONCE, { address })
}

/**
 * Dismisses the welcome to the wallet message
 */
export const dismissWelcomeMessage = async (): Promise<boolean> => {
    return sendMessage(Messages.WALLET.DISMISS_WELCOME_MESSAGE, {})
}

/**
 * Dismisses the default wallet preferences
 */
export const dismissDefaultWalletPreferences = async (): Promise<boolean> => {
    return sendMessage(Messages.WALLET.DISMISS_DEFAULT_WALLET_PREFERENCES, {})
}

/**
 * Dismisses the release notes message
 */
export const dismissReleaseNotes = async (): Promise<boolean> => {
    return sendMessage(Messages.WALLET.DISMISS_RELEASE_NOTES, {})
}

/**
 * Updates release notes subscription status
 * @param enabled Subscription to release notes status
 */
export const toggleReleaseNotesSubscription = async (
    enabled: boolean
): Promise<void> => {
    return sendMessage(Messages.WALLET.TOGGLE_RELEASE_NOTES_SUBSCRIPTION, {
        releaseNotesSubscriptionEnabled: enabled,
    })
}

/**
 * Updates the default browser wallet
 * @param enabled default browser wallet status
 */
export const toggleDefaultBrowserWallet = async (
    enabled: boolean
): Promise<void> => {
    return sendMessage(Messages.WALLET.TOGGLE_DEFAULT_BROWSER_WALLET, {
        defaultBrowserWalletEnabled: enabled,
    })
}

/**
 * Sets the provided base64 image as the phishing protection picture
 * @param image the base64 image to be used for phishing protection
 */
export const updateAntiPhishingImage = async (image: string): Promise<void> => {
    return sendMessage(Messages.WALLET.UPDATE_ANTI_PHISHING_IMAGE, {
        antiPhishingImage: image,
    })
}

/**
 * Updates phishing protection status
 * @param enabled Whether user wants to use the phishing protection feature or not.
 */
export const toggleAntiPhishingProtection = async (
    enabled: boolean
): Promise<void> => {
    return sendMessage(Messages.WALLET.TOGGLE_ANTI_PHISHING_PROTECTION, {
        antiPhishingProtectionEnabeld: enabled,
    })
}

/**
 * Sets the user's native currency.
 * @param currencyCode A valid curency code.
 */
export const setNativeCurrency = async (
    currencyCode: string
): Promise<void> => {
    return sendMessage(Messages.WALLET.SET_NATIVE_CURRENCY, {
        currencyCode,
    })
}

/**
 * Gets all the supported currencies
 * @returns a list of all the valid currencies
 */
export const getValidCurrencies = async (): Promise<Currency[]> => {
    return sendMessage(Messages.WALLET.GET_VALID_CURRENCIES)
}

/**
 * Opens the extension tab (TODO: test window) to connect a hardware wallet
 *
 */
export const openHardwareConnect = async (): Promise<void> => {
    return sendMessage(Messages.APP.OPEN_HW_CONNECT)
}
/**
 * Opens the extension tab (TODO: test window) to remove a hardware wallet
 *
 */
export const openHardwareRemove = async (): Promise<void> => {
    return sendMessage(Messages.APP.OPEN_HW_REMOVE)
}

/**
 * Opens the extension tab (TODO: test window) to connect a hardware wallet
 *
 */
export const openHardwareReconnect = async (address: string): Promise<void> => {
    return sendMessage(Messages.APP.OPEN_HW_RECONNECT, { address })
}

/**
 * It connects a hardware wallet to the extension
 */
export const connectHardwareWallet = async (
    device: Devices
): Promise<boolean> => {
    return sendMessage(Messages.WALLET.HARDWARE_CONNECT, { device })
}

/**
 * It gets a paginated list of a connected hardware wallet device accounts
 */
export const getHardwareWalletAccounts = async (
    device: Devices,
    pageIndex: number = 0,
    pageSize: number = 5
): Promise<AccountInfo[]> => {
    return sendMessage(Messages.WALLET.HARDWARE_GET_ACCOUNTS, {
        device,
        pageIndex,
        pageSize,
    })
}

/**
 * It imports a list of accounts from a hardware wallet to the extension
 */
export const importHardwareWalletAccounts = async (
    deviceAccounts: DeviceAccountInfo[],
    device: Devices
): Promise<AccountInfo[]> => {
    return sendMessage(Messages.WALLET.HARDWARE_IMPORT_ACCOUNTS, {
        deviceAccounts,
        device,
    })
}

/**
 * setHardwareWalletHDPath
 *
 * It sets the HD path for a hardware wallet device
 *
 * @param device The device to set the HD path for
 * @param path The HD path to set
 */
export const setHardwareWalletHDPath = async (
    device: Devices,
    path: string
): Promise<void> => {
    return sendMessage(Messages.WALLET.HARDWARE_SET_HD_PATH, {
        device,
        path,
    })
}

/**
 * getHardwareWalletHDPath
 *
 * It gets the HD path for a hardware wallet device
 *
 * @param device The device to get the HD path from
 * @returns The HD path for the device
 */
export const getHardwareWalletHDPath = async (
    device: Devices
): Promise<string> => {
    return sendMessage(Messages.WALLET.HARDWARE_GET_HD_PATH, {
        device,
    })
}

export const getWindowId = () => {
    return sendMessage(Messages.BROWSER.GET_WINDOW_ID)
}

export const searchChainsByTerm = async (term: string) => {
    return sendMessage(Messages.NETWORK.SEARCH_CHAINS, {
        term,
    })
}

/**
 * Generates on demand release notes for the release-notes route.
 * @param version The version of the release notes
 */
export const generateOnDemandReleaseNotes = async (version: string) => {
    return sendMessage(Messages.WALLET.GENERATE_ON_DEMAND_RELEASE_NOTES, {
        version,
    })
}

/**
 * Updates the account filters
 *
 * @param filters Array of account filters
 */
export const updateAccountFilters = async (
    filters: string[]
): Promise<void> => {
    return sendMessage(Messages.FILTERS.SET_ACCOUNT_FILTERS, {
        accountFilters: filters,
    })
}

/**
 * isAccountDeviceLinked
 *
 * Checks if the current account device is connected.
 * This applies only to Ledger devices. Every other keyring type returns true.
 *
 * @param address The address of the account to check
 * @returns Whether the account device is connected or not
 */
export const isAccountDeviceLinked = async (
    address: string
): Promise<boolean> => {
    return sendMessage(Messages.WALLET.HARDWARE_IS_LINKED, {
        address,
    })
}

/**
 * It removes a hardware from to the extension
 */
export const removeHardwareWallet = async (
    device: Devices
): Promise<boolean> => {
    return sendMessage(Messages.WALLET.HARDWARE_REMOVE, { device })
}

/**
 * Checks if the given account has enough allowance to make the exchange
 *
 * @param account User account
 * @param amount Amount to be spended
 * @param exchangeType Exchange type
 * @param tokenAddress Asset to be spended address
 */
export const checkExchangeAllowance = async (
    account: string,
    amount: BigNumber,
    exchangeType: ExchangeType,
    tokenAddress: string
): Promise<boolean> => {
    return sendMessage(Messages.EXCHANGE.CHECK_ALLOWANCE, {
        account,
        amount,
        exchangeType,
        tokenAddress,
    })
}

/**
 * Submits an approval transaction to setup asset allowance
 *
 * @param allowance User selected allowance
 * @param amount Exchange amount
 * @param exchangeType The exchange type
 * @param feeData Transaction gas fee data
 * @param tokenAddress Spended asset token address
 * @param customNonce Custom transaction nonce
 */
export const approveExchange = async (
    allowance: BigNumber,
    amount: BigNumber,
    exchangeType: ExchangeType,
    feeData: TransactionFeeData,
    tokenAddress: string,
    customNonce?: number
): Promise<boolean> => {
    return sendMessage(Messages.EXCHANGE.APPROVE, {
        allowance,
        amount,
        exchangeType,
        feeData,
        tokenAddress,
        customNonce,
    })
}

/**
 * Gets a quote for the specified exchange type and parameters
 *
 * @param exchangeType Exchange type
 * @param quoteParams Quote parameters
 */
export const getExchangeQuote = async (
    exchangeType: ExchangeType,
    quoteParams: OneInchSwapQuoteParams
): Promise<SwapQuote> => {
    return sendMessage(Messages.EXCHANGE.GET_QUOTE, {
        exchangeType,
        quoteParams,
    })
}

/**
 * Fetch the transaction parameters to make the exchange
 *
 * @param exchangeType Exchange type
 * @param exchangeParams Exchange parameters
 */
export const getExchangeParameters = async (
    exchangeType: ExchangeType,
    exchangeParams: OneInchSwapRequestParams
): Promise<SwapParameters> => {
    return sendMessage(Messages.EXCHANGE.GET_EXCHANGE, {
        exchangeType,
        exchangeParams,
    })
}

/**
 * Executes the exchange
 *
 * @param exchangeType Exchange type
 * @param exchangeParams Exchange parameters
 */
export const executeExchange = async (
    exchangeType: ExchangeType,
    exchangeParams: SwapTransaction
): Promise<string> => {
    return sendMessage(Messages.EXCHANGE.EXECUTE, {
        exchangeType,
        exchangeParams,
    })
}

/**
 * Sets the user's current network status
 *
 * @param networkStatus The current network status
 */
export const setNetworkStatus = async (
    networkStatus: boolean
): Promise<void> => {
    return sendMessage(Messages.APP.SET_USER_ONLINE, { networkStatus })
}

/**
 * Subscribes to navigator network status
 */
export const subscribeNetworkStatus = () => {
    if (window && window.navigator) {
        window.addEventListener("online", () => setNetworkStatus(true))
        window.addEventListener("offline", () => setNetworkStatus(false))
    }
}
/**
 * Returns the available tokes for bridging in the current user's network
 */
export const getBridgeTokens = async (): Promise<IToken[]> => {
    return sendMessage(Messages.BRIDGE.GET_BRIDGE_TOKENS)
}

/**
 * Returns all the available routes based on the parameters specified in the request.
 * The fromChainId value is automatically filled with the current user's network
 * @param fromTokenAddress Address of the token from which the user want to bridge
 * @param toChainId Optional destination chain Id
 * @param toTokenAddress Optional destination token address in the destination chain Id
 */
export const getBridgeAvailableRoutes = async (
    routesRequest: BridgeRoutesRequest
): Promise<GetBridgeAvailableRoutesResponse> => {
    return sendMessage(Messages.BRIDGE.GET_BRIDGE_ROUTES, {
        routesRequest,
    })
}

//export const getBridgeRoute = async():

/**
 * Submits an approval transaction to setup asset allowance
 *
 * @param allowance User selected allowance
 * @param amount Exchange amount
 * @param spenderAddress The spender address for the allowance
 * @param feeData Transaction gas fee data
 * @param tokenAddress Spended asset token address
 * @param customNonce Custom transaction nonce
 */
export const approveBridgeAllowance = async (
    allowance: BigNumber,
    amount: BigNumber,
    spenderAddress: string,
    feeData: TransactionFeeData,
    tokenAddress: string,
    customNonce?: number
): Promise<boolean> => {
    return sendMessage(Messages.BRIDGE.APPROVE_BRIDGE_ALLOWANCE, {
        allowance,
        amount,
        spenderAddress,
        feeData,
        tokenAddress,
        customNonce,
    })
}

/**
 * Gets a bridge quote for the  parameters and optionally checks the allowance for the transaction sepender
 *
 * @param quoteParams Quote parameters
 */
export const getBridgeQuote = async (
    quoteRequest: BridgeQuoteRequest,
    checkAllowance: boolean = false
): Promise<GetBridgeQuoteResponse | GetBridgeQuoteNotFoundResponse> => {
    return sendMessage(Messages.BRIDGE.GET_BRIDGE_QUOTE, {
        quoteRequest,
        checkAllowance,
    })
}

/**
 * Executes the specified bridge transaction
 *
 * @param bridgeTransaction Parameters got after requesting a quote and cusotm one specified by the user
 */
export const executeBridge = async (
    bridgeTransaction: BridgeTransaction
): Promise<string> => {
    return sendMessage(Messages.BRIDGE.EXECUTE_BRIDGE, {
        bridgeTransaction,
    })
}
