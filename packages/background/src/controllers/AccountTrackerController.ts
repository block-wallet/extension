import NetworkController, { NetworkEvents } from './NetworkController';
import { BaseController } from '../infrastructure/BaseController';
import { BigNumber } from '@ethersproject/bignumber';
import {
    StaticJsonRpcProvider,
    TransactionResponse,
} from '@ethersproject/providers';
import { Zero } from '@ethersproject/constants';
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
import { toChecksumAddress } from '@ethereumjs/util';
import { TokenOperationsController } from './erc-20/transactions/TokenOperationsController';
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
import {
    PreferencesController,
    PreferencesControllerEvents,
} from './PreferencesController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import { Devices } from '../utils/types/hardware';
import checksummedAddress from '../utils/checksummedAddress';
import {
    TransactionWatcherController,
    TransactionWatcherControllerEvents,
    NewTokenAllowanceSpendersEventParametersSignature,
} from './TransactionWatcherController';
import { isNativeTokenAddress, isUnlimitedAllowance } from '../utils/token';
import {
    TransactionCategories,
    TransactionEvents,
    TransactionMeta,
    TransactionStatus,
    WatchedTransactionType,
} from './transactions/utils/types';
import { retryHandling } from '../utils/retryHandling';
import { RPCLogsFetcher } from '../utils/rpc/RPCLogsFetcher';
import { getTokenApprovalLogsTopics } from '../utils/logsQuery';
import { runPromiseSafely } from '../utils/promises';
import { ContractDetails, fetchContractDetails } from '../utils/contractsInfo';
import { getMaxBlockBatchSize } from '../utils/rpc/rpcConfigBuilder';
import TransactionController from './transactions/TransactionController';
import { resolveAllownaceParamsFromTransaction } from './transactions/utils/utils';
import { HDPaths, HDPathDescription } from "../utils/constants/devices";
import { LedgerBridge, ledgerBridge } from "../utils/ledgerBridge";
import { resourceManager } from '../utils/ServiceWorkerResourceManager';

/**
 * Checks if the current environment has DOM access
 * This is needed to work around the fact that LedgerBridgeKeyring tries to create DOM elements
 * which fails in MV3 service workers
 *
 * @returns {boolean} True if the environment has a document with createElement
 */
const hasDomAccess = (): boolean => {
    try {
        // Check for document with element creation capability
        return typeof document !== 'undefined' &&
            document !== null &&
            typeof document.createElement === 'function';
    } catch (e) {
        // If any error occurs during the check, assume we don't have DOM access
        return false;
    }
};

export enum AccountStatus {
    ACTIVE = 'ACTIVE',
    HIDDEN = 'HIDDEN',
}

export enum TokenAllowanceStatus {
    UPDATED = 'UPDATED',
    AWAITING_TRANSACTION_RESULT = 'AWAITING_TRANSACTION_RESULT',
}

export interface AccountBalanceToken {
    token: Token;
    balance: BigNumber;
}
export interface TokenAllowance {
    status: 'AWAITING_TRANSACTION_RESULT' | 'UPDATED';
    //Whether the allowance is the unlimited value (MaxUnit256) or it is bigger than the token total supply
    isUnlimited: boolean;
    //Stores the last time we checked the spender allowance.
    //This property does not store the last time the allowance was updated in the contract.
    updatedAt: number;
    //Allowance value
    value: BigNumber;
    //Hash of the transaction that last updated the allowance
    txHash?: string;
    txTime?: number;
    //Spender information
    spender?: ContractDetails;
}
export interface AccountBalanceTokens {
    [address: string]: AccountBalanceToken;
}
export interface AccountBalance {
    nativeTokenBalance: BigNumber;
    tokens: AccountBalanceTokens;
}

export interface AccountAllowance {
    tokens: {
        [address: string]: {
            token: Token;
            allowances: {
                [spenderAddress: string]: TokenAllowance;
            };
        };
    };
}

export type AccountBalances = {
    [chainId: number]: AccountBalance;
};

export type AccountAllowances = {
    [chainId: number]: AccountAllowance;
};

/**
 * The type of the added account
 */
export enum AccountType {
    HD_ACCOUNT = 'HD Account',
    LEDGER = 'Ledger',
    TREZOR = 'Trezor',
    KEYSTONE = 'Keystone',
    EXTERNAL = 'External',
}

export interface AccountInfo {
    address: string;
    name: string;
    index: number; // for sorting purposes
    accountType: AccountType; // indicates if it was derivated from the seed phrase (false) or imported (true)
    balances: AccountBalances;
    allowances: AccountAllowances; //account allowances per chain, token and spender.
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

export interface AccountTokenOrder {
    [tokenAddress: string]: number;
}

export interface AccountTrackerState {
    accounts: Accounts;
    hiddenAccounts: Accounts;
    isAccountTrackerLoading: boolean;
    isRefreshingAllowances: boolean;
    accountTokensOrder: {
        [accountAddress: string]: {
            [chainId: number]: AccountTokenOrder;
        };
    };
}

export enum AccountTrackerEvents {
    ACCOUNT_ADDED = 'ACCOUNT_ADDED',
    ACCOUNT_REMOVED = 'ACCOUNT_REMOVED',
    CLEARED_ACCOUNTS = 'CLEARED_ACCOUNTS',
    BALANCE_UPDATED = 'BALANCE_UPDATED',
    ACCOUNTS_ORDER_UPDATED = 'ACCOUNTS_ORDER_UPDATED',
}

export interface UpdateAccountsOptions {
    addresses?: string[];
    assetAddresses: string[];
}

export class AccountTrackerController extends BaseController<AccountTrackerState> {
    private readonly _mutex: Mutex;
    private readonly _balanceFetchIntervalController: ActionIntervalController;

    /**
     * Normalizes an address to lowercase for use as a storage key
     */
    private _getStorageKey(address: string): string {
        return address.toLowerCase();
    }

    /**
     * Gets an account by address, normalizing the input address first
     */
    private _getAccountByAddress(address: string, includeHidden = false): AccountInfo | undefined {
        const storageKey = this._getStorageKey(address);
        const { accounts, hiddenAccounts } = this.store.getState();

        if (accounts[storageKey]) {
            return accounts[storageKey];
        }

        if (includeHidden && hiddenAccounts[storageKey]) {
            return hiddenAccounts[storageKey];
        }

        return undefined;
    }

    constructor(
        private readonly _keyringController: KeyringControllerDerivated,
        private readonly _networkController: NetworkController,
        private readonly _tokenController: TokenController,
        private readonly _tokenOperationsController: TokenOperationsController,
        private readonly _preferencesController: PreferencesController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly _transactionWatcherController: TransactionWatcherController,
        private readonly _transactionController: TransactionController,
        initialState: AccountTrackerState = {
            accounts: {},
            hiddenAccounts: {},
            isRefreshingAllowances: false,
            isAccountTrackerLoading: false,
            accountTokensOrder: {},
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
                    console.warn(
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
                    await this.updateAccounts(
                        {
                            addresses: [accountAddress],
                            assetAddresses: tokenAddresses,
                        },
                        chainId
                    );
                } catch (err) {
                    console.warn(
                        'An error ocurred while updating the accounts',
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
                        const selectedAddress =
                            this._preferencesController.getSelectedAddress();

                        await this.updateAccounts(
                            {
                                addresses: [selectedAddress],
                                assetAddresses: [],
                            },
                            chainId
                        );
                    }
                );
            }
        );

        this._preferencesController.on(
            PreferencesControllerEvents.SELECTED_ACCOUNT_CHANGED,
            async (address: string) => {
                await this.updateAccounts({
                    addresses: [address],
                    assetAddresses: [],
                });
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.INCOMING_TRANSACTION,
            async (
                chainId: number,
                address: string,
                transactionType: WatchedTransactionType
            ) => {
                if (transactionType === WatchedTransactionType.Native) {
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

                if (assetAddresses.length > 0) {
                    await this.updateAccounts(
                        {
                            addresses: [accountAddress],
                            assetAddresses,
                        },
                        chainId
                    );
                }
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.NEW_KNOWN_ERC20_TRANSACTIONS,
            async (
                chainId: number,
                accountAddress: string,
                tokenAddresses: string[]
            ) => {
                if (tokenAddresses.length > 0) {
                    await this.updateAccounts(
                        {
                            addresses: [accountAddress],
                            assetAddresses: tokenAddresses,
                        },
                        chainId
                    );
                }
            }
        );

        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.NEW_KNOWN_TOKEN_ALLOWANCE_SPENDERS,
            async (
                ...args: NewTokenAllowanceSpendersEventParametersSignature
            ) => {
                await this._handleNewTokenAllowanceSpendersEvents(
                    args[0],
                    args[1],
                    args[2]
                );
            }
        );

        this._transactionController.on(
            TransactionEvents.NOT_SELECTED_ACCOUNT_TRANSACTION,
            async (chainId: number, accountAddress: string) => {
                await this.updateAccounts(
                    {
                        addresses: [accountAddress],
                        assetAddresses: [NATIVE_TOKEN_ADDRESS],
                    },
                    chainId
                );
            }
        );

        this._transactionController.on(
            TransactionEvents.STATUS_UPDATE,
            (transactionMeta: TransactionMeta) => {
                // Existing allowance handling
                if (
                    transactionMeta.transactionCategory ===
                    TransactionCategories.TOKEN_METHOD_APPROVE
                ) {
                    this._onApprovalTransactionUpdate(transactionMeta);
                }

                // Handle confirmed transactions for balance update
                if (transactionMeta.status === TransactionStatus.CONFIRMED) {
                    this._onTransactionConfirmed(transactionMeta);
                }
            }
        );
    }

    /**
     * _getAccountChainAllowances
     * Retrieves all the chain allowances in a safer way.
     * @param account
     * @param chainId
     * @returns AccountAllowance
     */
    private _getAccountChainAllowances(
        account: AccountInfo,
        chainId: number
    ): AccountAllowance {
        const allowances = cloneDeep(account.allowances);
        if (!allowances[chainId]) {
            return { tokens: {} };
        }

        return allowances[chainId];
    }

    /**
     * _onAllowanceTransactionUpdate
     * In case an approval transaction is fired using the wallet, this method transition the allowance record between PENDING and UPDATED.
     * When the approval transaction is mined, this method simulates the a new token allowance event to force its update and avoid delays in the UI.
     * @param account
     * @param chainId
     * @returns AccountAllowance
     */
    private _onApprovalTransactionUpdate(
        transactionMeta: TransactionMeta,
        accountAddress = this._preferencesController.getSelectedAddress(),
        chainId = this._networkController.network.chainId
    ) {
        const params = resolveAllownaceParamsFromTransaction(transactionMeta);

        if (!params) {
            console.warn(
                'Unable to resolve spender and token address from transaction',
                transactionMeta
            );
            return;
        }

        const { accounts, hiddenAccounts } = this.store.getState();
        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(accountAddress);
        const account = accounts[accountKey] || hiddenAccounts[accountKey];

        if (!account) {
            console.warn(`Account not found for address: ${accountAddress}`);
            return;
        }

        const chainTokenAllowances: AccountAllowance['tokens'] =
            this._getAccountChainAllowances(account, chainId).tokens;
        const { spenderAddress, tokenAddress } = params;
        if (transactionMeta.status !== TransactionStatus.CONFIRMED) {
            //Do not update state if there is no previous record of this allowance.
            if (
                !chainTokenAllowances[tokenAddress] ||
                !chainTokenAllowances[tokenAddress].allowances[spenderAddress]
            ) {
                return;
            }
            chainTokenAllowances[tokenAddress].allowances[
                spenderAddress
            ].status =
                transactionMeta.status === TransactionStatus.SUBMITTED
                    ? TokenAllowanceStatus.AWAITING_TRANSACTION_RESULT
                    : TokenAllowanceStatus.UPDATED;
            this._updateAccountAllowancesState(accountKey, {
                ...account.allowances,
                [chainId]: { tokens: chainTokenAllowances },
            });
        } else if (transactionMeta.transactionParams.hash) {
            const event: NewTokenAllowanceSpendersEventParametersSignature['2'] =
            {
                [tokenAddress]: [
                    {
                        spender: spenderAddress,
                        txHash: transactionMeta.transactionParams.hash,
                        txTime:
                            transactionMeta.confirmationTime ||
                            transactionMeta.submittedTime ||
                            new Date().getTime(),
                    },
                ],
            };
            this._handleNewTokenAllowanceSpendersEvents(
                chainId,
                accountKey,
                event
            );
        }
    }

    /**
     * _cleanupAllowancesBeforeStore
     * Cleans up the allowances state before storing to avoid saving allowances with 0 and empty objects.
     * @param account
     * @param chainId
     * @returns AccountAllowance
     */
    private _cleanupAllowancesBeforeStore(
        allowances: AccountAllowances
    ): AccountAllowances {
        //cleanup empty allowances
        return Object.entries(allowances).reduce(
            (allowancesAcc, [chainId, allowance]) => {
                return {
                    ...allowancesAcc,
                    [chainId]: {
                        tokens: Object.entries(allowance.tokens || {}).reduce(
                            (tokensAcc, [tokenAddress, allowancesRecord]) => {
                                const allowancesGTZero: Record<
                                    string,
                                    TokenAllowance
                                > = Object.entries(
                                    allowancesRecord.allowances || {}
                                ).reduce(
                                    (
                                        acc,
                                        [spenderAddress, allowanceRecord]
                                    ) => {
                                        if (
                                            BigNumber.from(
                                                allowanceRecord.value ?? 0
                                            ).gt(0)
                                        ) {
                                            return {
                                                ...acc,
                                                [spenderAddress]:
                                                    allowanceRecord,
                                            };
                                        }
                                        return acc;
                                    },
                                    {}
                                );
                                //if there is at least 1 spender
                                if (Object.keys(allowancesGTZero).length > 0) {
                                    return {
                                        ...tokensAcc,
                                        [tokenAddress]: {
                                            allowances: allowancesGTZero,
                                            token: allowancesRecord.token,
                                        },
                                    };
                                }
                                return tokensAcc;
                            },
                            {}
                        ),
                    },
                };
            },
            {}
        );
    }

    /**
     * _resolveToken
     * Resolves the token data along with its total supply
     * @param account
     * @param chainId
     * @returns AccountAllowance
     */
    private async _resolveToken(
        tokenAddress: string,
        accountAddress: string,
        chainId: number,
        networkProvider: StaticJsonRpcProvider
    ): Promise<Token | undefined> {
        const { tokens } = await this._tokenController.search(
            tokenAddress,
            true,
            accountAddress,
            chainId
        );

        const token = tokens.length ? tokens[0] : undefined;
        if (!token) {
            return undefined;
        }

        let totalSupply: BigNumber | undefined;

        try {
            totalSupply = await this._tokenOperationsController.totalSupply(
                tokenAddress,
                networkProvider
            );
        } catch (e) {
            console.warn('Unable to get total supply of token:', tokenAddress, e);
        }

        return {
            ...token,
            totalSupply,
        };
    }

    /**
     * _getUpdatedAccountAllowancesFromEvent
     * Returns the updated account allowances based on the allowances recognized in the event.
     * @param account
     * @param chainId
     * @returns AccountAllowance
     */
    private _getUpdatedAccountAllowancesFromEvent = async (
        chainId: number,
        account: AccountInfo,
        newAllowances: NewTokenAllowanceSpendersEventParametersSignature['2']
    ) => {
        const allowances = cloneDeep(account.allowances);
        const networkProvider =
            this._networkController.getProviderForChainId(chainId);
        if (!networkProvider) {
            console.warn(
                'No network provider for the specified chain id:',
                chainId
            );
            return;
        }

        if (!allowances[chainId]) {
            allowances[chainId] = { tokens: {} };
        }

        const chainTokenAllowances = allowances[chainId].tokens;

        for (const tokenAddress in newAllowances) {
            let currentToken = chainTokenAllowances[tokenAddress]
                ? chainTokenAllowances[tokenAddress].token
                : undefined;

            //check whether we need to fetch the token data or not
            if (!currentToken) {
                currentToken = await this._resolveToken(
                    tokenAddress,
                    account.address,
                    chainId,
                    networkProvider
                );
                if (!currentToken) {
                    console.warn(
                        'Unable to resolve token with address',
                        tokenAddress
                    );
                    continue;
                }
            }

            //grab all the new allowances per token address
            const newSpendersTransactions = newAllowances[tokenAddress];
            const newTokenSpendersAllowance: Record<string, TokenAllowance> =
                {};
            for (const spenderTransaction of newSpendersTransactions) {
                const tokenAllowances =
                    chainTokenAllowances[tokenAddress]?.allowances;
                const { spender, txHash, txTime } = spenderTransaction;

                //means that this record is already updated.
                if (
                    tokenAllowances &&
                    tokenAllowances[spender] &&
                    (tokenAllowances[spender].txHash || '').toLowerCase() ===
                    txHash.toLowerCase()
                ) {
                    continue;
                }

                const contractDetailsCache: Record<
                    string,
                    ContractDetails | undefined
                > = {};

                try {
                    //fetch spender allowance
                    const spenderAllowance =
                        await this._tokenOperationsController.allowance(
                            tokenAddress,
                            account.address,
                            spender,
                            networkProvider
                        );

                    // Add token to the user's assets of tracked tokens if the allowance is greater than 0
                    if (!spenderAllowance.eq(0)) {
                        this._tokenController.attemptAddToken(
                            tokenAddress,
                            chainId
                        );
                    }

                    let contractInfo: ContractDetails | undefined =
                        contractDetailsCache[spender];

                    if (!contractInfo) {
                        contractInfo = await fetchContractDetails(
                            chainId,
                            spender
                        );
                    }

                    newTokenSpendersAllowance[spender] = {
                        isUnlimited: isUnlimitedAllowance(
                            currentToken,
                            spenderAllowance
                        ),
                        value: spenderAllowance,
                        updatedAt: new Date().getTime(),
                        txHash,
                        txTime,
                        status: TokenAllowanceStatus.UPDATED,
                        spender: contractInfo,
                    };
                } catch (e) {
                    console.warn(
                        `Error fetching spender: ${spender} allowance for token ${tokenAddress}`,
                        e
                    );
                    continue;
                }
            }

            const currentTokenSpenders =
                allowances[chainId].tokens[tokenAddress] || {};

            allowances[chainId] = {
                ...allowances[chainId],
                tokens: {
                    ...allowances[chainId].tokens,
                    [tokenAddress]: {
                        token: currentToken,
                        allowances: {
                            ...currentTokenSpenders.allowances,
                            ...newTokenSpendersAllowance,
                        },
                    },
                },
            };
        }

        return allowances;
    };

    /**
     * refreshTokenAllowances
     * Refreshes all the token allowances present in the state for the current chain id and account address.
     * This method does not discover new spender, it just fetches the allowances in case we missed some update.
     * Also, this method tries to fetch the spender details to either set or update it.
     * @param args Arguments fired by the event
     */
    public async refreshTokenAllowances() {
        this.store.updateState({ isRefreshingAllowances: true });
        const currentAccountAddress =
            this._preferencesController.getSelectedAddress();
        const { chainId } = this._networkController.network;
        const provider = this._networkController.getProvider();
        const currentAccount =
            this.store.getState().accounts[currentAccountAddress];
        try {
            if (!currentAccount) {
                return;
            }

            const chainAllowances = cloneDeep(
                (currentAccount.allowances || {})[chainId]
            );

            if (
                !chainAllowances ||
                Object.keys(chainAllowances.tokens).length === 0
            ) {
                return;
            }

            const contractDetailsCache: Record<
                string,
                ContractDetails | undefined
            > = {};

            for (const tokenAddress in chainAllowances.tokens) {
                const tokenSpenders =
                    chainAllowances.tokens[tokenAddress].allowances;
                const currentToken = chainAllowances.tokens[tokenAddress].token;
                for (const spender in tokenSpenders) {
                    try {
                        const allowance =
                            await this._tokenOperationsController.allowance(
                                tokenAddress,
                                currentAccountAddress,
                                spender
                            );

                        let contractDetails: ContractDetails | undefined =
                            contractDetailsCache[spender];

                        //Reftech spender contract details if we hadn't fetch it
                        if (!contractDetails) {
                            contractDetails = await fetchContractDetails(
                                chainId,
                                spender
                            );
                            contractDetailsCache[spender] = contractDetails;
                        }

                        const currentAllowanceRecord = tokenSpenders[spender];
                        let txHash: string | undefined =
                            currentAllowanceRecord.txHash;
                        let txTime: number | undefined =
                            currentAllowanceRecord.txTime;

                        //If allowance has changed, then lookup for the new txHash and time.
                        if (
                            !allowance.eq(
                                BigNumber.from(
                                    currentAllowanceRecord.value ?? 0
                                )
                            )
                        ) {
                            if (allowance.gt(BigNumber.from(0))) {
                                //attempt to get new txHash and time
                                ({ txHash, txTime } =
                                    await this._lookupLastTokenApprovalEventTx(
                                        currentAccountAddress,
                                        spender,
                                        currentAllowanceRecord.txHash,
                                        provider
                                    ));
                            }
                        }

                        const newSpenderInfo = {
                            logoURI:
                                contractDetails?.logoURI ||
                                currentAllowanceRecord.spender?.logoURI,
                            name:
                                contractDetails?.name ||
                                currentAllowanceRecord.spender?.name,
                            websiteURL:
                                contractDetails?.websiteURL ||
                                currentAllowanceRecord.spender?.websiteURL,
                        };

                        chainAllowances.tokens[tokenAddress].allowances[
                            spender
                        ] = {
                            status: TokenAllowanceStatus.UPDATED,
                            isUnlimited: isUnlimitedAllowance(
                                currentToken,
                                allowance
                            ),
                            value: allowance,
                            txHash,
                            txTime,
                            updatedAt: new Date().getTime(),
                            spender: newSpenderInfo.name
                                ? (newSpenderInfo as ContractDetails)
                                : undefined,
                        };
                    } catch (e) {
                        console.warn(
                            'Error requesting _tokenOperationsController.allowance',
                            e
                        );
                        continue;
                    }
                }
            }

            const usrAccountData =
                this.store.getState().accounts[currentAccountAddress];
            const newAllowancesState = {
                ...usrAccountData.allowances,
                [chainId]: chainAllowances,
            };
            this._updateAccountAllowancesState(
                currentAccountAddress,
                newAllowancesState
            );
        } finally {
            this.store.updateState({ isRefreshingAllowances: false });
        }
    }

    /**
     * _handleNewTokenAllowanceSpendersEvents
     * Handles the token allowances event and fetches the token allowance for every spender specified in the parameters.
     * @param args Arguments fired by the event
     */
    private async _handleNewTokenAllowanceSpendersEvents(
        ...args: NewTokenAllowanceSpendersEventParametersSignature
    ) {
        const release = await this._mutex.acquire();
        const [chainId, accountAddress, newAllowances] = args;
        const { accounts, hiddenAccounts } = this.store.getState();
        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(accountAddress);
        const account = accounts[accountKey] || hiddenAccounts[accountKey];

        if (!account) {
            console.warn(`Account not found for address: ${accountAddress}`);
            release();
            return;
        }

        try {
            const newAccountAllowances =
                await this._getUpdatedAccountAllowancesFromEvent(
                    chainId,
                    account,
                    newAllowances
                );

            if (newAccountAllowances) {
                this._updateAccountAllowancesState(
                    accountKey,
                    newAccountAllowances
                );
            }
        } finally {
            release();
        }
    }

    private _updateAccountAllowancesState(
        accountAddress: string,
        newAllowances: AccountAllowances
    ): void {
        const { accounts, hiddenAccounts } = this.store.getState();
        const cleanedAllowances =
            this._cleanupAllowancesBeforeStore(newAllowances);

        // Ensure we're using a normalized key for consistency
        const accountKey = this._getStorageKey(accountAddress);

        if (accountKey in accounts) {
            this.store.updateState({
                accounts: {
                    ...this.store.getState().accounts,
                    [accountKey]: {
                        ...this.store.getState().accounts[accountKey],
                        allowances: cleanedAllowances,
                    },
                },
            });
        } else if (accountKey in hiddenAccounts) {
            this.store.updateState({
                hiddenAccounts: {
                    ...this.store.getState().hiddenAccounts,
                    [accountKey]: {
                        ...this.store.getState().hiddenAccounts[accountKey],
                        allowances: cleanedAllowances,
                    },
                },
            });
        }
    }

    /**
     * _lookupLastTokenApprovalEventTx
     * This method lookups the transaction that fired the last token approval event for a certain token address and spedner.
     * Using the last known transaction, retrieves its block to limit the query size.
     * @param accountAddress
     * @param spenderAddress
     * @param lastTxHash
     * @param provider
     * @returns
     */
    private async _lookupLastTokenApprovalEventTx(
        accountAddress: string,
        spenderAddress: string,
        lastTxHash: string | undefined,
        provider: StaticJsonRpcProvider
    ): Promise<{
        txHash?: string;
        txTime?: number;
    }> {
        let newTxHash = undefined;
        let newTxTime = undefined;
        const rpcLogsFetcher = new RPCLogsFetcher(provider);

        const lastMinedBlock = this._blockUpdatesController.getBlockNumber();
        let queryFromBlock = 0;
        //fetch new txHash
        if (lastTxHash) {
            try {
                const oldTtransaction =
                    await retryHandling<TransactionResponse>(() =>
                        provider.getTransaction(lastTxHash)
                    );
                if (oldTtransaction.blockNumber) {
                    queryFromBlock = oldTtransaction.blockNumber;
                }
            } catch (e) {
                console.warn('Error getting old allowance transaction by hash', e);
            }
            if (!queryFromBlock) {
                //Query only one batch in case we don't have the queryFromBlock
                queryFromBlock = Math.max(
                    this._blockUpdatesController.getBlockNumber() -
                    getMaxBlockBatchSize(
                        this._networkController.network.chainId
                    ),
                    0
                );
            }

            const logs = await runPromiseSafely(
                rpcLogsFetcher.getLogsInBatch(
                    {
                        topics: getTokenApprovalLogsTopics(
                            accountAddress,
                            WatchedTransactionType.ERC20,
                            spenderAddress
                        ),
                        toBlock: lastMinedBlock,
                        fromBlock: queryFromBlock,
                    },
                    lastMinedBlock
                )
            );
            if (logs && logs.length) {
                const lastLog = logs[logs.length - 1];
                if (lastLog.transactionHash !== lastTxHash) {
                    newTxHash = lastLog.transactionHash;
                    newTxTime =
                        await rpcLogsFetcher.getLogTimestampInMilliseconds(
                            lastLog
                        );
                }
            }
        }
        return {
            txHash: newTxHash,
            txTime: newTxTime,
        };
    }

    /**
     * Adds the primary account to the account tracker
     *
     * @param address account address
     * @param name new name
     */
    public addPrimaryAccount(address: string): void {
        // Checksum address for display purposes
        const checksummedAddress = toChecksumAddress(address);

        // Use lowercase version for storage key consistency
        const accountKey = this._getStorageKey(checksummedAddress);

        const primaryAccountInfo: AccountInfo = {
            address: checksummedAddress,
            name: 'Account 1',
            accountType: AccountType.HD_ACCOUNT,
            index: 0, // first account
            balances: {},
            status: AccountStatus.ACTIVE,
            allowances: {},
        };

        this.store.updateState({
            accounts: { [accountKey]: primaryAccountInfo },
        });

        // Emit account update
        this.emit(AccountTrackerEvents.ACCOUNT_ADDED, checksummedAddress);

        this.updateAccounts({
            addresses: [checksummedAddress],
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

        // Get new created account with checksum format (for display purposes)
        const newAccount = toChecksumAddress(account);

        // Use lowercase version for storage key consistency
        const accountKey = this._getStorageKey(newAccount);

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
            allowances: {},
        };
        trackedAccounts[accountKey] = accountInfo;

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
     * getAccountTypeFromDevice
     *
     * @param device The device type
     * @returns The Account Type instance name
     */
    public getAccountTypeFromDevice(
        device: Devices
    ): AccountType.LEDGER | AccountType.TREZOR | AccountType.KEYSTONE {
        switch (device) {
            case Devices.LEDGER:
                return AccountType.LEDGER;
            case Devices.TREZOR:
                return AccountType.TREZOR;
            case Devices.KEYSTONE:
                return AccountType.KEYSTONE;
            default:
                throw new Error('Invalid device');
        }
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
            // Checksum received account address
            const newAccount = toChecksumAddress(address);

            // Use lowercase version for storage key consistency
            const accountKey = this._getStorageKey(newAccount);

            // Skip already imported accounts
            if (accountKey in trackedAccounts) {
                continue;
            }

            // Calculates new account index
            const accountIndex = this._getNewAccountIndex(trackedAccounts);

            // Gets the account type
            const accountType = this.getAccountTypeFromDevice(device);

            // Add new account to the account tracker
            const accountInfo: AccountInfo = {
                address: newAccount,
                name,
                accountType,
                index: accountIndex,
                balances: {},
                status: AccountStatus.ACTIVE,
                allowances: {},
            };
            updatedAccounts.push(accountInfo);

            // Set account in trackedAccount object
            trackedAccounts[accountKey] = accountInfo;
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

        // Use lowercase version for storage key consistency
        const accountKey = this._getStorageKey(newAccount);

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
            allowances: {},
        };
        trackedAccounts[accountKey] = accountInfo;

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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(address);

        if (!accounts[accountKey]) {
            throw new Error('Account not found');
        }

        if (accounts[accountKey].accountType === AccountType.HD_ACCOUNT) {
            throw new Error('Cannot internal HD accounts');
        }

        // if account is currently selected, change accounts
        if (address === this._preferencesController.getSelectedAddress()) {
            const accountsCopy = { ...accounts };
            delete accountsCopy[accountKey];

            this._preferencesController.setSelectedAddress(
                accountsCopy[Object.keys(accountsCopy)[0]].address
            );
        }

        // Remove from account tracker
        delete accounts[accountKey];

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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(address);

        if (!accounts[accountKey]) {
            throw new Error('Account not found');
        }

        if (accounts[accountKey].accountType !== AccountType.HD_ACCOUNT) {
            throw new Error('Can only hide internal accounts');
        }

        const accountsNumber = Object.keys(accounts).length;

        if (accountsNumber === 1) {
            throw new Error("Can't hide last account");
        }

        // if account is currently selected, change accounts
        if (address === this._preferencesController.getSelectedAddress()) {
            const accountsCopy = { ...accounts };
            delete accountsCopy[accountKey];

            this._preferencesController.setSelectedAddress(
                accountsCopy[Object.keys(accountsCopy)[0]].address
            );
        }

        // Add to hidden accounts
        this.addHiddenAccount(accounts[accountKey]);

        // Remove from account tracker
        delete accounts[accountKey];

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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(address);

        if (!hiddenAccounts[accountKey]) {
            throw new Error('Account not found');
        }

        // Add account to accounts
        accounts[accountKey] = {
            ...hiddenAccounts[accountKey],
            status: AccountStatus.ACTIVE,
        };

        // Remove from hidden accounts
        delete hiddenAccounts[accountKey];

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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(account.address);

        this.store.updateState({
            hiddenAccounts: {
                ...(hiddenAccounts || {}),
                [accountKey]: {
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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(address);

        if (!accounts[accountKey]) {
            throw new Error('Account not found');
        }

        accounts[accountKey] = { ...accounts[accountKey], name: name };

        // save accounts state
        this.store.updateState({ accounts });
    }

    /**
     * Get account name
     *
     * @param address account address
     * @return name of the account
     */
    public getAccountName(address: string): string | undefined {
        const { accounts } = this.store.getState();

        // Normalize the account address for lookup
        const accountKey = this._getStorageKey(address);

        const accountName = accounts[accountKey]?.name;

        return accountName;
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
        const { addresses, assetAddresses } = updateAccountsOptions;
        const release = !addresses
            ? await this._mutex.acquire()
            : () => {
                return;
            };

        try {
            // Get addresses from state
            const _addresses =
                addresses && addresses.length
                    ? addresses
                    : Object.keys(this.store.getState().accounts);

            // Provider is immutable, so reference won't be lost
            const provider =
                this._networkController.getProviderForChainId(chainId);

            if (provider) {
                for (let i = 0; i < _addresses.length; i++) {
                    const address = _addresses[i];

                    // If the chain changed we abort these operations
                    // Set $BLANK as visible on network change if available
                    await this._tokenController.setBlankToken(address, chainId);

                    if (!assetAddresses.length) {
                        assetAddresses.push(NATIVE_TOKEN_ADDRESS);

                        assetAddresses.push(
                            ...(await this._tokenController.getUserTokenContractAddresses(
                                address,
                                chainId
                            ))
                        );
                    }

                    await this._updateAccountBalance(
                        chainId,
                        provider,
                        address,
                        assetAddresses
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
        provider: StaticJsonRpcProvider,
        accountAddress: string,
        assetAddressToGetBalance: string[]
    ) {
        try {
            const zero = BigNumber.from('0x00');

            // Clean the current data. Use normalized key to find existing account data.
            const storageKey = this._getStorageKey(accountAddress);
            const existingAccount = this.store.getState().accounts[storageKey];
            const account = existingAccount ? cloneDeep(existingAccount) : {
                address: accountAddress,
                name: `Account ${Object.keys(this.store.getState().accounts).length + 1}`,
                index: this._getNewAccountIndex(this.store.getState().accounts),
                accountType: AccountType.HD_ACCOUNT,
                balances: {},
                allowances: {},
                status: AccountStatus.ACTIVE,
            } as AccountInfo;

            if (!account.balances) {
                account.balances = {};
            }
            account.balances[chainId] = {
                nativeTokenBalance: zero,
                tokens: {},
            } as AccountBalance;

            // list of known tokens
            const knownTokens =
                await this._tokenController.getContractAddresses(chainId);

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

            const network =
                this._networkController.getNetworkFromChainId(chainId);

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
                                !userTokens.includes(tokenAddress) &&
                                (network?.test ||
                                    knownTokens.includes(tokenAddress)) // the token has to be known (not spam) in mainnets
                            ) {
                                await this._tokenController.addCustomToken(
                                    token,
                                    accountAddress,
                                    chainId,
                                    true
                                );
                                userTokens.push(tokenAddress);
                            }

                            if (
                                userTokens.includes(tokenAddress) ||
                                knownTokens.includes(tokenAddress)
                            ) {
                                account.balances[chainId].tokens[tokenAddress] =
                                {
                                    token,
                                    balance,
                                };
                            }
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
            console.warn(
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

        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(accountAddress);

        const finalNativeTokenBalance = assetAddressToGetBalance.includes(
            NATIVE_TOKEN_ADDRESS
        )
            ? account.balances[chainId].nativeTokenBalance
            : accountKey in stateAccounts &&
                stateAccounts[accountKey].balances &&
                chainId in stateAccounts[accountKey].balances
                ? stateAccounts[accountKey].balances[chainId].nativeTokenBalance
                : Zero;

        let finalTokens: AccountBalanceTokens = {};
        if (
            accountKey in stateAccounts &&
            stateAccounts[accountKey].balances &&
            chainId in stateAccounts[accountKey].balances &&
            stateAccounts[accountKey].balances[chainId].tokens
        ) {
            finalTokens = {
                ...stateAccounts[accountKey].balances[chainId].tokens,
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

        // Ensure account exists in state before updating
        const currentAccounts = this.store.getState().accounts;
        const existingAccount = currentAccounts[accountKey];

        // If account doesn't exist, create a basic structure
        if (!existingAccount) {
            console.warn(`[AccTrk] Account ${accountAddress} doesn't exist in store, creating basic account structure`);
        }

        const newState = {
            accounts: {
                ...currentAccounts,
                [accountKey]: {
                    // Use the account info passed to this method, or the existing account, or create minimal structure
                    address: accountAddress,
                    name: existingAccount?.name || account?.name || `Account ${Object.keys(currentAccounts).length + 1}`,
                    index: account?.index || existingAccount?.index || this._getNewAccountIndex(currentAccounts),
                    accountType: account?.accountType || existingAccount?.accountType || AccountType.HD_ACCOUNT,
                    status: account?.status || existingAccount?.status || AccountStatus.ACTIVE,
                    allowances: account?.allowances || existingAccount?.allowances || {},
                    balances: {
                        ...(existingAccount?.balances || {}),
                        [chainId]: {
                            nativeTokenBalance: finalNativeTokenBalance,
                            tokens: finalTokens,
                        },
                    },
                },
            },
        };
        this.store.updateState(newState);

        this.emit(
            AccountTrackerEvents.BALANCE_UPDATED,
            chainId,
            accountAddress,
            assetAddressToGetBalance
        );
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
        provider: StaticJsonRpcProvider,
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
                    console.warn(
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
            console.warn('Error in _getAddressBalances', error);
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
        provider: StaticJsonRpcProvider,
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
            console.warn(
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
            const account = accounts[accountAddress];
            const balances = account?.balances || {};

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
     * Resets an account and associated balances
     *
     */
    public resetAccount(address: string): void {
        const stateAccounts = this.store.getState().accounts;

        // Check if account exists before resetting
        if (stateAccounts[address]) {
            stateAccounts[address].balances = {};
            stateAccounts[address].allowances = {};

            this.store.updateState({
                accounts: stateAccounts,
            });
        }
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
        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(accountAddress);

        if (accountKey in this.store.getState().accounts) {
            if (
                this.store.getState().accounts[accountKey].balances &&
                chainId in
                this.store.getState().accounts[accountKey].balances
            ) {
                return this.store.getState().accounts[accountKey].balances[
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
        // Normalize the account address to match storage format
        const accountKey = this._getStorageKey(accountAddress);

        if (accountKey in this.store.getState().accounts) {
            if (
                this.store.getState().accounts[accountKey].balances &&
                chainId in
                this.store.getState().accounts[accountKey].balances
            ) {
                return this.store.getState().accounts[accountKey].balances[
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
        const account = this.store.getState().accounts[accountAddress];

        if (!account) {
            throw new Error(`Account not found for address: ${accountAddress}`);
        }

        return account;
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
    /**
     * OPTIMIZED: Get hardware wallet accounts with resource management
     */
    public async getHardwareWalletAccounts(
        device: Devices,
        pageIndex: number,
        pageSize: number
    ): Promise<DeviceAccountInfo[]> {
        // OPTIMIZED: Use resource manager to handle this heavy operation
        const operationKey = `hw_accounts_${device}_${pageIndex}_${pageSize}`;

        return resourceManager.manageHardwareWalletOperation(operationKey, () =>
            this._keyringController.getMutex().runExclusive(async () => {
            const hasDOM = hasDomAccess();

            // Special handling for Ledger in Service Worker context
            if (device === Devices.LEDGER && !hasDOM) {

                // Step 1: Verify connection and app status via offscreen document
                try {
                    const connectionStatus = await this._keyringController.connectHardwareKeyring(device);
                    if (typeof connectionStatus === 'object') {
                        if (connectionStatus.needsEthereumApp) {
                            console.warn('[ATC] Ledger Ethereum app needs to be opened.');
                            throw new Error('LEDGER_ETHEREUM_APP_CLOSED');
                        }
                        // Ignore needsUserGesture here, it just confirms SW context after permission grant
                    } else if (connectionStatus !== true) {
                        console.error('[ATC] Ledger connection check failed.');
                        throw new Error('Failed to verify Ledger connection');
                    }
                } catch (connectionError) {
                    console.error('[ATC] Error during Ledger connection verification:', connectionError);
                    throw connectionError; // Propagate specific errors like APP_CLOSED
                }

                // Step 2: Fetch accounts using the ledgerBridge proxy
                try {
                    // Note: Assuming default HD path logic is handled elsewhere or standard path is okay
                    // If specific HD path needed, it must be passed from UI -> ATC -> ledgerBridge
                    const accountsFromBridge = await ledgerBridge.getAccounts(pageIndex, pageSize);


                    // Step 3: Format accounts into DeviceAccountInfo[]
                    const formattedAccounts: DeviceAccountInfo[] = accountsFromBridge.map((acc: { address: string; index: number; balance?: string }) => ({
                        address: acc.address,
                        index: acc.index,
                        balance: acc.balance || null, // Assuming balance isn't fetched here
                        name: `Ledger ${acc.index + 1}` // Standard naming
                    }));

                    return formattedAccounts;

                } catch (proxyError) {
                    console.error('[ATC] Error fetching Ledger accounts via bridge proxy:', proxyError);
                    throw new Error(`Failed to get accounts from Ledger: ${proxyError.message}`);
                }
            }

            // --- Existing Logic for UI context or non-Ledger devices ---
            let keyring = await this._keyringController.getKeyringFromDevice(device);

            // If no keyring exists, try to connect/restore/create
            if (!keyring) {
                console.warn(`No keyring found for ${device}, attempting to restore from session storage`);

                try {
                    // First, try to connect the hardware wallet directly
                    // This is important for MV3 where service worker might restart
                    try {
                        const connectionResult = await this._keyringController.connectHardwareKeyring(device);

                        if (connectionResult === true) {
                            // Get the keyring after connection
                            keyring = await this._keyringController.getKeyringFromDevice(device);

                            if (keyring) {
                                // Persist this newly created keyring for future restoration
                                await this._keyringController['persistHardwareKeyringState'](device);
                            }
                        } else if (
                            typeof connectionResult === 'object' &&
                            connectionResult.needsUserGesture
                        ) {
                            // Throw a specific error to signal the UI about the need for user interaction
                            if (chrome.storage?.session) {
                                try {
                                    // Store the need for interaction in session storage
                                    await chrome.storage.session.set({
                                        'ledger_needs_user_interaction': {
                                            timestamp: Date.now(),
                                            deviceName: connectionResult.deviceName
                                        }
                                    });
                                } catch (e) {
                                    console.error("Failed to store user interaction requirement:", e);
                                }
                            }
                            throw new Error('LEDGER_USER_GESTURE_REQUIRED');
                        } else if (
                            typeof connectionResult === 'object' &&
                            connectionResult.needsEthereumApp
                        ) {
                            // Throw a specific error to signal the UI about the need to open Ethereum app
                            throw new Error('LEDGER_ETHEREUM_APP_CLOSED');
                        } else {
                            console.error(`Failed to connect to ${device}`);
                        }
                    } catch (connectionError) {
                        console.error(`Failed to directly connect to ${device}:`, connectionError);
                    }

                    // If direct connection didn't work, try restoration from storage
                    if (!keyring) {
                        const restorationResult = await this._keyringController.tryRestoreHardwareWalletFromStorage(device);
                        if (restorationResult === true) {

                            // Get the keyring again after restoration
                            keyring = await this._keyringController.getKeyringFromDevice(device);

                            if (!keyring) {
                                console.error(`Keyring restoration for ${device} reported success but keyring still not found`);
                            }
                        } else if (typeof restorationResult === 'object' && restorationResult.needsUserGesture) {
                            throw new Error(`Hardware wallet connection requires user interaction`);
                        } else {
                            console.error(`Failed to restore keyring for ${device} from session storage`);
                        }
                    }
                } catch (restoreError) {
                    console.error(`Error during keyring restoration for ${device}:`, restoreError);
                }
            }

            // Final check if keyring exists
            if (!keyring) {
                // Before giving up, try one last approach - recreate the keyring from scratch
                try {

                    // Try to connect to the hardware wallet directly
                    const connectionResult = await this._keyringController.connectHardwareKeyring(device);

                    if (connectionResult === true) {
                        keyring = await this._keyringController.getKeyringFromDevice(device);

                        // Ensure we persist this new keyring state for future restorations
                        if (keyring) {
                            await this._keyringController['persistHardwareKeyringState'](device);
                        }
                    } else if (
                        typeof connectionResult === 'object' &&
                        connectionResult.needsUserGesture
                    ) {
                        // Throw a specific error to signal the UI about the need for user interaction
                        if (chrome.storage?.session) {
                            try {
                                // Store the need for interaction in session storage
                                await chrome.storage.session.set({
                                    'ledger_needs_user_interaction': {
                                        timestamp: Date.now(),
                                        deviceName: connectionResult.deviceName
                                    }
                                });
                            } catch (e) {
                                console.error("Failed to store user interaction requirement:", e);
                            }
                        }
                        throw new Error('LEDGER_USER_GESTURE_REQUIRED');
                    } else {
                        console.error(`Failed to establish connection with ${device}`);
                    }
                } catch (e) {
                    console.error(`Failed to create new keyring for ${device}:`, e);
                }
            }

            // If we still don't have a keyring, throw an error
            if (!keyring) {
                console.error(`No keyring found for ${device} after all recovery attempts`);
                throw new Error('No keyring found');
            }

            // Log current HD path to help troubleshoot
            let currentHDPath = '';
            try {
                currentHDPath = await this._keyringController.getHDPathForDevice(device);
            } catch (e) {
                console.error('Failed to get HD path:', e);
            }

            // Check if the keyring is unlocked, if not unlock it
            if (device !== Devices.KEYSTONE) {
                try {
                    if (!keyring.isUnlocked()) {
                        await keyring.unlock();
                    }
                } catch (e) {
                    console.error(`Failed to unlock keyring for ${device}:`, e);
                    throw e;
                }
            }

            // Get accounts from the keyring
            try {

                // Add timeout handling to prevent indefinite hanging
                const ACCOUNT_FETCH_TIMEOUT = 45000; // 45 seconds timeout

                let deviceAccounts = [];
                let fetchError = null;

                // First try with the current HD path
                try {
                    deviceAccounts = await Promise.race([
                        keyring.getAccounts(
                            pageSize,
                            pageIndex * pageSize // offset = pageIndex * pageSize
                        ),
                        new Promise<never>((_, reject) => {
                            setTimeout(() => {
                                reject(new Error('LEDGER_ACCOUNT_FETCH_TIMEOUT'));
                            }, ACCOUNT_FETCH_TIMEOUT);
                        })
                    ]);


                    // If we successfully got accounts, no need to try alternatives
                    if (deviceAccounts.length > 0) {
                        // After successfully getting accounts, persist the keyring state
                        try {
                            await this._keyringController['persistHardwareKeyringState'](device);
                        } catch (e) {
                            console.error(`Failed to persist keyring state after getting accounts:`, e);
                        }

                        return deviceAccounts.map((address: string, index: number) => ({
                            index: pageIndex * pageSize + index,
                            address: address,
                            name: `${device} ${pageIndex * pageSize + index + 1}`,
                        }));
                    }
                } catch (e) {
                    fetchError = e;
                    console.warn(`Failed to get accounts with primary HD path ${currentHDPath}:`, e);
                    console.warn(`[LEDGER] Failed to get accounts with primary HD path ${currentHDPath}:`, e);
                }

                // If we failed to get accounts or got empty results, try alternative HD paths
                if (device === Devices.LEDGER && (deviceAccounts.length === 0 || fetchError)) {
                    console.log(`[LEDGER] Trying alternative HD paths...`);

                    // Common alternative paths for Ledger
                    const alternativePaths = [
                        `m/44'/60'/0'`,         // Ledger Live legacy
                        `m/44'/60'/0'/0`,       // MEW, MetaMask
                        `m/44'/60'/0'/0/0`,     // Default with all components
                        `m/44'/1'/0'/0`,        // Testnet
                        `m/44'/60'/1'/0/0`,     // Alternative account
                    ];

                    // Filter out the current path if it's in our list
                    const pathsToTry = alternativePaths.filter(path => path !== currentHDPath);

                    // Try each alternative path
                    for (const path of pathsToTry) {
                        try {
                            console.log(`[LEDGER] Trying alternative HD path: ${path}`);

                            // Try to set the alternative path
                            await this._keyringController.setHDPath(device, path);

                            // Try to get accounts with this path
                            deviceAccounts = await Promise.race([
                                keyring.getAccounts(
                                    pageSize,
                                    pageIndex * pageSize
                                ),
                                new Promise<never>((_, reject) => {
                                    setTimeout(() => {
                                        reject(new Error('LEDGER_ACCOUNT_FETCH_TIMEOUT'));
                                    }, ACCOUNT_FETCH_TIMEOUT / 2); // Use shorter timeout for alternatives
                                })
                            ]);

                            console.log(
                                `[LEDGER] Received ${deviceAccounts.length} accounts using path ${path}`
                            );

                            // If we got accounts, use them
                            if (deviceAccounts.length > 0) {
                                // Persist this working path and keyring state
                                try {
                                    await this._keyringController['persistHardwareKeyringState'](device);

                                    // Store the successful path in session storage for future reference
                                    if (chrome.storage?.session) {
                                        await chrome.storage.session.set({
                                            'ledger_successful_hd_path': {
                                                path: path,
                                                timestamp: Date.now(),
                                                accountCount: deviceAccounts.length
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.error(`Failed to persist working HD path state:`, e);
                                }

                                return deviceAccounts.map((address: string, index: number) => ({
                                    index: pageIndex * pageSize + index,
                                    address: address,
                                    name: `${device} ${pageIndex * pageSize + index + 1}`,
                                }));
                            }
                        } catch (e) {
                            console.warn(`Failed to get accounts with alternative HD path ${path}:`, e);
                            console.warn(`[LEDGER] Failed with path ${path}:`, e.message);
                            // Continue to the next path
                        }
                    }

                    // If we exhausted all paths and still don't have accounts, revert to original path
                    if (deviceAccounts.length === 0) {
                        console.warn(`[LEDGER] No accounts found with any HD path, reverting to original`);
                        try {
                            await this._keyringController.setHDPath(device, currentHDPath);
                        } catch (e) {
                            console.error(`Failed to revert to original HD path:`, e);
                        }

                        // If we had an original error, throw it now
                        if (fetchError) {
                            throw fetchError;
                        }
                    }
                }

                // If we still have no accounts, throw an error
                if (deviceAccounts.length === 0) {
                    console.error(`[LEDGER] No accounts found with any HD path`);
                    throw new Error('No accounts found. Please ensure the Ethereum app is open on your device.');
                }


                // After successfully getting accounts, persist the keyring state
                try {
                    await this._keyringController['persistHardwareKeyringState'](device);
                } catch (e) {
                    console.error(`Failed to persist keyring state after getting accounts:`, e);
                }

                return deviceAccounts.map((address: string, index: number) => ({
                    index: pageIndex * pageSize + index,
                    address: address,
                    name: `${device} ${pageIndex * pageSize + index + 1}`,
                }));
            } catch (e) {
                console.error(`Failed to get accounts from keyring:`, e);

                // Enhance error message for specific errors
                if (e.message.includes('LEDGER_ACCOUNT_FETCH_TIMEOUT')) {
                    throw new Error('Ledger communication timed out. Please ensure your device is unlocked and the Ethereum app is open.');
                } else if (e.message.includes('Ledger') && e.message.includes('timeout')) {
                    throw new Error('Ledger communication timed out. Please ensure your device is unlocked and the Ethereum app is open.');
                } else if (e.message.includes('app')) {
                    throw new Error('Error getting accounts. Please ensure the Ethereum app is open on your Ledger device.');
                }

                throw e;
            }
        })
    );
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

    public getAllAccountAddresses(): string[] {
        const { accounts, hiddenAccounts } = this.store.getState();
        return Object.keys(accounts || {}).concat(
            Object.keys(hiddenAccounts || {})
        );
    }

    /**
     * Change list of tokens order by account and chainId.
     */
    public async editAccountTokensOrder(
        tokensOrder: AccountTokenOrder
    ): Promise<void> {
        const chainId = this._networkController.network.chainId;
        const accountAddress = this._preferencesController.getSelectedAddress();

        this.store.updateState({
            accountTokensOrder: {
                ...this.store.getState().accountTokensOrder,
                [accountAddress]: {
                    ...this.store.getState().accountTokensOrder[accountAddress],
                    [chainId]: tokensOrder,
                },
            },
        });
    }

    /**
     * orderAccounts
     *
     * @param accounts array with all the accounts ordered by the user
     */
    public orderAccounts(accountsInfo: AccountInfo[]): void {
        const accounts = this.store.getState().accounts;
        const hiddenAccounts = this.store.getState().hiddenAccounts;

        accountsInfo.forEach((account) => {
            const address = account.address;
            if (accounts[address]) {
                accounts[address] = {
                    ...accounts[address],
                    index: account.index,
                };
            }
            if (hiddenAccounts[address]) {
                hiddenAccounts[address] = {
                    ...hiddenAccounts[address],
                    index: account.index,
                };
            }
        });

        // save accounts state
        this.store.updateState({
            accounts: accounts,
            hiddenAccounts: hiddenAccounts,
        });
    }

    /**
     * Gets hardware wallet accounts with fallback mechanisms if the primary method fails.
     * This is especially useful in Manifest V3 where service workers can restart.
     *
     * @param device Hardware wallet device type
     * @param pageIndex Account page index
     * @param pageSize Number of accounts per page
     * @returns Array of device account info objects
     */
    public async getHardwareWalletAccountsWithFallback(
        device: Devices,
        pageIndex: number,
        pageSize: number
    ): Promise<DeviceAccountInfo[]> {
        try {
            // First try the standard method
            try {
                const accounts = await this.getHardwareWalletAccounts(device, pageIndex, pageSize);
                if (accounts && accounts.length > 0) {
                    return accounts;
                }
            } catch (e) {
                console.warn(`Standard account retrieval failed for ${device}:`, e);
                // Continue to fallbacks
            }

            // First fallback: Try to reconnect the hardware wallet
            try {
                const connectionResult = await this._keyringController.connectHardwareKeyring(device);
                if (connectionResult === true) {
                    const accounts = await this.getHardwareWalletAccounts(device, pageIndex, pageSize);
                    if (accounts && accounts.length > 0) {
                        return accounts;
                    }
                } else if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                    // For user interaction, we can't proceed with automatic account retrieval
                    throw new Error(`Hardware wallet connection requires user interaction`);
                }
            } catch (reconnectError) {
                console.error(`Failed to reconnect to ${device}:`, reconnectError);
                // Continue to next fallback
            }

            // Second fallback: Try to restore from storage
            try {
                const restored = await this._keyringController.tryRestoreHardwareWalletFromStorage(device);
                if (restored) {
                    const accounts = await this.getHardwareWalletAccounts(device, pageIndex, pageSize);
                    if (accounts && accounts.length > 0) {
                        return accounts;
                    }
                }
            } catch (restoreError) {
                console.error(`Failed to restore ${device} from storage:`, restoreError);
                // Continue to last resort
            }

            // Last resort: Try with a fixed pageIndex and pageSize
            if (pageIndex !== 0 || pageSize !== 5) {
                try {
                    const accounts = await this.getHardwareWalletAccounts(device, 0, 5);
                    if (accounts && accounts.length > 0) {
                        return accounts;
                    }
                } catch (e) {
                    console.error(`Failed to get accounts with default pagination:`, e);
                }
            }

            // If we got here, all attempts failed
            console.error(`Failed to retrieve accounts for ${device} after all fallback attempts`);
            throw new Error(`Could not retrieve accounts from ${device}`);
        } catch (error) {
            console.error(`Error in getHardwareWalletAccountsWithFallback:`, error);
            throw error;
        }
    }

    /**
     * Handles confirmed transactions to trigger balance updates.
     * @param transactionMeta - The metadata of the confirmed transaction.
     */
    private _onTransactionConfirmed(transactionMeta: TransactionMeta): void {
        const { accounts, hiddenAccounts } = this.store.getState();
        const txChainId = transactionMeta.chainId;
        const txFrom = transactionMeta.transactionParams.from;
        const txTo = transactionMeta.transactionParams.to;

        if (!txFrom || !txChainId) {
            console.warn("Confirmed transaction missing sender or chainId", transactionMeta);
            return;
        }

        // Normalize addresses for lookup
        const txFromKey = this._getStorageKey(txFrom);
        const txToKey = txTo ? this._getStorageKey(txTo) : null;

        // Determine which tracked account(s) are involved
        const involvedAddresses: string[] = [];
        if (txFromKey && (accounts[txFromKey] || hiddenAccounts[txFromKey])) {
            involvedAddresses.push(txFrom);
        }
        if (txToKey && txTo && txToKey !== txFromKey && (accounts[txToKey] || hiddenAccounts[txToKey])) {
            involvedAddresses.push(txTo);
        }

        if (involvedAddresses.length === 0) {
            return; // Transaction doesn't involve tracked accounts
        }

        // Determine which asset(s) need updating
        const assetAddressesToUpdate: string[] = [];
        const category = transactionMeta.transactionCategory;

        if (
            category === TransactionCategories.SENT_ETHER ||
            category === TransactionCategories.INCOMING
        ) {
            assetAddressesToUpdate.push(NATIVE_TOKEN_ADDRESS);
        } else if (
            category === TransactionCategories.TOKEN_METHOD_TRANSFER ||
            category === TransactionCategories.TOKEN_METHOD_TRANSFER_FROM ||
            category === TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER
        ) {
            const tokenAddress = transactionMeta.transactionParams.to;
            if (tokenAddress) {
                assetAddressesToUpdate.push(tokenAddress);
                if (involvedAddresses.includes(txFrom)) {
                    assetAddressesToUpdate.push(NATIVE_TOKEN_ADDRESS);
                }
            }
        } else if (category === TransactionCategories.CONTRACT_INTERACTION) {
            if (involvedAddresses.includes(txFrom)) {
                assetAddressesToUpdate.push(NATIVE_TOKEN_ADDRESS);
            }
        }
        // Add more category checks if needed

        if (assetAddressesToUpdate.length > 0) {
            // Use Promise.allSettled to avoid one failure stopping others
            Promise.allSettled(involvedAddresses.map(addr => {
                return this.updateAccounts(
                    {
                        addresses: [addr], // Update one account at a time
                        assetAddresses: assetAddressesToUpdate,
                    },
                    txChainId
                );
            }
            )).catch(err => {
                console.error("[AccTrk] Error during post-confirmation balance update:", err);
            });
        }
    }
}
