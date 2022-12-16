import { Mutex } from 'async-mutex';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';
import { BigNumber, ethers, utils } from 'ethers';
import { hexZeroPad, ParamType } from 'ethers/lib/utils';
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
} from './transactions/utils/types';
import { Block, Filter, Log } from '@ethersproject/abstract-provider';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { SignedTransaction } from './erc-20/transactions/SignedTransaction';
import { TransactionArgument } from './transactions/ContractSignatureParser';
import { showIncomingTransactionNotification } from '../utils/notifications';
import { checkIfNotAllowedError } from '../utils/ethersError';
import TransactionController from './transactions/TransactionController';
import httpClient from '../utils/http';
import { fetchBlockWithRetries } from '../utils/blockFetch';
import { isNil } from 'lodash';
import { runPromiseSafely } from '../utils/promises';

export enum TransactionTypeEnum {
    Native = 'txlist',
    ERC20 = 'tokentx',
    ERC721 = 'tokennfttx',
    ERC1155 = 'token1155tx',
}

export interface TransactionByHash {
    [txHash: string]: TransactionMeta;
}

export interface TransactionsWatched {
    transactions: TransactionByHash;
    lastBlockQueried: number;
}

export interface TransactionWatcherControllerState {
    transactions: {
        [chainId: number]: {
            [address: string]: {
                [type in TransactionTypeEnum]: TransactionsWatched;
            };
        };
    };
}

export const TRANSACTION_TYPE_STATUS: {
    [type in TransactionTypeEnum]: boolean;
} = {
    txlist: true,
    tokentx: true,
    tokennfttx: false,
    token1155tx: false,
};

export enum TransactionWatcherControllerEvents {
    NEW_KNOWN_ERC20_TRANSACTIONS = 'NEW_KNOWN_ERC20_TRANSACTIONS',
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
}

const SIGNATURES: { [type in TransactionTypeEnum]: string } = {
    txlist: '',
    tokentx: utils.id('Transfer(address,address,uint256)'),
    token1155tx: '',
    tokennfttx: '',
};

const MAX_REQUEST_RETRY = 20;
const EXPLORER_API_CALLS_DELAY = 2000 * MILISECOND;
const DEFAULT_BATCH_MULTIPLIER = 20;

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
            this.fetchTransactions();
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
                    this.fetchTransactions();
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
                    return this.fetchTransactions(
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
                transactionType: TransactionTypeEnum
            ) => {
                let section:
                    | ''
                    | 'tokentxns'
                    | 'tokentxnsErc721'
                    | 'tokentxnsErc1155' = '';
                switch (transactionType) {
                    case TransactionTypeEnum.ERC20:
                        section = 'tokentxns';
                        break;
                    case TransactionTypeEnum.ERC721:
                        section = 'tokentxnsErc721';
                        break;
                    case TransactionTypeEnum.ERC1155:
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
            await this.fetchTransactions(chainId, blockNumber);
        });
    };

    /**
     * return the state by chain, address and type
     */
    public getState(
        type: TransactionTypeEnum,
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
     * save the state by chain, address and type
     */
    public setState(
        type: TransactionTypeEnum,
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

    /**
     * Remove the transactions data of an account.
     * @param address
     */
    public removeTransactionsByAddress = async (
        address: string
    ): Promise<void> => {
        const transactions = this.store.getState().transactions;
        let anyUpdate = false;
        for (const c in transactions) {
            const chainId = parseInt(c);
            if (address in transactions[chainId]) {
                for (const type in transactions[chainId][address]) {
                    const trasactionType = type as TransactionTypeEnum;
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
     * Fetch the past tx and parse them as transactions
     * @param chainId
     * @param currentBlock
     * @returns
     */
    public fetchTransactions = async (
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

                const etherscanApiUrlValid =
                    typeof etherscanApiUrl !== 'undefined' &&
                    etherscanApiUrl.length > 0;

                // the execution could be stuck in the mutex for some time,
                // lets update the last block
                currentBlock =
                    this._blockUpdatesController.getBlockNumber(chainId);

                // fetch all the enabled transactions type
                for (const type in TRANSACTION_TYPE_STATUS) {
                    const transactionType = type as TransactionTypeEnum;

                    if (!TRANSACTION_TYPE_STATUS[transactionType]) {
                        continue;
                    }

                    // if there isnt any etherscan api available the native transactions
                    // can't be fetched
                    if (
                        !etherscanApiUrlValid &&
                        transactionType === TransactionTypeEnum.Native
                    ) {
                        continue;
                    }

                    const currentTransactionsWatched = this.getState(
                        transactionType,
                        chainId,
                        address
                    );

                    let newTransactions: TransactionByHash = {};
                    let tokenAddresses: string[] = [];

                    let fetchEtherscanApi = true;
                    if (transactionType !== TransactionTypeEnum.Native) {
                        if (forceChainQuery || !etherscanApiUrlValid) {
                            fetchEtherscanApi = false;
                        }
                    }

                    if (fetchEtherscanApi) {
                        try {
                            const result = await this._getTransactionsFromAPI(
                                chainId,
                                address,
                                etherscanApiUrl || '',
                                transactionType,
                                currentTransactionsWatched,
                                currentBlock
                            );
                            newTransactions = result.transactions;
                            tokenAddresses = result.tokenAddresses;
                        } catch (e: any) {
                            log.warn(
                                'fetchTransactions',
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
                                chainId,
                                address,
                                provider,
                                transactionType,
                                currentTransactionsWatched.lastBlockQueried,
                                currentBlock
                            );
                            newTransactions = result.transactions;
                            tokenAddresses = result.tokenAddresses;
                        } catch (e: any) {
                            log.warn(
                                'fetchTransactions',
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
                    this.setState(transactionType, chainId, address, {
                        transactions: newTransactions,
                        lastBlockQueried: currentBlock,
                    });

                    // to avoid rate limits
                    if (!forceChainQuery) {
                        await sleep(EXPLORER_API_CALLS_DELAY);
                    }
                }
            } catch (e) {
                log.warn('fetchTransactions', e.message || e);
            }
        });
    };

    // ###################### CHAIN LOGS METHODS ######################

    private _getTransactionsFromChain = async (
        chainId: number,
        address: string,
        provider: StaticJsonRpcProvider,
        transactionType: TransactionTypeEnum,
        lastBlockQueried: number,
        currentBlock: number
    ): Promise<{
        transactions: TransactionByHash;
        tokenAddresses: string[];
    }> => {
        // logs fetch
        const getLogsResults = await this._getTransactionLogsFromChain(
            chainId,
            provider,
            address,
            transactionType,
            currentBlock,
            lastBlockQueried
        );

        const { incoming, outgoing } = getLogsResults;

        const {
            transactions: incomingTransactions,
            tokenAddresses: incomingTokenAddresses,
        } = await this._parseTransactionLogsFromChain(
            chainId,
            address,
            incoming,
            true
        );
        const {
            transactions: outgoingTransactions,
            tokenAddresses: outgoingTokenAddresses,
        } = await this._parseTransactionLogsFromChain(
            chainId,
            address,
            outgoing,
            false
        );

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
        chainId: number,
        provider: StaticJsonRpcProvider,
        address: string,
        transactionType: TransactionTypeEnum,
        currentBlock: number,
        stateLastBlockQueried: number
    ): Promise<{ incoming: Log[]; outgoing: Log[] }> => {
        const lastBlockQueried = this._getOldestSafeBlockToFetchLogs(
            chainId,
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

        const logs: { incoming: Log[]; outgoing: Log[] } = {
            incoming: [],
            outgoing: [],
        };

        if (currentBlock > lastBlockQueried) {
            const addressHashed = hexZeroPad(address, 32);
            const max = this._getMaxBlockBatchSize(chainId);
            const steps = Math.ceil((currentBlock - lastBlockQueried) / max);

            for (let i = 0; i < steps; i++) {
                const fromBlock = lastBlockQueried + max * i;
                const toBlock = Math.min(
                    lastBlockQueried + max * (i + 1),
                    currentBlock
                );

                // incoming
                const incoming = await runPromiseSafely(
                    this._getLogsFromChain(chainId, provider, {
                        fromBlock,
                        toBlock,
                        topics: [
                            SIGNATURES[transactionType],
                            null,
                            addressHashed,
                        ],
                    })
                );

                // outgoing
                const outgoing = await runPromiseSafely(
                    this._getLogsFromChain(chainId, provider, {
                        fromBlock,
                        toBlock,
                        topics: [SIGNATURES[transactionType], addressHashed],
                    })
                );

                // results
                if (incoming) {
                    logs.incoming = logs.incoming.concat(...incoming);
                }
                if (outgoing) {
                    logs.outgoing = logs.outgoing.concat(...outgoing);
                }
            }
        }

        return logs;
    };
    /**
     * Return oldes block to start fetching logs
     * @param chainId
     * @param lastBlockQueried
     * @param currentBlock
     * @returns
     */
    private _getOldestSafeBlockToFetchLogs = (
        chainId: number,
        lastBlockQueried: number,
        currentBlock: number
    ): number => {
        const batchMultiplier = Math.min(
            DEFAULT_BATCH_MULTIPLIER,
            this._getBatchMultiplier(chainId)
        );

        const oldestSafeBlock = Math.max(
            this._getInitialBlock(chainId),
            currentBlock - this._getMaxBlockBatchSize(chainId) * batchMultiplier
        );

        return Math.max(lastBlockQueried, oldestSafeBlock);
    };

    /**
     * Gets the multiplier for the max batch size
     * @param chainId
     * @returns
     */
    private _getBatchMultiplier = (chainId: number): number => {
        switch (chainId) {
            case 1:
            case 5:
            case 10:
            case 42:
            case 100:
            case 137:
            case 42161:
            case 43114:
            case 56:
            case 250:
                return DEFAULT_BATCH_MULTIPLIER;
            default:
                return 1;
        }
    };

    /**
     * Fetches the first block where we can find an erc20 tx
     * @param chainId
     * @returns
     */
    private _getInitialBlock = (chainId: number): number => {
        let initialBlock = 0;
        switch (chainId) {
            case 1:
                initialBlock = 447767;
                break;
            case 3:
                initialBlock = 5943;
                break;
            case 4:
                initialBlock = 119945;
                break;
            case 5:
                initialBlock = 13543;
                break;
            case 10:
                initialBlock = 102;
                break;
            case 42:
                initialBlock = 32255;
                break;
            case 56:
                initialBlock = 57109;
                break;
            case 97:
                initialBlock = 235;
                break;
            case 100:
                initialBlock = 334457;
                break;
            case 137:
                initialBlock = 2764;
                break;
            case 250:
                initialBlock = 2323;
                break;
            case 42161:
                initialBlock = 60;
                break;
            case 43114:
                initialBlock = 20;
                break;
            case 80001:
                initialBlock = 136184;
                break;
        }
        return initialBlock;
    };

    /**
     * Return the max safe block distance to fetch logs
     * @param chainId
     * @returns
     */
    private _getMaxBlockBatchSize = (chainId: number): number => {
        switch (chainId) {
            case 1:
            case 5:
            case 10:
            case 42:
            case 100:
            case 137:
            case 42161:
            case 43114:
                return 10000;
            case 56:
                return 5000;
            case 250:
                return 2000;
            default: // all the custom networks will be caught by this default because we don't know the quality of the RPCs
                return 100;
        }
    };

    /**
     * Fetch logs with a retry logic
     * @param filter
     * @param provider
     * @returns
     */
    private _getLogsFromChain = async (
        chainId: number,
        provider: StaticJsonRpcProvider,
        filter: Filter
    ): Promise<Log[]> => {
        let logs: Log[] = [];

        // check to block
        const lastBlock = this._blockUpdatesController.getBlockNumber(chainId);
        if (filter.toBlock && lastBlock > 0 && filter.toBlock > lastBlock) {
            filter.toBlock = lastBlock;
        }

        try {
            logs = await provider.getLogs(filter);
        } catch (e) {
            // check 403 not allowed
            if (checkIfNotAllowedError(e)) {
                return [];
            }

            log.warn('getLogs', e.message || e);
            await sleep(1 * SECOND);

            const toBlock = parseInt((filter.toBlock as string) || '0');
            const fromBlock = parseInt((filter.fromBlock as string) || '0');
            if (toBlock - fromBlock > 1) {
                return [
                    ...(await this._getLogsFromChain(chainId, provider, {
                        ...filter,
                        toBlock: Math.ceil(
                            fromBlock + (toBlock - fromBlock) / 2
                        ),
                    })),
                    ...(await this._getLogsFromChain(chainId, provider, {
                        ...filter,
                        fromBlock: Math.ceil(
                            fromBlock + (toBlock - fromBlock) / 2 + 1
                        ),
                    })),
                ];
            } else {
                throw e;
            }
        }

        return logs;
    };

    /**
     * Parse logs to transaction meta
     * @param logs
     * @param chainId
     * @returns
     */
    private _parseTransactionLogsFromChain = async (
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
        let logData: utils.LogDescription | undefined;
        let txResponse: Partial<ethers.providers.TransactionResponse> = {
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
                    const transactionType = type as TransactionTypeEnum;
                    const transactions =
                        transactionByAddress[address][
                            transactionType as TransactionTypeEnum
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
        const timestamp = block.timestamp * 1000;

        const addresses = this.store.getState().transactions[chainId];
        for (const address in addresses) {
            for (const type in addresses[address]) {
                const transactionType = type as TransactionTypeEnum;
                const transactions = this.getState(
                    transactionType,
                    chainId,
                    address
                );

                for (const transactionHash in transactions.transactions) {
                    const tx = transactions.transactions[transactionHash];

                    if (tx.transactionReceipt?.blockNumber === block.number) {
                        tx.time = timestamp;
                        tx.submittedTime = timestamp;
                        tx.confirmationTime = timestamp;

                        transactions.transactions[transactionHash] = tx;
                    }
                }

                this.setState(transactionType, chainId, address, transactions);
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
        chainId: number,
        address: string,
        etherscanApiUrl: string,
        transactionType: TransactionTypeEnum,
        currentTransactionsWatched: TransactionsWatched,
        currentBlock: number
    ): Promise<{
        transactions: TransactionByHash;
        tokenAddresses: string[];
    }> => {
        const { result, status } = await this._fetchTransactionsFromAPI(
            etherscanApiUrl,
            address,
            transactionType,
            currentTransactionsWatched.lastBlockQueried,
            currentBlock
        );
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
                    transactionType !== TransactionTypeEnum.Native ||
                    tx.input.length < 4
                );
            });

        const tokenAddresses: string[] = [];
        if (transactionType !== TransactionTypeEnum.Native) {
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
     * Fetches transactions from the API
     *
     * @param etherscanApiUrl
     * @param address
     * @param transactionType
     * @param fromBlock
     * @param endBlock
     * @returns { result: EtherscanTransaction[]; status: string }
     */
    private _fetchTransactionsFromAPI = async (
        etherscanApiUrl: string,
        address: string,
        transactionType: TransactionTypeEnum,
        fromBlock: number,
        endBlock: number
    ): Promise<{ result: EtherscanTransaction[]; status: string }> => {
        const params = {
            module: 'account',
            action: transactionType.toString(),
            address,
            startblock: fromBlock - 100 > 0 ? fromBlock - 100 : 0, // this avoid sync delays of the API.
            endBlock: endBlock,
            page: 1,
        };

        let retry = 0;
        while (retry < MAX_REQUEST_RETRY) {
            const result = await httpClient.get<{
                status: string;
                message: string;
                result: EtherscanTransaction[];
            }>(
                `${etherscanApiUrl}/api`,
                {
                    ...params,
                },
                30000
            );

            if (result.status === '0' && result.message === 'NOTOK') {
                await sleep(EXPLORER_API_CALLS_DELAY);
                retry++;

                continue;
            }
            return result;
        }

        return { status: '-999', result: [] };
    };

    /**
     * Check if the response from the API is valid
     * @param result
     * @param status
     * @returns
     */
    private _isAPIResponseValid = (
        result: EtherscanTransaction[],
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
        type: TransactionTypeEnum,
        chainId: number,
        address: string,
        tx: EtherscanTransaction
    ): Promise<Partial<TransactionMeta>> => {
        if (isValidAddress(tx.contractAddress)) {
            tx.contractAddress = toChecksumAddress(tx.contractAddress);
        }

        const time = Number(tx.timeStamp) * 1000;

        const isIncomming =
            !this._sameAddress(tx.from, address) &&
            this._sameAddress(tx.to, address);
        let transactionCategory: TransactionCategories =
            TransactionCategories.INCOMING;
        switch (type) {
            case TransactionTypeEnum.Native:
                if (isIncomming) {
                    transactionCategory = TransactionCategories.INCOMING;
                } else {
                    transactionCategory = TransactionCategories.SENT_ETHER;
                }
                break;
            case TransactionTypeEnum.ERC20:
            case TransactionTypeEnum.ERC721:
            case TransactionTypeEnum.ERC1155:
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
        if (type === TransactionTypeEnum.ERC20) {
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
                    type === TransactionTypeEnum.Native
                        ? BigNumber.from(tx.value)
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
            // TODO(REC): methodSignature ?
        } as Partial<TransactionMeta>;
    };

    // ###################### EVENTS ######################

    /**
     * Emits INCOMING_TRANSACTION
     */
    private _emitIncomingTransactionEvent = (
        chainId: number,
        address: string,
        transactionType: TransactionTypeEnum,
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
        transactionType: TransactionTypeEnum
    ) => {
        if (
            transactionType === TransactionTypeEnum.ERC20 &&
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
        transactionType: TransactionTypeEnum
    ) => {
        if (transactionType === TransactionTypeEnum.ERC20) {
            this.emit(
                TransactionWatcherControllerEvents.NEW_ERC20_TRANSACTIONS,
                chainId,
                address
            );
        }
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
