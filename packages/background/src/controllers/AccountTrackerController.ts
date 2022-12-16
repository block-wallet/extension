import NetworkController, { NetworkEvents } from './NetworkController';
import { BaseController } from '../infrastructure/BaseController';
import { BigNumber, ethers } from 'ethers';
import {
    ImportStrategy,
    ImportArguments,
    importHandler,
} from '../utils/account';
import {
    NATIVE_TOKEN_ADDRESS,
    TokenController,
    TokenControllerEvents,
} from './erc-20/TokenController';
import { Token } from './erc-20/Token';
import { toChecksumAddress } from 'ethereumjs-util';
import { TokenOperationsController } from './erc-20/transactions/Transaction';
import { Mutex } from 'async-mutex';
import initialState from '../utils/constants/initialState';
import log from 'loglevel';
import KeyringControllerDerivated from './KeyringControllerDerivated';
import {
    BalanceMap,
    getAddressBalances as getAddressBalancesFromSingleCallBalancesContract,
    isSingleCallBalancesContractAvailable,
} from '../utils/balance-checker/balanceChecker';
import { cloneDeep } from 'lodash';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../utils/constants/networks';
import { PreferencesController } from './PreferencesController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import { Devices } from '../utils/types/hardware';

export enum AccountStatus {
    ACTIVE = 'ACTIVE',
    HIDDEN = 'HIDDEN',
}

import checksummedAddress from '../utils/checksummedAddress';
import {
    TransactionTypeEnum,
    TransactionWatcherController,
    TransactionWatcherControllerEvents,
} from './TransactionWatcherController';
import { isNativeTokenAddress } from '../utils/token';

export interface AccountBalanceToken {
    token: Token;
    balance: BigNumber;
}
export interface AccountBalanceTokens {
    [address: string]: AccountBalanceToken;
}
export interface AccountBalance {
    nativeTokenBalance: BigNumber;
    tokens: AccountBalanceTokens;
}

export interface AccountBalances {
    [chainId: number]: AccountBalance;
}

/**
 * The type of the added account
 */
export enum AccountType {
    HD_ACCOUNT = 'HD Account',
    LEDGER = 'Ledger',
    TREZOR = 'Trezor',
    EXTERNAL = 'External',
}

export interface AccountInfo {
    address: string;
    name: string;
    index: number; // for sorting purposes
    accountType: AccountType; // indicates if it was derivated from the seed phrase (false) or imported (true)
    balances: AccountBalances;
    status: AccountStatus; //account info metadata calculated in the UI from the hiddenAccounts
}

export interface DeviceAccountInfo {
    /**
     * The derivation index in the device specified HD path
     */
    index: number;

    /**
     * The name of the account to add
     */
    name: string;

    /**
     * The account address
     */
    address: string;
}

export interface Accounts {
    [address: string]: AccountInfo;
}

export interface AccountTrackerState {
    accounts: Accounts;
    hiddenAccounts: Accounts;
    isAccountTrackerLoading: boolean;
}

export enum AccountTrackerEvents {
    ACCOUNT_ADDED = 'ACCOUNT_ADDED',
    ACCOUNT_REMOVED = 'ACCOUNT_REMOVED',
    CLEARED_ACCOUNTS = 'CLEARED_ACCOUNTS',
}

export interface UpdateAccountsOptions {
    addresses?: string[];
    assetAddresses: string[];
}

export class AccountTrackerController extends BaseController<AccountTrackerState> {
    private readonly _mutex: Mutex;
    private readonly _balanceFetchIntervalController: ActionIntervalController;
    constructor(
        private readonly _keyringController: KeyringControllerDerivated,
        private readonly _networkController: NetworkController,
        private readonly _tokenController: TokenController,
        private readonly _tokenOperationsController: TokenOperationsController,
        private readonly _preferencesController: PreferencesController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly _transactionWatcherController: TransactionWatcherController,
        initialState: AccountTrackerState = {
            accounts: {},
            hiddenAccounts: {},
            isAccountTrackerLoading: false,
        }
    ) {
        super(initialState);
        this._mutex = new Mutex();
        this._balanceFetchIntervalController = new ActionIntervalController(
            this._networkController
        );

        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            async (network: Network) => {
                this.store.updateState({ isAccountTrackerLoading: true });
                try {
                    // Build chain balances
                    this._buildBalancesForChain(network.chainId);

                    // Update the selected account balances
                    const selectedAddress =
                        this._preferencesController.getSelectedAddress();

                    await this.updateAccounts({
                        addresses: [selectedAddress],
                        assetAddresses: [NATIVE_TOKEN_ADDRESS],
                    });
                    if (
                        Object.keys(this.store.getState().accounts).length > 1
                    ) {
                        this.updateAccounts({
                            assetAddresses: [NATIVE_TOKEN_ADDRESS],
                        });
                    }
                } catch (err) {
                    log.warn(
                        'An error ocurred while updating the accounts',
                        err.message
                    );
                } finally {
                    this.store.updateState({ isAccountTrackerLoading: false });
                }
            }
        );

        this._tokenController.on(
            TokenControllerEvents.USER_TOKEN_CHANGE,
            async (
                accountAddress: string,
                chainId: number,
                tokenAddresses: string[] = []
            ) => {
                try {
                    // If array tokenAddresses contains at least 1 value, we update that asset balance, else we update all account balances
                    if (tokenAddresses.length > 0) {
                        await this.updateAccounts(
                            {
                                addresses: [accountAddress],
                                assetAddresses: tokenAddresses,
                            },
                            chainId
                        );
                    } else {
                        await this.updateAccounts(
                            {
                                addresses: [accountAddress],
                                assetAddresses:
                                    await this._tokenController.getUserTokenContractAddresses(
                                        accountAddress,
                                        chainId
                                    ),
                            },
                            chainId
                        );
                    }
                } catch (err) {
                    log.warn(
                        'An error ocurred while updating the accouns',
                        err.message
                    );
                }
            }
        );

        // Subscription to new blocks
        this._blockUpdatesController.on(
            BlockUpdatesEvents.BLOCK_UPDATES_SUBSCRIPTION,
            async (chainId: number) => {
                const network =
                    this._networkController.getNetworkFromChainId(chainId);
                const balanceFetchInterval =
                    network?.actionsTimeIntervals.balanceFetch ||
                    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.balanceFetch;

                this._balanceFetchIntervalController.tick(
                    balanceFetchInterval,
                    async () => {
                        await this.updateAccounts(
                            {
                                assetAddresses: [NATIVE_TOKEN_ADDRESS],
                            },
                            chainId
                        );
                    }
                );
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.INCOMING_TRANSACTION,
            async (
                chainId: number,
                address: string,
                transactionType: TransactionTypeEnum
            ) => {
                if (transactionType === TransactionTypeEnum.Native) {
                    await this.updateAccounts(
                        {
                            addresses: [address],
                            assetAddresses: [NATIVE_TOKEN_ADDRESS],
                        },
                        chainId
                    );
                }
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.NEW_ERC20_TRANSACTIONS,
            async (chainId: number, accountAddress: string) => {
                const assetAddresses: string[] = [];

                assetAddresses.push(
                    ...(await this._tokenController.getContractAddresses(
                        chainId
                    ))
                );

                await this.updateAccounts(
                    {
                        addresses: [accountAddress],
                        assetAddresses,
                    },
                    chainId
                );
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.NEW_KNOWN_ERC20_TRANSACTIONS,
            async (
                chainId: number,
                accountAddress: string,
                tokenAddresses: string[]
            ) => {
                await this.updateAccounts(
                    {
                        addresses: [accountAddress],
                        assetAddresses: tokenAddresses,
                    },
                    chainId
                );
            }
        );
    }

    /**
     * Adds the primary account to the account tracker
     *
     * @param address account address
     * @param name new name
     */
    public addPrimaryAccount(address: string): void {
        // Checksum address
        address = toChecksumAddress(address);

        const primaryAccountInfo: AccountInfo = {
            address,
            name: 'Account 1',
            accountType: AccountType.HD_ACCOUNT,
            index: 0, // first account
            balances: {},
            status: AccountStatus.ACTIVE,
        };

        this.store.updateState({
            accounts: { [address]: primaryAccountInfo },
        });

        // Emit account update
        this.emit(AccountTrackerEvents.ACCOUNT_ADDED, address);

        this.updateAccounts({
            addresses: [address],
            assetAddresses: [NATIVE_TOKEN_ADDRESS],
        });
    }

    /**
     * Creates a new account
     *
     * @param name new account's name
     */
    public async createAccount(name: string): Promise<AccountInfo> {
        // Create the account in vault
        const account = await this._keyringController.createAccount();

        // Get new created account
        const newAccount = toChecksumAddress(account);

        // Get current accounts
        const trackedAccounts = this.store.getState().accounts;

        // Calculates new account index
        const accountIndex = this._getNewAccountIndex(trackedAccounts);

        // Add new account to the account tracker
        const accountInfo: AccountInfo = {
            address: newAccount,
            name: name,
            index: accountIndex,
            accountType: AccountType.HD_ACCOUNT,
            balances: {},
            status: AccountStatus.ACTIVE,
        };
        trackedAccounts[newAccount] = accountInfo;

        // Update state
        this.store.updateState({
            accounts: trackedAccounts,
        });

        await this.updateAccounts({
            addresses: [newAccount],
            assetAddresses: [NATIVE_TOKEN_ADDRESS],
        });

        // Emit account update
        this.emit(AccountTrackerEvents.ACCOUNT_ADDED, newAccount);

        return accountInfo;
    }

    /**
     * importHardwareWalletAccounts
     *
     * Imports all the accounts that the user has specified from the device
     * into the keyring and returns a list of addresses
     *
     * @param accounts A list of indexes of every selected account in the derivation path
     * @param device The device type
     *
     * @returns A list of added accounts to the wallet
     */
    public async importHardwareWalletAccounts(
        deviceAccounts: DeviceAccountInfo[],
        device: Devices
    ): Promise<AccountInfo[]> {
        // Get accounts indexes
        const indexes = deviceAccounts.map(({ index }) => index);

        // Import accounts into keyring
        await this._keyringController.importHardwareWalletAccounts(
            indexes,
            device
        );

        // Get current tracked accounts
        const trackedAccounts = this.store.getState().accounts;

        const updatedAccounts: AccountInfo[] = [];
        for (const { address, name } of deviceAccounts) {
            // Skip already imported accounts
            if (address in trackedAccounts) {
                continue;
            }

            // Checksum received account address
            const newAccount = toChecksumAddress(address);

            // Calculates new account index
            const accountIndex = this._getNewAccountIndex(trackedAccounts);

            // Add new account to the account tracker
            const accountInfo: AccountInfo = {
                address: newAccount,
                name,
                accountType:
                    device === Devices.LEDGER
                        ? AccountType.LEDGER
                        : AccountType.TREZOR, // HW wallet account
                index: accountIndex,
                balances: {},
                status: AccountStatus.ACTIVE,
            };
            updatedAccounts.push(accountInfo);

            // Set account in trackedAccount object
            trackedAccounts[newAccount] = accountInfo;
        }

        // Update state
        this.store.updateState({
            accounts: trackedAccounts,
        });

        await this.updateAccounts({
            addresses: updatedAccounts.map((a) => {
                return a.address;
            }),
            assetAddresses: [NATIVE_TOKEN_ADDRESS],
        });

        return updatedAccounts;
    }

    /**
     * Imports an account with the specified import strategy.
     * Each strategy represents a different way of serializing an Ethereum key pair.
     *
     * @param {ImportStrategy} strategy - A unique identifier for an account import strategy.
     * @param {ImportArguments} args - The data required by that strategy to import an account.
     */
    public async importAccount(
        strategy: ImportStrategy,
        importArgs: ImportArguments[typeof strategy],
        name: string
    ): Promise<AccountInfo> {
        const privateKey = await importHandler[strategy](
            importArgs as {
                privateKey: string;
                input: string;
                password: string;
            }
        );

        const newAccount = toChecksumAddress(
            await this._keyringController.importAccount(privateKey)
        );

        // Get current tracked accounts
        const trackedAccounts = this.store.getState().accounts;

        // Calculates new account index
        const accountIndex = this._getNewAccountIndex(trackedAccounts);

        // Add new account to the account tracker
        const accountInfo: AccountInfo = {
            address: newAccount,
            name: name,
            accountType: AccountType.EXTERNAL, // imported account
            index: accountIndex,
            balances: {},
            status: AccountStatus.ACTIVE,
        };
        trackedAccounts[newAccount] = accountInfo;

        // Update state
        this.store.updateState({
            accounts: trackedAccounts,
        });

        await this.updateAccounts({
            addresses: [newAccount],
            assetAddresses: [NATIVE_TOKEN_ADDRESS],
        });

        // Emit account update
        this.emit(AccountTrackerEvents.ACCOUNT_ADDED, newAccount);

        return accountInfo;
    }

    /**
     * Removes account
     *
     * @param address - account to be removed
     */
    public async removeAccount(address: string): Promise<boolean> {
        const { accounts } = this.store.getState();

        if (!accounts[address]) {
            throw new Error('Account not found');
        }

        if (accounts[address].accountType === AccountType.HD_ACCOUNT) {
            throw new Error('Cannot internal HD accounts');
        }

        // if account is currently selected, change accounts
        if (address === this._preferencesController.getSelectedAddress()) {
            const accountsCopy = { ...accounts };
            delete accountsCopy[address];

            this._preferencesController.setSelectedAddress(
                accountsCopy[Object.keys(accountsCopy)[0]].address
            );
        }

        // Remove from account tracker
        delete accounts[address];

        // Update state
        this.store.updateState({ accounts });

        // Emit account removal
        this.emit(AccountTrackerEvents.ACCOUNT_REMOVED, address);

        return true;
    }

    /**
     * Hide account
     *
     * @param address - account to be removed
     */
    public async hideAccount(address: string): Promise<boolean> {
        const { accounts } = this.store.getState();

        if (!accounts[address]) {
            throw new Error('Account not found');
        }

        if (accounts[address].accountType !== AccountType.HD_ACCOUNT) {
            throw new Error('Can only hide internal accounts');
        }

        // if only one internal account exists, cannot hide it
        let internalAccounts = 0;

        for (const address of Object.keys(accounts)) {
            if (accounts[address].accountType === AccountType.HD_ACCOUNT) {
                internalAccounts++;
            }
        }

        if (internalAccounts === 1) {
            throw new Error("Can't hide last internal account");
        }

        // if account is currently selected, change accounts
        if (address === this._preferencesController.getSelectedAddress()) {
            const accountsCopy = { ...accounts };
            delete accountsCopy[address];

            this._preferencesController.setSelectedAddress(
                accountsCopy[Object.keys(accountsCopy)[0]].address
            );
        }

        // Add to hidden accounts
        this.addHiddenAccount(accounts[address]);

        // Remove from account tracker
        delete accounts[address];

        // Update state
        this.store.updateState({ accounts });

        // Emit account removal
        this.emit(AccountTrackerEvents.ACCOUNT_REMOVED, address);

        return true;
    }

    /**
     * Unhide account
     *
     * @param address - account to be unhidden
     */
    public async unhideAccount(address: string): Promise<boolean> {
        const { accounts, hiddenAccounts } = this.store.getState();

        if (!hiddenAccounts[address]) {
            throw new Error('Account not found');
        }

        // Add account to accounts
        accounts[address] = {
            ...hiddenAccounts[address],
            status: AccountStatus.ACTIVE,
        };

        // Remove from hidden accounts
        delete hiddenAccounts[address];

        // Update state
        this.store.updateState({ accounts, hiddenAccounts });

        // Emit account removal
        this.emit(AccountTrackerEvents.ACCOUNT_REMOVED, address);

        return true;
    }

    /*
     * Adds account to hidden accounts
     *
     */
    public addHiddenAccount(account: AccountInfo): void {
        const { hiddenAccounts } = this.store.getState();
        this.store.updateState({
            hiddenAccounts: {
                ...(hiddenAccounts || {}),
                [account.address]: {
                    ...account,
                    status: AccountStatus.HIDDEN,
                },
            },
        });
    }

    /**
     * Renames selected account
     *
     * @param address account address
     * @param name new name
     */
    public renameAccount(address: string, name: string): void {
        const { accounts } = this.store.getState();

        if (!accounts[address]) {
            throw new Error('Account not found');
        }

        accounts[address] = { ...accounts[address], name: name };

        // save accounts state
        this.store.updateState({ accounts });
    }

    /**
     * BalanceChecker is deployed on main eth (test)nets and requires a single call.
     * For all other networks, call this._updateAccount for each account in state.
     * if @param addresses is present this method will only update those accounts.
     *
     * @returns {Promise<void | void[]>} - After all account balances updated
     * @param {string[]?} addresses
     */
    public async updateAccounts(
        updateAccountsOptions: UpdateAccountsOptions,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        const release = !updateAccountsOptions.addresses
            ? await this._mutex.acquire()
            : () => {
                  return;
              };

        try {
            // Get addresses from state
            const _addresses =
                updateAccountsOptions.addresses ||
                Object.keys(this.store.getState().accounts);

            // Provider is immutable, so reference won't be lost
            const provider =
                this._networkController.getProviderForChainId(chainId);

            if (provider) {
                for (let i = 0; i < _addresses.length; i++) {
                    // If the chain changed we abort these operations
                    // Set $BLANK as visible on network change if available
                    await this._tokenController.setBlankToken(
                        _addresses[i],
                        chainId
                    );
                    await this._updateAccountBalance(
                        chainId,
                        provider,
                        _addresses[i],
                        updateAccountsOptions.assetAddresses
                    );
                }
            }

            return;
        } finally {
            release();
        }
    }

    /**
     * Updates current address balances from balanceChecker deployed contract instance.
     *
     * @param {number} chainId
     * @param provider
     * @param {string} accountAddress
     * @param {string[]} assetAddressToGetBalance
     */
    private async _updateAccountBalance(
        chainId: number,
        provider: ethers.providers.StaticJsonRpcProvider,
        accountAddress: string,
        assetAddressToGetBalance: string[]
    ) {
        // We try to fetch the balances from the SingleBalancesContract and fallback
        // to the regular getBalances call in case it fails or it is not available.
        try {
            const zero = BigNumber.from('0x00');

            // Clean the current data.
            const account = cloneDeep(
                this.store.getState().accounts[accountAddress]
            );
            if (!account.balances) {
                account.balances = {};
            }
            account.balances[chainId] = {
                nativeTokenBalance: zero,
                tokens: {},
            } as AccountBalance;

            // Adding the user custom tokens to the list
            const userTokens =
                await this._tokenController.getUserTokenContractAddresses(
                    accountAddress,
                    chainId
                );

            // Removing the deleted tokens
            const deletedUserTokens =
                await this._tokenController.getDeletedUserTokenContractAddresses(
                    accountAddress,
                    chainId
                );

            deletedUserTokens.forEach((token) => {
                const i = assetAddressToGetBalance.indexOf(token);
                if (i > -1) {
                    assetAddressToGetBalance.splice(i, 1);
                }
            });

            // We should keep this calls splitted by account because the limit of gas of the block:
            /*
                "The current block gas limit is around 8 million, and this function uses approximately 500,000 gas per 100 balances.
                So you should limit yourself to around 1,000 total balance calls (addresses * tokens)"

                https://medium.com/@wbobeirne/get-all-eth-token-balances-for-multiple-addresses-in-a-single-node-call-4d0bcd1e5625
            */

            const balances = await this._getAddressBalances(
                chainId,
                provider,
                accountAddress,
                assetAddressToGetBalance
            );

            for (const tokenAddress in balances) {
                const balance = balances[tokenAddress];

                // eth: always visible
                if (isNativeTokenAddress(tokenAddress)) {
                    account.balances[chainId].nativeTokenBalance = balance;
                } else {
                    if (balance.gt(zero) || userTokens.includes(tokenAddress)) {
                        // Ensure Token is added to accounts object
                        const { tokens } = await this._tokenController.search(
                            tokenAddress,
                            true,
                            accountAddress,
                            chainId
                        );

                        const token = tokens.length ? tokens[0] : undefined;

                        if (token) {
                            if (
                                balance.gt(zero) &&
                                !userTokens.includes(tokenAddress)
                            ) {
                                await this._tokenController.addCustomToken(
                                    token,
                                    accountAddress,
                                    chainId,
                                    true
                                );
                            }

                            account.balances[chainId].tokens[tokenAddress] = {
                                token,
                                balance,
                            };
                        }
                    }
                }
            }

            this._updateAccountBalanceState(
                chainId,
                accountAddress,
                account,
                assetAddressToGetBalance,
                deletedUserTokens
            );
        } catch (error) {
            log.warn(
                'Block Account Tracker single call balance fetch failed',
                error
            );
        }
    }

    /**
     * After updating balances this method stores the state
     * @param chainId
     * @param accountAddress
     * @param account
     * @param assetAddressToGetBalance
     * @param deletedUserTokens
     */
    private _updateAccountBalanceState(
        chainId: number,
        accountAddress: string,
        account: AccountInfo,
        assetAddressToGetBalance: string[],
        deletedUserTokens: string[]
    ): void {
        const stateAccounts = this.store.getState().accounts;

        const finalNativeTokenBalance = assetAddressToGetBalance.includes(
            NATIVE_TOKEN_ADDRESS
        )
            ? account.balances[chainId].nativeTokenBalance
            : accountAddress in stateAccounts &&
              chainId in stateAccounts[accountAddress].balances
            ? stateAccounts[accountAddress].balances[chainId].nativeTokenBalance
            : ethers.constants.Zero;

        let finalTokens: AccountBalanceTokens = {};
        if (
            accountAddress in stateAccounts &&
            chainId in stateAccounts[accountAddress].balances &&
            stateAccounts[accountAddress].balances[chainId].tokens
        ) {
            finalTokens = {
                ...stateAccounts[accountAddress].balances[chainId].tokens,
            };
        }
        if (chainId in account.balances && account.balances[chainId].tokens) {
            finalTokens = {
                ...finalTokens,
                ...account.balances[chainId].tokens,
            };
        }

        for (const address in finalTokens) {
            if (deletedUserTokens.includes(address)) {
                delete finalTokens[address];
            }
        }

        this.store.updateState({
            accounts: {
                ...this.store.getState().accounts,
                [accountAddress]: {
                    ...this.store.getState().accounts[accountAddress],
                    balances: {
                        ...this.store.getState().accounts[accountAddress]
                            .balances,
                        [chainId]: {
                            nativeTokenBalance: finalNativeTokenBalance,
                            tokens: finalTokens,
                        },
                    },
                },
            },
        });
    }

    /**
     * It tries to fetch the balances from the single call contract but if it is not working or it
     * is not available the fallback will be the individual fetching.
     * @param {number} chainId
     * @param provider
     * @param {string} accountAddress
     * @param {string[]} assetAddressToGetBalance
     * @returns {BalanceMap} A object with all the balances
     */
    private async _getAddressBalances(
        chainId: number,
        provider: ethers.providers.StaticJsonRpcProvider,
        accountAddress: string,
        assetAddressToGetBalance: string[]
    ): Promise<BalanceMap> {
        try {
            const onlyNativeToken =
                assetAddressToGetBalance.length === 1 &&
                assetAddressToGetBalance.includes(NATIVE_TOKEN_ADDRESS);

            // If contract is available fetch balances through it, otherwise make call for each one.
            // If the only asset to fetch is the native token it will call getBalance
            if (
                isSingleCallBalancesContractAvailable(chainId) &&
                !onlyNativeToken
            ) {
                try {
                    return await getAddressBalancesFromSingleCallBalancesContract(
                        provider,
                        accountAddress,
                        assetAddressToGetBalance,
                        chainId
                    );
                } catch (error) {
                    log.warn(
                        'Error in _getAddressBalances calling getAddressBalancesFromSingleCallBalancesContract',
                        error
                    );
                    return await this._getAddressBalancesFromMultipleCallBalances(
                        provider,
                        accountAddress,
                        assetAddressToGetBalance
                    );
                }
            } else {
                return await this._getAddressBalancesFromMultipleCallBalances(
                    provider,
                    accountAddress,
                    assetAddressToGetBalance
                );
            }
        } catch (error) {
            log.warn('Error in _getAddressBalances', error);
            throw error;
        }
    }

    /**
     * It fetches the balances one by one from the asset contract
     * @param provider
     * @param {string} accountAddress
     * @param {string[]} assetAddressToGetBalance
     * @returns {BalanceMap} A object with all the balances
     */
    private async _getAddressBalancesFromMultipleCallBalances(
        provider: ethers.providers.StaticJsonRpcProvider,
        accountAddress: string,
        assetAddressToGetBalance: string[]
    ): Promise<BalanceMap> {
        try {
            const filteredAssetAddressToGetBalance =
                assetAddressToGetBalance.filter(Boolean);
            const balances: BalanceMap = {};

            // Get all user's token balances
            for (let i = 0; i < filteredAssetAddressToGetBalance.length; i++) {
                const tokenAddress = checksummedAddress(
                    filteredAssetAddressToGetBalance[i]
                );
                if (isNativeTokenAddress(tokenAddress)) {
                    balances[tokenAddress] = await provider.getBalance(
                        accountAddress
                    );
                } else {
                    balances[tokenAddress] =
                        await this._tokenOperationsController.balanceOf(
                            tokenAddress,
                            accountAddress,
                            provider
                        );
                }
            }

            return balances;
        } catch (error) {
            log.warn(
                'Error in _getAddressBalancesFromMultipleCallBalances',
                error
            );
            throw error;
        }
    }

    /**
     * Search in all the accounts the balances for the @param chainId
     * If it does not exist it create an empty object.
     *
     * @param {number} chainId
     */
    private _buildBalancesForChain(chainId: number) {
        const accounts = this.store.getState().accounts;
        for (const accountAddress in accounts) {
            const balances = accounts[accountAddress].balances;

            if (!(chainId in balances)) {
                this.store.updateState({
                    accounts: {
                        ...this.store.getState().accounts,
                        [accountAddress]: {
                            ...this.store.getState().accounts[accountAddress],
                            balances: {
                                ...this.store.getState().accounts[
                                    accountAddress
                                ].balances,
                                [chainId]: {
                                    nativeTokenBalance: BigNumber.from(0),
                                    tokens: {},
                                },
                            },
                        },
                    },
                });
            }
        }
    }

    /**
     * Removes all addresses and associated balances
     *
     */
    public clearAccounts(): void {
        this.store.updateState({
            accounts: initialState.AccountTrackerController.accounts,
        });

        // Emit account removal
        this.emit(AccountTrackerEvents.CLEARED_ACCOUNTS);
    }

    /**
     * getAccountTokens
     *
     * @param accountAddress The account address
     * @returns The list of the specified address tokens
     */
    public getAccountTokens(
        accountAddress: string = this._preferencesController.getSelectedAddress(),
        chainId: number = this._networkController.network.chainId
    ): AccountBalanceTokens {
        if (accountAddress in this.store.getState().accounts) {
            if (
                this.store.getState().accounts[accountAddress].balances &&
                chainId in
                    this.store.getState().accounts[accountAddress].balances
            ) {
                return this.store.getState().accounts[accountAddress].balances[
                    chainId
                ].tokens;
            }
        }
        return {} as AccountBalanceTokens;
    }

    /**
     * getAccountNativeToken
     *
     * @param accountAddress The account address
     * @returns The account native token
     */
    public getAccountNativeTokenBalance(
        accountAddress: string = this._preferencesController.getSelectedAddress(),
        chainId: number = this._networkController.network.chainId
    ): BigNumber {
        if (accountAddress in this.store.getState().accounts) {
            if (
                this.store.getState().accounts[accountAddress].balances &&
                chainId in
                    this.store.getState().accounts[accountAddress].balances
            ) {
                return this.store.getState().accounts[accountAddress].balances[
                    chainId
                ].nativeTokenBalance;
            }
        }
        return BigNumber.from('0');
    }

    /**
     * It returns an account by its Keyring index
     *
     * @param accountIndex The account index
     */
    public async getAccountByIndex(accountIndex: number): Promise<AccountInfo> {
        // If it's an account index retrieve address from Keyring
        const accounts = await this._keyringController.getAccounts();

        if (!(accountIndex in accounts)) {
            throw new Error('Invalid account index');
        }

        const accountAddress = accounts[accountIndex];
        return this.store.getState().accounts[accountAddress] as AccountInfo;
    }

    /**
     * Calculates the next account index to use when creating or importing a new one.
     * @param accounts collection of stored accounts
     * @returns index
     */
    private _getNewAccountIndex(accounts: {
        [address: string]: AccountInfo;
    }): number {
        return (
            Math.max(
                ...Object.values(accounts).map(function (a) {
                    return a.index;
                })
            ) + 1
        );
    }

    /**
     * getHardwareWalletAccounts
     *
     * It returns a paginated list accounts from the hardware wallet device
     *
     * @param device The device type to connect to
     * @param pageIndex The accounts page index
     * @param pageSize  The accounts page size
     * @returns A paginated list of accounts
     */
    public async getHardwareWalletAccounts(
        device: Devices,
        pageIndex: number,
        pageSize: number
    ): Promise<DeviceAccountInfo[]> {
        return this._keyringController.getMutex().runExclusive(async () => {
            const keyring = await this._keyringController.getKeyringFromDevice(
                device
            );

            // Check if the keyring exists
            if (!keyring) {
                throw new Error('No keyring found');
            }

            // Check if the keyring is unlocked, if not unlock it
            if (!keyring.isUnlocked()) {
                await keyring.unlock();
            }

            keyring.perPage = pageSize;
            const deviceAccounts = await keyring.getPage(pageIndex);

            if (deviceAccounts) {
                const checkIfAccountNameExists = (
                    name: string,
                    address: string
                ) =>
                    !!Object.values(this.store.getState().accounts).find(
                        (t) => t.name === name && t.address !== address
                    );

                return deviceAccounts.map((a: any) => {
                    const baseName = `${
                        device.charAt(0).toUpperCase() +
                        device.slice(1).toLowerCase()
                    } ${a.index + 1}`;

                    let name = baseName;
                    // Check if the account name is already used by another account
                    let nameExists = checkIfAccountNameExists(name, a.address);
                    let idx = 1;
                    while (nameExists) {
                        name = `${baseName} (${idx})`;
                        nameExists = checkIfAccountNameExists(name, a.address);
                        idx++;
                    }

                    return {
                        index: a.index,
                        address: a.address,
                        name,
                    } as DeviceAccountInfo;
                });
            }

            return [];
        });
    }

    public async getAccountNativeTokenBalanceForChain(
        chainId: number
    ): Promise<BigNumber | undefined> {
        const selectedAddress =
            this._preferencesController.getSelectedAddress();

        const provider = this._networkController.getProviderForChainId(chainId);

        if (provider === undefined) {
            return undefined;
        }
        try {
            const balances = await this._getAddressBalances(
                chainId,
                provider,
                selectedAddress,
                [NATIVE_TOKEN_ADDRESS]
            );

            return balances[NATIVE_TOKEN_ADDRESS];
        } catch {
            return undefined;
        }
    }
}
