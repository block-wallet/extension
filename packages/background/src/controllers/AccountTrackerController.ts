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
                    await this.updateAccounts(
                        {
                            addresses: [accountAddress],
                            assetAddresses: tokenAddresses,
                        },
                        chainId
                    );
                } catch (err) {
                    log.warn(
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
                if (
                    transactionMeta.transactionCategory !==
                    TransactionCategories.TOKEN_METHOD_APPROVE
                ) {
                    return;
                }
                return this._onApprovalTransactionUpdate(transactionMeta);
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
            log.warn(
                'Unable to resolve spender and token address from transaction',
                transactionMeta
            );
            return;
        }

        const { accounts, hiddenAccounts } = this.store.getState();
        const account =
            accounts[accountAddress] || hiddenAccounts[accountAddress];
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
            this._updateAccountAllowancesState(accountAddress, {
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
                accountAddress,
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
            log.warn('Unable to get total supply of token:', tokenAddress, e);
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
            log.warn(
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
                    log.warn(
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
                    log.warn(
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
                        log.warn(
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
        const account =
            accounts[accountAddress] || hiddenAccounts[accountAddress];

        try {
            const newAccountAllowances =
                await this._getUpdatedAccountAllowancesFromEvent(
                    chainId,
                    account,
                    newAllowances
                );

            if (newAccountAllowances) {
                this._updateAccountAllowancesState(
                    accountAddress,
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
        if (accountAddress in accounts) {
            this.store.updateState({
                accounts: {
                    ...this.store.getState().accounts,
                    [accountAddress]: {
                        ...this.store.getState().accounts[accountAddress],
                        allowances: cleanedAllowances,
                    },
                },
            });
        } else if (accountAddress in hiddenAccounts) {
            this.store.updateState({
                hiddenAccounts: {
                    ...this.store.getState().hiddenAccounts,
                    [accountAddress]: {
                        ...this.store.getState().hiddenAccounts[accountAddress],
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
                log.warn('Error getting old allowance transaction by hash', e);
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
        // Checksum address
        address = toChecksumAddress(address);

        const primaryAccountInfo: AccountInfo = {
            address,
            name: 'Account 1',
            accountType: AccountType.HD_ACCOUNT,
            index: 0, // first account
            balances: {},
            status: AccountStatus.ACTIVE,
            allowances: {},
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
            allowances: {},
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
            // Skip already imported accounts
            if (address in trackedAccounts) {
                continue;
            }

            // Checksum received account address
            const newAccount = toChecksumAddress(address);

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
            allowances: {},
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

        const accountsNumber = Object.keys(accounts).length;

        if (accountsNumber === 1) {
            throw new Error("Can't hide last account");
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
     * Get account name
     *
     * @param address account address
     * @return name of the account
     */
    public getAccountName(address: string): string | undefined {
        const { accounts } = this.store.getState();

        const accountName = accounts[checksummedAddress(address)]?.name;

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
            : Zero;

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
     * Resets an account and associated balances
     *
     */
    public resetAccount(address: string): void {
        const stateAccounts = this.store.getState().accounts;
        stateAccounts[address].balances = {};
        stateAccounts[address].allowances = {};

        this.store.updateState({
            accounts: stateAccounts,
        });
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
            if (device !== Devices.KEYSTONE) {
                if (!keyring.isUnlocked()) {
                    await keyring.unlock();
                }
            }

            keyring.perPage = pageSize;

            const deviceAccounts: [] = await this._keyringController.getPage(
                device,
                keyring,
                pageIndex
            );
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
}
