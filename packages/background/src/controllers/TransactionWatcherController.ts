import { Mutex } from 'async-mutex';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionResponse } from '@ethersproject/providers';
import { LogDescription, ParamType } from '@ethersproject/abi';
import log from 'loglevel';
import { BaseController } from '../infrastructure/BaseController';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../utils/constants/networks';
import { MILISECOND, SECOND } from '../utils/constants/time';
import { sleep } from '../utils/sleep';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import { Token } from './erc-20/Token';
import { TokenController } from './erc-20/TokenController';
import NetworkController, { NetworkEvents } from './NetworkController';
import {
    PreferencesController,
    PreferencesControllerState,
} from './PreferencesController';
import {
    TransactionCategories,
    TransactionEvents,
    TransactionMeta,
    TransactionStatus,
    TransferType,
    WatchedTransactionType,
} from './transactions/utils/types';
import { Block, Log } from '@ethersproject/abstract-provider';
import { SignedTransaction } from './erc-20/transactions/SignedTransaction';
import { TransactionArgument } from './transactions/ContractSignatureParser';
import { showIncomingTransactionNotification } from '../utils/notifications';
import TransactionController from './transactions/TransactionController';
import { fetchBlockWithRetries } from '../utils/blockFetch';
import { isNil } from 'lodash';
import { paddedToChecksumAddress } from '../utils/addressUtils';
import { RPCLogsFetcher } from '../utils/rpc/RPCLogsFetcher';
import { EtherscanFetcher } from '../utils/scanner/EtherscanFetcher';
import {
    chainTopicsToAPITopics,
    getAllowanceSignatureForType,
    getIncomingERC20LogsTopics,
    getOutgoingERC20LogsTopics,
    getTokenApprovalLogsTopics,
} from '../utils/logsQuery';
import { unixTimestampToJSTimestamp } from '../utils/timestamp';

interface TokenAllowanceEvent {
    [tokenAddress: string]: {
        spender: string;
        txHash: string;
        txTime: number;
    }[];
}

export type NewTokenAllowanceSpendersEventParametersSignature = Parameters<
    (
        chainId: number,
        accountAddress: string,
        allowances: TokenAllowanceEvent
    ) => void
>;

export interface TransactionByHash {
    [txHash: string]: TransactionMeta;
}

export interface TransactionsWatched {
    transactions: TransactionByHash;
    lastBlockQueried: number;
}

export interface TokenAllowanceEventWatched {
    lastBlockQueried: number;
}

export interface TransactionWatcherControllerState {
    transactions: {
        [chainId: number]: {
            [address: string]: {
                [type in WatchedTransactionType]: TransactionsWatched;
            };
        };
    };
    tokenAllowanceEvents: {
        [chainId: number]: {
            [address: string]: {
                [type in WatchedTransactionType]: TokenAllowanceEventWatched;
            };
        };
    };
}

export const TRANSACTION_TYPE_STATUS: {
    [type in WatchedTransactionType]: boolean;
} = {
    txlist: false,
    tokentx: true,
    tokennfttx: false,
    token1155tx: false,
};

//run only for erc20 approvals
export const ALLOWANCE_EVENTS_TRANSACTION_TYPE_STATUS: {
    [type in WatchedTransactionType]: boolean;
} = {
    tokentx: true,
    txlist: false,
    tokennfttx: false,
    token1155tx: false,
};

export enum TransactionWatcherControllerEvents {
    NEW_KNOWN_ERC20_TRANSACTIONS = 'NEW_KNOWN_ERC20_TRANSACTIONS',
    NEW_KNOWN_TOKEN_ALLOWANCE_SPENDERS = 'NEW_KNOWN_TOKEN_ALLOWANCE_SPENDERS',
    NEW_ERC20_TRANSACTIONS = 'NEW_ERC20_TRANSACTIONS',
    INCOMING_TRANSACTION = 'INCOMING_TRANSACTION',
}

interface EtherscanTransaction {
    blockNumber: number;
    blockHash: string;
    timeStamp: number;
    isError: string;
    to: string;
    from: string;
    hash: string;
    nonce: number;
    input: string;
    value: string;
    gasPrice: string;
    gas: string;
    gasUsed: string;
    transactionIndex: string;
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
    functionName: string;
}

const MAX_REQUEST_RETRY = 20;
const EXPLORER_API_CALLS_DELAY = 2000 * MILISECOND;

export class TransactionWatcherController extends BaseController<TransactionWatcherControllerState> {
    private readonly _mutex: Mutex;
    private readonly _txWatcherIntervalController: ActionIntervalController;

    constructor(
        private readonly _networkController: NetworkController,
        private readonly _preferencesController: PreferencesController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly _tokenController: TokenController,
        private readonly _transactionController: TransactionController,
        initialState: TransactionWatcherControllerState
    ) {
        super(initialState);

        this._mutex = new Mutex();
        this._txWatcherIntervalController = new ActionIntervalController(
            this._networkController
        );

        this._networkController.on(NetworkEvents.NETWORK_CHANGE, () => {
            this.fetchAccountOnChainEvents();
        });

        this._preferencesController.store.subscribe(
            (
                state: PreferencesControllerState,
                previousState?: PreferencesControllerState
            ) => {
                if (
                    previousState &&
                    state.selectedAddress !== previousState.selectedAddress
                )
                    this.fetchAccountOnChainEvents();
            }
        );

        this._blockUpdatesController.on(
            BlockUpdatesEvents.BLOCK_UPDATES_SUBSCRIPTION,
            this._blockUpdatesCallback
        );

        this._blockUpdatesController.on(
            BlockUpdatesEvents.BACKGROUND_AVAILABLE_BLOCK_UPDATES_SUBSCRIPTION,
            this._blockUpdatesCallback
        );

        this._transactionController.on(
            TransactionEvents.STATUS_UPDATE,
            async (meta: TransactionMeta) => {
                if (meta.status === TransactionStatus.CONFIRMED) {
                    return this.fetchAccountOnChainEvents(
                        meta.chainId,
                        undefined,
                        true
                    );
                }
            }
        );

        // Show incoming transaction notification
        this.on(
            'INCOMING_TRANSACTION',
            async (
                chainId: number,
                address: string,
                transactionType: WatchedTransactionType
            ) => {
                let section:
                    | ''
                    | 'tokentxns'
                    | 'tokentxnsErc721'
                    | 'tokentxnsErc1155' = '';
                switch (transactionType) {
                    case WatchedTransactionType.ERC20:
                        section = 'tokentxns';
                        break;
                    case WatchedTransactionType.ERC721:
                        section = 'tokentxnsErc721';
                        break;
                    case WatchedTransactionType.ERC1155:
                        section = 'tokentxnsErc1155';
                        break;
                }
                showIncomingTransactionNotification(address, chainId, section);
            }
        );

        this._fetchPendingTimestampsFromChain();
    }

    /**
     * _blockUpdatesCallback
     *
     * Triggered when a new block is detected
     */
    private _blockUpdatesCallback = async (
        chainId: number,
        _: number,
        blockNumber: number
    ) => {
        const network = this._networkController.getNetworkFromChainId(chainId);
        const interval =
            network?.actionsTimeIntervals.transactionWatcherUpdate ||
            ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.transactionWatcherUpdate;

        this._txWatcherIntervalController.tick(interval, async () => {
            await this.fetchAccountOnChainEvents(chainId, blockNumber);
        });
    };

    /**
     * return the state by chain, address and type
     */
    public getTransactionState(
        type: WatchedTransactionType,
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress()
    ): TransactionsWatched {
        const state = this.store.getState() || {};

        if (state.transactions) {
            if (chainId in state.transactions) {
                if (address in state.transactions[chainId]) {
                    if (type in state.transactions[chainId][address]) {
                        return state.transactions[chainId][address][type];
                    }
                }
            }
        }

        return {
            transactions: {},
            lastBlockQueried: 0,
        } as TransactionsWatched;
    }

    /**
     * return the state by chain, address and type
     */
    public getAllowanceEventsState(
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress(),
        type: WatchedTransactionType
    ): TokenAllowanceEventWatched {
        const state = this.store.getState() || {};

        if (state.tokenAllowanceEvents) {
            if (chainId in state.tokenAllowanceEvents) {
                if (address in state.tokenAllowanceEvents[chainId]) {
                    return state.tokenAllowanceEvents[chainId][address][type];
                }
            }
        }

        return {
            lastBlockQueried: 0,
        } as TokenAllowanceEventWatched;
    }

    /**
     * save the state by chain, address and type
     */
    public setTransactionsState(
        type: WatchedTransactionType,
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress(),
        transactionsWatched: TransactionsWatched
    ): void {
        const state = this.store.getState() || {};

        if (!state.transactions) {
            state.transactions = {};
        }
        if (!(chainId in state.transactions)) {
            state.transactions[chainId] = {};
        }
        if (!(address in state.transactions[chainId])) {
            state.transactions[chainId][address] = {
                txlist: {
                    transactions: {},
                    lastBlockQueried: 0,
                },
                tokentx: {
                    transactions: {},
                    lastBlockQueried: 0,
                },
                tokennfttx: {
                    transactions: {},
                    lastBlockQueried: 0,
                },
                token1155tx: {
                    transactions: {},
                    lastBlockQueried: 0,
                },
            };
        }
        if (!(type in state.transactions[chainId][address])) {
            state.transactions[chainId][address][type] = {
                transactions: {},
                lastBlockQueried: 0,
            };
        }

        for (const transactionHash in transactionsWatched.transactions) {
            state.transactions[chainId][address][type].transactions[
                transactionHash
            ] = transactionsWatched.transactions[transactionHash];
        }

        if (
            transactionsWatched.lastBlockQueried >
            state.transactions[chainId][address][type].lastBlockQueried
        ) {
            state.transactions[chainId][address][type].lastBlockQueried =
                transactionsWatched.lastBlockQueried;
        }

        this.store.updateState({
            transactions: {
                ...state.transactions,
                [chainId]: {
                    ...state.transactions[chainId],
                    [address]: {
                        ...state.transactions[chainId][address],
                        [type]: {
                            ...state.transactions[chainId][address][type],
                        },
                    },
                },
            },
        });
    }

    public setAllowancesState(
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress(),
        type: WatchedTransactionType,
        eventsWatched: TokenAllowanceEventWatched
    ) {
        const state = this.store.getState() || {};

        if (!state.tokenAllowanceEvents) {
            state.tokenAllowanceEvents = {};
        }
        if (!(chainId in state.tokenAllowanceEvents)) {
            state.tokenAllowanceEvents[chainId] = {};
        }
        if (!(address in state.tokenAllowanceEvents[chainId])) {
            state.tokenAllowanceEvents[chainId][address] = {
                txlist: {
                    lastBlockQueried: 0,
                },
                token1155tx: {
                    lastBlockQueried: 0,
                },
                tokentx: {
                    lastBlockQueried: 0,
                },
                tokennfttx: {
                    lastBlockQueried: 0,
                },
            };
        }

        if (!(type in state.transactions[chainId][address])) {
            state.tokenAllowanceEvents[chainId][address][type] = {
                lastBlockQueried: 0,
            };
        }

        if (
            eventsWatched.lastBlockQueried >
            state.tokenAllowanceEvents[chainId][address][type].lastBlockQueried
        ) {
            state.tokenAllowanceEvents[chainId][address][
                type
            ].lastBlockQueried = eventsWatched.lastBlockQueried;
        }

        this.store.updateState({
            tokenAllowanceEvents: {
                ...state.tokenAllowanceEvents,
                [chainId]: {
                    ...state.tokenAllowanceEvents[chainId],
                    [address]: {
                        ...state.tokenAllowanceEvents[chainId][address],
                        [type]: {
                            ...state.tokenAllowanceEvents[chainId][address][
                                type
                            ],
                        },
                    },
                },
            },
        });
    }

    /**
     * Remove the transactions data of an account.
     * @param address
     */
    public resetTransactionsByAddress = async (
        address: string
    ): Promise<void> => {
        const transactions = this.store.getState().transactions;
        let anyUpdate = false;
        for (const c in transactions) {
            const chainId = parseInt(c);
            if (address in transactions[chainId]) {
                for (const type in transactions[chainId][address]) {
                    const trasactionType = type as WatchedTransactionType;
                    delete transactions[chainId][address][trasactionType];
                    anyUpdate = true;
                }
            }
        }

        if (anyUpdate) {
            this.store.updateState({
                transactions,
            });
        }
    };

    /**
     * fetchAccountOnChainEvents
     * This method fetches allowances events alogn with confirmed erc20 and incoming transactions.
     * @param chainId
     * @param currentBlock
     * @returns
     */
    public fetchAccountOnChainEvents = async (
        chainId: number = this._networkController.network.chainId,
        currentBlock: number = this._blockUpdatesController.getBlockNumber(),
        forceChainQuery = false
    ): Promise<void> => {
        if (currentBlock <= 0) {
            return;
        }
        return this._mutex.runExclusive(async () => {
            // the execution could be stuck in the mutex for some time,
            // the selected network could change in the wait.
            if (chainId !== this._networkController.network.chainId) {
                return;
            }
            try {
                const address =
                    this._preferencesController.getSelectedAddress();
                if (!address) {
                    return;
                }

                const { etherscanApiUrl } = this._networkController.network;
                const provider = this._networkController.getProvider();
                const rpcLogsFetcher = new RPCLogsFetcher(provider);
                const etherscanApiUrlValid =
                    typeof etherscanApiUrl !== 'undefined' &&
                    etherscanApiUrl.length > 0;

                // the execution could be stuck in the mutex for some time,
                // lets update the last block
                currentBlock =
                    this._blockUpdatesController.getBlockNumber(chainId);

                // fetch all the enabled transactions type
                for (const type in TRANSACTION_TYPE_STATUS) {
                    const transactionType = type as WatchedTransactionType;

                    if (!TRANSACTION_TYPE_STATUS[transactionType]) {
                        continue;
                    }

                    // if there isnt any etherscan api available the native transactions
                    // can't be fetched
                    if (
                        !etherscanApiUrlValid &&
                        transactionType === WatchedTransactionType.Native
                    ) {
                        continue;
                    }

                    const currentTransactionsWatched = this.getTransactionState(
                        transactionType,
                        chainId,
                        address
                    );

                    let newTransactions: TransactionByHash = {};
                    let tokenAddresses: string[] = [];

                    let fetchEtherscanApi = true;
                    if (transactionType !== WatchedTransactionType.Native) {
                        if (forceChainQuery || !etherscanApiUrlValid) {
                            fetchEtherscanApi = false;
                        }
                    }

                    if (fetchEtherscanApi && etherscanApiUrl) {
                        try {
                            const etherscanFetcher = new EtherscanFetcher(
                                etherscanApiUrl
                            );
                            const result = await this._getTransactionsFromAPI(
                                etherscanFetcher,
                                chainId,
                                address,
                                transactionType,
                                currentTransactionsWatched,
                                currentBlock
                            );
                            newTransactions = result.transactions;
                            tokenAddresses = result.tokenAddresses;
                        } catch (e: any) {
                            log.warn(
                                'fetchAccountOnChainEvents',
                                '_getTransactionsFromAPI',
                                e
                            );
                            this._emitNewERC20TransactionsEvent(
                                chainId,
                                address,
                                transactionType
                            );
                            continue;
                        }
                    } else {
                        try {
                            const result = await this._getTransactionsFromChain(
                                rpcLogsFetcher,
                                chainId,
                                address,
                                transactionType,
                                currentTransactionsWatched.lastBlockQueried,
                                currentBlock
                            );
                            newTransactions = result.transactions;
                            tokenAddresses = result.tokenAddresses;
                        } catch (e: any) {
                            log.warn(
                                'fetchAccountOnChainEvents',
                                '_getTransactionsFromChain',
                                e
                            );
                            this._emitNewERC20TransactionsEvent(
                                chainId,
                                address,
                                transactionType
                            );
                            continue;
                        }
                    }

                    // events
                    this._emitIncomingTransactionEvent(
                        chainId,
                        address,
                        transactionType,
                        currentTransactionsWatched.transactions,
                        newTransactions
                    );

                    this._emitNewKnownERC20TransactionsEvent(
                        chainId,
                        address,
                        tokenAddresses,
                        transactionType
                    );

                    // state
                    this.setTransactionsState(
                        transactionType,
                        chainId,
                        address,
                        {
                            transactions: newTransactions,
                            lastBlockQueried: currentBlock,
                        }
                    );

                    // to avoid rate limits
                    if (!forceChainQuery) {
                        await sleep(EXPLORER_API_CALLS_DELAY);
                    }
                }

                for (const type in ALLOWANCE_EVENTS_TRANSACTION_TYPE_STATUS) {
                    const transactionType = type as WatchedTransactionType;

                    if (!TRANSACTION_TYPE_STATUS[transactionType]) {
                        continue;
                    }

                    const tokenAllowanceEventsState =
                        this.getAllowanceEventsState(
                            chainId,
                            address,
                            transactionType
                        );
                    let approvalLogs: Log[] = [];

                    //fetch allowances events
                    if (!forceChainQuery && etherscanApiUrlValid) {
                        const etherscanFetcher = new EtherscanFetcher(
                            etherscanApiUrl
                        );
                        ({ logs: approvalLogs } =
                            await this._getTokenApprovalLogsFromAPI(
                                etherscanFetcher,
                                address,
                                tokenAllowanceEventsState.lastBlockQueried,
                                currentBlock,
                                transactionType
                            ));
                    } else {
                        const lastBlockQueried =
                            rpcLogsFetcher.getOldestSafeBlockToFetchERC20Logs(
                                tokenAllowanceEventsState.lastBlockQueried,
                                currentBlock
                            );
                        ({ logs: approvalLogs } =
                            await this._getTokenApprovalLogsFromChain(
                                rpcLogsFetcher,
                                address,
                                currentBlock,
                                lastBlockQueried,
                                transactionType
                            ));
                    }

                    const allowanceEvents =
                        await this._generateAllowanceEventsFromLogs(
                            approvalLogs || [],
                            rpcLogsFetcher,
                            transactionType
                        );

                    if (Object.keys(allowanceEvents).length) {
                        this._emitNewKnownSpendersEvent(
                            chainId,
                            address,
                            allowanceEvents
                        );
                    }

                    this.setAllowancesState(chainId, address, transactionType, {
                        lastBlockQueried: currentBlock,
                    });

                    // to avoid rate limits
                    if (!forceChainQuery) {
                        await sleep(EXPLORER_API_CALLS_DELAY);
                    }
                }
            } catch (e) {
                log.warn('fetchAccountOnChainEvents', e.message || e);
            }
        });
    };

    // ###################### CHAIN LOGS METHODS ######################

    private _getTransactionsFromChain = async (
        rpcLogsFetcher: RPCLogsFetcher,
        chainId: number,
        address: string,
        transactionType: WatchedTransactionType,
        lastBlockQueried: number,
        currentBlock: number
    ): Promise<{
        transactions: TransactionByHash;
        tokenAddresses: string[];
    }> => {
        // logs fetch
        const getLogsResults = await this._getTransactionLogsFromChain(
            rpcLogsFetcher,
            chainId,
            address,
            transactionType,
            currentBlock,
            lastBlockQueried
        );

        const { incoming, outgoing } = getLogsResults;

        const {
            transactions: incomingTransactions,
            tokenAddresses: incomingTokenAddresses,
        } = await this._parseTransactionLogs(chainId, address, incoming, true);
        const {
            transactions: outgoingTransactions,
            tokenAddresses: outgoingTokenAddresses,
        } = await this._parseTransactionLogs(chainId, address, outgoing, false);

        const transactions = Object.assign(
            incomingTransactions,
            outgoingTransactions
        );

        const tokenAddresses: string[] = [];
        incomingTokenAddresses.map((tokenAddress: string) => {
            if (!tokenAddresses.includes(tokenAddress)) {
                tokenAddresses.push(tokenAddress);
            }
        });
        outgoingTokenAddresses.map((tokenAddress: string) => {
            if (!tokenAddresses.includes(tokenAddress)) {
                tokenAddresses.push(tokenAddress);
            }
        });

        return { transactions, tokenAddresses };
    };

    /**
     * Fetch incoming and outgoing transfer events logs
     * @param chainId
     * @param address
     * @param currentBlock
     * @returns
     */
    private _getTransactionLogsFromChain = async (
        rpcLogsFetcher: RPCLogsFetcher,
        chainId: number,
        address: string,
        transactionType: WatchedTransactionType,
        currentBlock: number,
        stateLastBlockQueried: number
    ): Promise<{ incoming: Log[]; outgoing: Log[] }> => {
        const lastBlockQueried =
            rpcLogsFetcher.getOldestSafeBlockToFetchERC20Logs(
                stateLastBlockQueried,
                currentBlock
            );

        // if we can not fetch the whole events history we must
        // force a token balance discovery
        const completion = lastBlockQueried <= stateLastBlockQueried;
        if (!completion) {
            this._emitNewERC20TransactionsEvent(
                chainId,
                address,
                transactionType
            );
        }

        const chainLastMinedBlock =
            this._blockUpdatesController.getBlockNumber();

        const incoming = await rpcLogsFetcher.getLogsFromChainInBatch(
            {
                fromBlock: lastBlockQueried,
                toBlock: currentBlock,
                topics: getIncomingERC20LogsTopics(address, transactionType),
                address: address,
            },
            chainLastMinedBlock
        );

        const outgoing = await rpcLogsFetcher.getLogsFromChainInBatch(
            {
                fromBlock: lastBlockQueried,
                toBlock: currentBlock,
                topics: getOutgoingERC20LogsTopics(address, transactionType),
                address: address,
            },
            chainLastMinedBlock
        );

        return {
            incoming,
            outgoing,
        };
    };

    /**
     * Get token approval logs directly from the chain
     * @param chainId
     * @param address
     * @param currentBlock
     * @returns
     */
    private _getTokenApprovalLogsFromChain = async (
        rpcLogsFetcher: RPCLogsFetcher,
        address: string,
        currentBlock: number,
        lastBlockQueried: number,
        transactionType: WatchedTransactionType
    ): Promise<{ logs: Log[] }> => {
        const topics = getTokenApprovalLogsTopics(address, transactionType);
        if (!topics[0]) {
            return { logs: [] };
        }

        const lastMinedBlock = this._blockUpdatesController.getBlockNumber();

        const logs = await rpcLogsFetcher.getLogsFromChainInBatch(
            {
                fromBlock: lastBlockQueried,
                toBlock: currentBlock,
                topics,
            },
            lastMinedBlock
        );

        return {
            logs,
        };
    };

    /**
     * Parse logs to transaction meta
     * @param logs
     * @param chainId
     * @returns
     */
    private _parseTransactionLogs = async (
        chainId: number,
        address: string,
        logs: Log[],
        incoming: boolean
    ): Promise<{
        transactions: TransactionByHash;
        tokenAddresses: string[];
    }> => {
        const tokenAddresses: string[] = [];
        logs.map((_log: Log) => {
            if (!tokenAddresses.includes(_log.address)) {
                tokenAddresses.push(_log.address);
            }
        });

        const transactions = await Object.assign(
            {},
            ...(await Promise.all(
                logs
                    .filter(
                        (_log: Log) =>
                            SignedTransaction.parseLogData(
                                _log.topics,
                                _log.data
                            ) !== undefined
                    )
                    .map(async (_log: Log) => {
                        return {
                            [_log.transactionHash]:
                                await this._formatTransactionFromChain(
                                    chainId,
                                    address,
                                    _log,
                                    incoming,
                                    logs.length < 20
                                ),
                        };
                    })
            ))
        );

        return { transactions, tokenAddresses };
    };

    /**
     * Parses a Log into a transaction
     * @param Log
     * @returns TransactionMeta
     */
    private _formatTransactionFromChain = async (
        chainId: number,
        address: string,
        _log: Log,
        incoming: boolean,
        transactionFetchEnabled: boolean
    ) => {
        let contractAddress: string = _log.address;
        let token: Token = { logo: '', decimals: 1, symbol: '' } as Token;
        let logData: LogDescription | undefined;
        let txResponse: Partial<TransactionResponse> = {
            value: undefined,
            nonce: undefined,
            type: undefined,
            gasLimit: undefined,
            gasPrice: undefined,
            maxPriorityFeePerGas: undefined,
            maxFeePerGas: undefined,
        };

        try {
            contractAddress = toChecksumAddress(_log.address);

            const { tokens } = await this._tokenController.search(
                contractAddress,
                true,
                address,
                chainId
            );
            token = tokens.length
                ? tokens[0]
                : ({ logo: '', decimals: 1, symbol: '' } as Token);

            logData = SignedTransaction.parseLogData(_log.topics, _log.data);
        } catch (e) {
            log.warn(
                '_formatTransactionFromChain',
                'parseLogData',
                _log.transactionHash,
                e
            );
        }

        if (
            transactionFetchEnabled &&
            incoming &&
            this._isTransactionNew(_log)
        ) {
            try {
                txResponse = await this._networkController
                    .getProvider()
                    .getTransaction(_log.transactionHash);
            } catch (e) {
                log.warn(
                    '_formatTransactionFromChain',
                    'getTransaction',
                    _log.transactionHash,
                    e
                );
            }
        }

        return {
            rawTransaction: _log.data,
            status: !_log.removed
                ? TransactionStatus.CONFIRMED
                : TransactionStatus.FAILED,
            time: 0,
            submittedTime: 0,
            confirmationTime: 0,
            chainId,
            transactionParams: {
                hash: _log.transactionHash,
                to: logData?.args.to,
                from: logData?.args.from,
                nonce: txResponse.nonce,
                gasLimit: txResponse.gasLimit,
                gasPrice: txResponse.gasPrice,
                data: _log.data,
                value: txResponse.value,
                chainId,
                type: txResponse.type,
                maxPriorityFeePerGas: txResponse.maxPriorityFeePerGas,
                maxFeePerGas: txResponse.maxFeePerGas,
            },
            transactionReceipt: {
                to: _log.topics[1],
                from: _log.topics[0],
                contractAddress,
                transactionIndex: _log.transactionIndex,
                // root: "",
                // gasUsed: BigNumber.from("0"),
                // logsBloom: "",
                blockHash: _log.blockHash,
                transactionHash: _log.transactionHash,
                // logs: []
                blockNumber: _log.blockNumber,
                // confirmations: 0,
                // cumulativeGasUsed: BigNumber.from("0"),
                // effectiveGasPrice: BigNumber.from("0"),
            },
            transactionCategory: incoming
                ? TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER
                : TransactionCategories.TOKEN_METHOD_TRANSFER,
            transferType: {
                to: logData?.args.to,
                logo: token.logo,
                decimals: token.decimals,
                amount: BigNumber.isBigNumber(logData?.args.value)
                    ? BigNumber.from(logData?.args.value)
                    : undefined,
                currency: token.symbol,
            },
            methodSignature: {
                name: logData?.name,
                args: logData?.eventFragment.inputs.map((input: ParamType) => {
                    let value: any;
                    if (logData && input.name in logData.args) {
                        value = logData.args[input.name];

                        if (BigNumber.isBigNumber(value)) {
                            value = BigNumber.from(value);
                        }
                    }

                    return {
                        type: input.type,
                        name: input.name,
                        value,
                    } as TransactionArgument;
                }),
            },
        } as Partial<TransactionMeta>;
    };

    /**
     * Detects if a log belongs to a new transaction.
     * New transaction means that it was mined in a block not older than 50 blocks
     * @param Log
     * @returns boolean
     */
    private _isTransactionNew = ({ blockNumber: txBlock }: Log): boolean => {
        const currentBlock = this._blockUpdatesController.getBlockNumber();
        const delta = Math.abs(currentBlock - txBlock);

        return delta < 30;
    };

    /**
     * Detects the transactions where the timestamp is not known,
     * fetches the transaction block, pick the timestamp and updates
     * the transaction.
     */
    private _fetchPendingTimestampsFromChain = async (): Promise<any> => {
        while (this.store.getState().transactions) {
            const chainId = this._networkController.network.chainId;
            const provider = this._networkController.getProvider();

            const transactionByAddress =
                this.store.getState().transactions[chainId];
            const blockNumbers: number[] = [];

            for (const address in transactionByAddress) {
                for (const type in transactionByAddress[address]) {
                    const transactionType = type as WatchedTransactionType;
                    const transactions =
                        transactionByAddress[address][
                            transactionType as WatchedTransactionType
                        ];

                    for (const transactionHash in transactions.transactions) {
                        const tx = transactions.transactions[transactionHash];

                        if (
                            !tx.time ||
                            !tx.submittedTime ||
                            !tx.confirmationTime
                        ) {
                            if (tx.transactionReceipt?.blockNumber) {
                                if (
                                    !blockNumbers.includes(
                                        tx.transactionReceipt?.blockNumber
                                    )
                                ) {
                                    blockNumbers.push(
                                        tx.transactionReceipt?.blockNumber
                                    );
                                }
                            }
                        }
                    }
                }
            }

            const blockNumbersOrdered = blockNumbers.sort((a, b) => b - a);
            for (let i = 0; i < blockNumbers.length; i++) {
                const blockNumber = blockNumbersOrdered[i];
                const block = await fetchBlockWithRetries(
                    blockNumber,
                    provider,
                    MAX_REQUEST_RETRY
                );

                if (block && !isNil(block.number)) {
                    this._updateTransactionsTimestampsFromChain(chainId, block);
                }
            }

            if (!blockNumbers.length) {
                await sleep(1 * SECOND);
            }
        }
    };

    /**
     * Updates 'time', 'submittedTime' and 'confirmationTime' of the transactions from the block data
     * @param chainId
     * @param block
     */
    private _updateTransactionsTimestampsFromChain = (
        chainId: number,
        block: Block
    ) => {
        const timestamp = unixTimestampToJSTimestamp(block.timestamp);

        const addresses = this.store.getState().transactions[chainId];
        for (const address in addresses) {
            for (const type in addresses[address]) {
                const transactionType = type as WatchedTransactionType;
                const transactions = this.getTransactionState(
                    transactionType,
                    chainId,
                    address
                );

                for (const transactionHash in transactions.transactions) {
                    const tx = transactions.transactions[transactionHash];

                    if (
                        tx.transactionReceipt?.blockNumber === block.number &&
                        timestamp
                    ) {
                        tx.time = timestamp;
                        tx.submittedTime = timestamp;
                        tx.confirmationTime = timestamp;

                        transactions.transactions[transactionHash] = tx;
                    }
                }

                this.setTransactionsState(
                    transactionType,
                    chainId,
                    address,
                    transactions
                );
            }
        }
    };

    // ###################### API METHODS ######################

    /**
     * Fetches and formats transactions from api.
     * @param chainId
     * @param address
     * @param etherscanApiUrl
     * @param transactionType
     * @param lastBlockQueried
     * @param currentBlock
     * @returns
     */
    private _getTransactionsFromAPI = async (
        etherscanFetcher: EtherscanFetcher,
        chainId: number,
        address: string,
        transactionType: WatchedTransactionType,
        currentTransactionsWatched: TransactionsWatched,
        currentBlock: number
    ): Promise<{
        transactions: TransactionByHash;
        tokenAddresses: string[];
    }> => {
        const fromBlock = currentTransactionsWatched.lastBlockQueried;
        const { result, status } =
            await etherscanFetcher.fetch<EtherscanTransaction>({
                module: 'account',
                action: transactionType.toString(),
                address,
                startblock: fromBlock - 100 > 0 ? fromBlock - 100 : 0, // this avoid sync delays of the API.
                endblock: currentBlock,
                page: 1,
            });

        // the request failed
        if (status === '-999') {
            throw Error('etherscan api error');
        }

        if (!this._isAPIResponseValid(result, status)) {
            return { transactions: {}, tokenAddresses: [] };
        }

        const etherscanTransactions: EtherscanTransaction[] = result
            .filter(
                (tx: EtherscanTransaction) =>
                    !(tx.hash in currentTransactionsWatched.transactions)
            )
            .filter((tx: EtherscanTransaction) => {
                return (
                    transactionType !== WatchedTransactionType.Native ||
                    tx.input.length < 4
                );
            });

        const tokenAddresses: string[] = [];
        if (transactionType !== WatchedTransactionType.Native) {
            etherscanTransactions.map((tx: EtherscanTransaction) => {
                if (!tokenAddresses.includes(tx.contractAddress)) {
                    tokenAddresses.push(tx.contractAddress);
                }
            });
        }

        const transactions = await Object.assign(
            {},
            ...(await Promise.all(
                etherscanTransactions.map(async (tx: EtherscanTransaction) => {
                    return {
                        [tx.hash]: await this._formatTransactionFromAPI(
                            transactionType,
                            chainId,
                            address,
                            tx
                        ),
                    };
                })
            ))
        );

        return { transactions, tokenAddresses };
    };

    /**
     * Gets token approval/allowance logs events from the API.
     *
     * @param etherscanApiUrl
     * @param address
     * @param fromBlock
     * @param endBlock
     * @returns { result: Log[]; status: string }
     */
    private _getTokenApprovalLogsFromAPI = async (
        etherscanFetcher: EtherscanFetcher,
        address: string,
        fromBlock: number,
        endBlock: number,
        transactionType: WatchedTransactionType
    ): Promise<{ logs: Log[] }> => {
        const chainQueryTopics = getTokenApprovalLogsTopics(
            address,
            transactionType
        );

        if (!chainQueryTopics[0]) {
            return { logs: [] };
        }

        const params = {
            module: 'logs',
            action: 'getLogs',
            fromBlock: fromBlock - 100 > 0 ? fromBlock - 100 : 0, // this avoid sync delays of the API.
            toBlock: endBlock,
            ...chainTopicsToAPITopics(chainQueryTopics),
            page: 1,
        };
        const { result, status } = await etherscanFetcher.fetch<Log>(params);

        // the request failed
        if (status === '-999') {
            throw Error('etherscan api error');
        }

        if (!this._isAPIResponseValid(result, status)) {
            return { logs: [] };
        }

        return { logs: result };
    };

    /**
     * Check if the response from the API is valid
     * @param result
     * @param status
     * @returns
     */
    private _isAPIResponseValid = (
        result: EtherscanTransaction[] | Log[],
        status: string
    ): boolean => {
        return status === '1' && Array.isArray(result) && result.length > 0;
    };

    /**
     * Parses EtherscanTransaction as TransactionMeta
     * @param type
     * @param chainId
     * @param address
     * @param tx
     * @returns TransactionMeta
     */
    private _formatTransactionFromAPI = async (
        type: WatchedTransactionType,
        chainId: number,
        address: string,
        tx: EtherscanTransaction
    ): Promise<Partial<TransactionMeta>> => {
        if (isValidAddress(tx.contractAddress)) {
            tx.contractAddress = toChecksumAddress(tx.contractAddress);
        }

        const time = unixTimestampToJSTimestamp(Number(tx.timeStamp));

        const isIncomming =
            !this._sameAddress(tx.from, address) &&
            this._sameAddress(tx.to, address);
        let transactionCategory: TransactionCategories =
            TransactionCategories.INCOMING;
        switch (type) {
            case WatchedTransactionType.Native:
                if (isIncomming) {
                    transactionCategory = TransactionCategories.INCOMING;
                } else {
                    transactionCategory = TransactionCategories.SENT_ETHER;
                }
                break;
            case WatchedTransactionType.ERC20:
            case WatchedTransactionType.ERC721:
            case WatchedTransactionType.ERC1155:
                if (isIncomming) {
                    transactionCategory =
                        TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER;
                } else {
                    transactionCategory =
                        TransactionCategories.TOKEN_METHOD_TRANSFER;
                }
                break;
        }

        let transferType: TransferType | undefined = undefined;
        if (type === WatchedTransactionType.ERC20) {
            let isLocalSearch = true;
            if (
                !tx.tokenDecimal ||
                isNaN(Number(tx.tokenDecimal)) ||
                !Number(tx.tokenDecimal)
            ) {
                isLocalSearch = false;
            }
            if (!tx.tokenSymbol) {
                isLocalSearch = false;
            }

            const { tokens } = await this._tokenController.search(
                tx.contractAddress,
                true,
                address,
                chainId,
                isLocalSearch
            );
            const token = {
                logo: '',
                decimals: Number(tx.tokenDecimal || 1),
                symbol: tx.tokenSymbol || '',
            } as Token;

            if (tokens.length) {
                token.logo = tokens[0].logo;
                if (!token.decimals || token.decimals === 1) {
                    token.decimals = tokens[0].decimals;
                }
                if (!token.symbol) {
                    token.symbol = tokens[0].symbol;
                }
            }

            transferType = {
                amount: BigNumber.from(tx.value),
                to: tx.to,
                logo: token.logo,
                decimals: token.decimals,
                currency: token.symbol,
            };
        }

        return {
            time,
            confirmationTime: time,
            submittedTime: time,
            status:
                parseInt(tx.isError ?? 0) === 0
                    ? TransactionStatus.CONFIRMED
                    : TransactionStatus.FAILED,
            chainId: chainId,
            transactionCategory: transactionCategory,
            transactionParams: {
                to: tx.to,
                from: tx.from,
                value:
                    type === WatchedTransactionType.Native
                        ? BigNumber.from(tx.value ?? 0)
                        : BigNumber.from(0),
                hash: tx.hash,
                nonce: Number(tx.nonce),
                data: tx.input,
                gasPrice: BigNumber.from(tx.gasPrice),
                gasLimit: BigNumber.from(tx.gas),
                chainId: chainId,
            },
            transactionReceipt: {
                blockNumber: Number(tx.blockNumber),
                blockHash: tx.blockHash,
                transactionHash: tx.hash,
                to: tx.to,
                from: tx.from,
                contractAddress: tx.contractAddress,
                transactionIndex: Number(tx.transactionIndex),
                gasUsed: BigNumber.from(tx.gasUsed),
            },
            transferType: transferType,
        } as Partial<TransactionMeta>;
    };

    // ###################### EVENTS ######################

    /**
     * Emits INCOMING_TRANSACTION
     */
    private _emitIncomingTransactionEvent = (
        chainId: number,
        address: string,
        transactionType: WatchedTransactionType,
        currentTransactions: TransactionByHash,
        newTransactions: TransactionByHash
    ) => {
        if (Object.keys(currentTransactions).length) {
            for (const transactionHash in newTransactions) {
                if (
                    this._sameAddress(
                        newTransactions[transactionHash].transactionParams.to,
                        address
                    )
                ) {
                    this.emit(
                        TransactionWatcherControllerEvents.INCOMING_TRANSACTION,
                        chainId,
                        address,
                        transactionType
                    );
                    break;
                }
            }
        }
    };
    /**
     * If there are new transaction emits NEW_KNOWN_ERC20_TRANSACTIONS
     */
    private _emitNewKnownERC20TransactionsEvent = (
        chainId: number,
        address: string,
        tokenAddresses: string[],
        transactionType: WatchedTransactionType
    ) => {
        if (
            transactionType === WatchedTransactionType.ERC20 &&
            tokenAddresses.length
        ) {
            this.emit(
                TransactionWatcherControllerEvents.NEW_KNOWN_ERC20_TRANSACTIONS,
                chainId,
                address,
                tokenAddresses
            );
        }
    };

    /**
     * Emits NEW_ERC20_TRANSACTIONS
     */
    private _emitNewERC20TransactionsEvent = (
        chainId: number,
        address: string,
        transactionType: WatchedTransactionType
    ) => {
        if (transactionType === WatchedTransactionType.ERC20) {
            this.emit(
                TransactionWatcherControllerEvents.NEW_ERC20_TRANSACTIONS,
                chainId,
                address
            );
        }
    };

    private async _generateAllowanceEventsFromLogs(
        allowancesLogs: Log[],
        rpcLogsFetcher: RPCLogsFetcher,
        transactionType: WatchedTransactionType
    ): Promise<TokenAllowanceEvent> {
        const allowanceEvents: TokenAllowanceEvent = {};
        for (const log of allowancesLogs) {
            if (
                log.topics[0] === getAllowanceSignatureForType(transactionType)
            ) {
                const txTimestamp =
                    await rpcLogsFetcher.getLogTimestampInMilliseconds(log);

                const [, , spenderAddress] = log.topics;
                const tokenAddress = log.address;
                const txHash = log.transactionHash;
                const currentSpenders = allowanceEvents[tokenAddress] || [];
                const txTime = txTimestamp ?? new Date().getTime();

                allowanceEvents[tokenAddress.toLowerCase()] = [
                    ...currentSpenders,
                    {
                        spender:
                            paddedToChecksumAddress(
                                spenderAddress
                            ).toLowerCase(),
                        txHash,
                        txTime,
                    },
                ];
            }
        }
        return allowanceEvents;
    }

    private _emitNewKnownSpendersEvent = (
        chainId: number,
        address: string,
        allowanceEvents: TokenAllowanceEvent
    ): TokenAllowanceEvent => {
        if (Object.keys(allowanceEvents).length) {
            //emit only the last spender event
            const eventsToEmit = Object.entries(allowanceEvents).reduce(
                (acc, [address, tokenEvents]) => {
                    //sort events by timestamp
                    const soredEvents = [...tokenEvents].sort(
                        (eventA, eventB) => eventB.txTime - eventA.txTime
                    );
                    const sortedAndFilteredEvents = soredEvents.filter(
                        (event, index) => {
                            const eventWithSameSpenderIdx =
                                soredEvents.findIndex(
                                    (currentEvent) =>
                                        currentEvent.spender === event.spender
                                );
                            return eventWithSameSpenderIdx === index;
                        }
                    );
                    return {
                        ...acc,
                        [address]: sortedAndFilteredEvents,
                    };
                },
                {}
            );
            this.emit(
                TransactionWatcherControllerEvents.NEW_KNOWN_TOKEN_ALLOWANCE_SPENDERS,
                chainId,
                address,
                eventsToEmit
            );
        }
        return allowanceEvents;
    };

    private _sameAddress = (a?: string, b?: string): boolean => {
        return (
            typeof a !== 'undefined' &&
            typeof b !== 'undefined' &&
            isValidAddress(a) &&
            isValidAddress(b) &&
            toChecksumAddress(a) === toChecksumAddress(b)
        );
    };
}
