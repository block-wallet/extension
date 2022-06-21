import { BaseController } from '../../infrastructure/BaseController';
import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../utils/constants/networks';
import { ActionIntervalController } from '../block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from '../block-updates/BlockUpdatesController';
import NetworkController, { NetworkEvents } from '../NetworkController';
import {
    PreferencesController,
    PreferencesControllerState,
} from '../PreferencesController';
import {
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../transactions/utils/types';
import {
    Block,
    Filter,
    Log,
    TransactionReceipt,
} from '@ethersproject/abstract-provider';
import { BigNumber, utils } from 'ethers';
import { hexZeroPad, ParamType } from 'ethers/lib/utils';
import { TokenController } from './TokenController';
import { toChecksumAddress } from 'ethereumjs-util';
import { SignedTransaction } from './transactions/SignedTransaction';
import { Token } from './Token';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Mutex } from 'async-mutex';
import log from 'loglevel';
import { sleep } from '../../utils/sleep';
import { MILISECOND, SECOND } from '../../utils/constants/time';
import TransactionController from '../transactions/TransactionController';
import { TransactionArgument } from '../transactions/ContractSignatureParser';
import isTokenExcluded from 'banned-assets';

export interface ERC20Transactions {
    incomingTransactions: { [txHash: string]: TransactionMeta };
    outgoingTransactions: { [txHash: string]: TransactionMeta };
    outgoingTransactionsChecked: string[];
    lastBlockQueried: number;
}

export interface ERC20TransactionWatcherControllerState {
    transactions: {
        [chainId: number]: {
            [address: string]: ERC20Transactions;
        };
    };
}

export enum TransactionWatcherControllerEvents {
    NEW_KNOWN_ERC20_TRANSACTIONS = 'NEW_KNOWN_ERC20_TRANSACTIONS',
    NEW_ERC20_TRANSACTIONS = 'NEW_ERC20_TRANSACTIONS',
}

const TRANSFER_SIGNATURE = utils.id('Transfer(address,address,uint256)');
const MAX_REQUEST_RETRY = 5;
export class TransactionWatcherController extends BaseController<ERC20TransactionWatcherControllerState> {
    private readonly _mutex: Mutex;
    private readonly _txWatcherIntervalController: ActionIntervalController;

    constructor(
        private readonly _networkController: NetworkController,
        private readonly _preferencesController: PreferencesController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly _tokenController: TokenController,
        private readonly _transactionsController: TransactionController,
        initialState: ERC20TransactionWatcherControllerState
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
            async (chainId: number, _: number, blockNumber: number) => {
                const network =
                    this._networkController.getNetworkFromChainId(chainId);
                const interval =
                    network?.actionsTimeIntervals
                        .erc20TransactionWatcherUpdate ||
                    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.erc20TransactionWatcherUpdate;

                this._txWatcherIntervalController.tick(interval, async () => {
                    await this.fetchTransactions(chainId, blockNumber);
                });
            }
        );

        this._fetchPendingTimestamps();
        this._transactionRiskProcessor();
    }

    /**
     * return the state by chain and address
     */
    public getState(
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress()
    ): ERC20Transactions {
        const state = this.store.getState() || {};
        const initialBlock = this._getInitialBlock(chainId);

        if (state.transactions) {
            if (chainId in state.transactions) {
                if (address in state.transactions[chainId]) {
                    if (
                        state.transactions[chainId][address].lastBlockQueried <
                        initialBlock
                    ) {
                        state.transactions[chainId][address].lastBlockQueried =
                            initialBlock;
                    }
                    return state.transactions[chainId][address];
                }
            }
        }

        return {
            incomingTransactions: {},
            outgoingTransactions: {},
            outgoingTransactionsChecked: [],
            lastBlockQueried: initialBlock,
        } as ERC20Transactions;
    }

    /**
     * save the state by chain and address
     */
    public setState(
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress(),
        transactions: ERC20Transactions
    ) {
        const state = this.store.getState() || {};

        if (!state.transactions) {
            state.transactions = {};
        }
        if (!(chainId in state.transactions)) {
            state.transactions[chainId] = {};
        }
        if (!(address in state.transactions[chainId])) {
            state.transactions[chainId][address] = {
                incomingTransactions: {},
                outgoingTransactions: {},
                outgoingTransactionsChecked: [],
                lastBlockQueried: 0,
            } as ERC20Transactions;
        }

        for (const transactionHash in transactions.incomingTransactions) {
            state.transactions[chainId][address].incomingTransactions[
                transactionHash
            ] = transactions.incomingTransactions[transactionHash];
        }
        for (const transactionHash in transactions.outgoingTransactions) {
            state.transactions[chainId][address].outgoingTransactions[
                transactionHash
            ] = transactions.outgoingTransactions[transactionHash];
        }

        if (
            transactions.lastBlockQueried >
            state.transactions[chainId][address].lastBlockQueried
        ) {
            state.transactions[chainId][address].lastBlockQueried =
                transactions.lastBlockQueried;
        }

        this.store.updateState({
            transactions: {
                ...state.transactions,
                [chainId]: {
                    ...state.transactions[chainId],
                    [address]: {
                        ...state.transactions[chainId][address],
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
        for (const chainId in transactions) {
            if (address in transactions[parseInt(chainId)]) {
                delete transactions[parseInt(chainId)][address];
                anyUpdate = true;
            }
        }

        if (anyUpdate) {
            this.store.updateState({
                transactions,
            });
        }
    };

    /**
     * Fetch the past logs and parse them as transactions
     * @param chainId
     * @param currentBlock
     * @returns
     */
    public fetchTransactions = async (
        chainId: number = this._networkController.network.chainId,
        currentBlock: number = this._blockUpdatesController.getBlockNumber()
    ) => {
        if (currentBlock <= 0) {
            return;
        }
        return this._mutex.runExclusive(async () => {
            if (chainId != this._networkController.network.chainId) {
                return;
            }
            try {
                const provider = this._networkController.getProvider();
                const address =
                    this._preferencesController.getSelectedAddress();
                if (!address) {
                    return;
                }

                // the execution could be stuck in the mutex for some time,
                // lets update the last block
                currentBlock =
                    this._blockUpdatesController.getBlockNumber(chainId);

                // results
                const getLogsResults = await this._getTransactionLogs(
                    chainId,
                    provider,
                    address,
                    currentBlock
                );

                const incomingTransactions: { [x: string]: TransactionMeta } =
                    {};
                const outgoingTransactions: { [x: string]: TransactionMeta } =
                    {};
                const { incoming, outgoing } = getLogsResults;

                // partial processing for the case where we fetch a lot of transactions
                // the idea is to flush the txs to the ui to improve the ux.
                const batch = 5;
                let index = 1;
                while (incoming.length || outgoing.length) {
                    let partialIncomingTransactions: {
                        [x: string]: TransactionMeta;
                    } = {};
                    let partialOutgoingTransactions: {
                        [x: string]: TransactionMeta;
                    } = {};

                    if (incoming.length) {
                        let n = batch * index;
                        if (n > incoming.length) {
                            n = incoming.length;
                        }

                        const slicedIncoming: Log[] = [];
                        for (let i = 0; i < n; i++) {
                            const log = incoming.pop();

                            if (log) {
                                slicedIncoming[i] = log;
                            }
                        }

                        partialIncomingTransactions =
                            await this._parseTransactionLogs(
                                chainId,
                                address,
                                slicedIncoming,
                                true
                            );

                        Object.assign(
                            incomingTransactions,
                            partialIncomingTransactions
                        );
                    }

                    if (outgoing.length) {
                        let n = batch * index;
                        if (n > outgoing.length) {
                            n = outgoing.length;
                        }

                        const slicedOutgoing: Log[] = [];
                        for (let i = 0; i < n; i++) {
                            const log = outgoing.pop();

                            if (log) {
                                slicedOutgoing[i] = log;
                            }
                        }

                        partialOutgoingTransactions =
                            await this._parseTransactionLogs(
                                chainId,
                                address,
                                slicedOutgoing,
                                false
                            );

                        Object.assign(
                            outgoingTransactions,
                            partialOutgoingTransactions
                        );
                    }

                    // set partial state
                    const erc20Transactions = {
                        incomingTransactions: partialIncomingTransactions,
                        outgoingTransactions: partialOutgoingTransactions,
                    } as ERC20Transactions;

                    // store state
                    this.setState(chainId, address, erc20Transactions);

                    index++;
                }

                this.setState(chainId, address, {
                    lastBlockQueried: currentBlock,
                } as ERC20Transactions);

                const erc20Transactions = {
                    incomingTransactions,
                    outgoingTransactions,
                    lastBlockQueried: currentBlock,
                } as ERC20Transactions;

                // event
                this._emitNewKnownERC20TransactionsEvent(
                    chainId,
                    address,
                    erc20Transactions
                );
            } catch (e) {
                log.warn('fetchTransactions', e.message || e);
            }
        });
    };

    /**
     * Fetch incoming and outgoing transfer events logs
     * @param chainId
     * @param address
     * @param currentBlock
     * @returns
     */
    private _getTransactionLogs = async (
        chainId: number,
        provider: StaticJsonRpcProvider,
        address: string,
        currentBlock: number
    ): Promise<{ incoming: Log[]; outgoing: Log[] }> => {
        const lastBlockQueried = this._getOldestSafeBlockToFetchLogs(
            chainId,
            this.getState(chainId, address).lastBlockQueried,
            currentBlock
        );

        // if we can not fetch the whole events history we must
        // force a token balance discovery
        const completion =
            lastBlockQueried <=
            this.getState(chainId, address).lastBlockQueried;
        if (!completion) {
            this._emitNewERC20TransactionsEvent(chainId, address);
        }

        const logs: { incoming: Log[]; outgoing: Log[] } = {
            incoming: [],
            outgoing: [],
        };

        if (currentBlock > lastBlockQueried) {
            const addressHashed = hexZeroPad(address, 32);
            const max = this._getMaxBlockBatchSize(chainId, currentBlock);
            const steps = Math.ceil((currentBlock - lastBlockQueried) / max);

            for (let i = 0; i < steps; i++) {
                const fromBlock = lastBlockQueried + max * i;
                let toBlock = lastBlockQueried + max * (i + 1);
                if (toBlock > currentBlock) {
                    toBlock = currentBlock;
                }

                const getLogsPromises: Promise<Log[]>[] = [];

                // incoming
                getLogsPromises.push(
                    this._getLogs(chainId, provider, {
                        fromBlock,
                        toBlock,
                        topics: [TRANSFER_SIGNATURE, null, addressHashed],
                    })
                );

                // outgoing
                getLogsPromises.push(
                    this._getLogs(chainId, provider, {
                        fromBlock,
                        toBlock,
                        topics: [TRANSFER_SIGNATURE, addressHashed],
                    })
                );

                // results
                const results = await Promise.all(getLogsPromises);
                logs.incoming = logs.incoming.concat(...results[0]);
                logs.outgoing = logs.outgoing.concat(...results[1]);
            }
        }

        return logs;
    };

    // Note: For Fantom and BSC we need to start fetching logs from a newer block than 0 due to
    // the current node does not work so well with the command 'eth_getlogs'.
    // Also, the public RPC presents the same issues.
    // So for these networks the 'old transactions' won't be available, the extension will only fetch
    // the new ERC-20 transactions.

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
        let oldestSafeBlock = this._getInitialBlock(chainId);

        switch (chainId) {
            case 56:
            case 250:
                oldestSafeBlock =
                    currentBlock -
                    this._getMaxBlockBatchSize(chainId, currentBlock) * 20;
                break;
            case 97:
            case 80001:
                oldestSafeBlock =
                    currentBlock -
                    this._getMaxBlockBatchSize(chainId, currentBlock) * 10;
                break;
        }

        return lastBlockQueried >= oldestSafeBlock || oldestSafeBlock < 0
            ? lastBlockQueried
            : oldestSafeBlock;
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
     * @param currentBlock
     * @returns
     */
    private _getMaxBlockBatchSize = (
        chainId: number,
        currentBlock: number
    ): number => {
        /*
        Based on our current nodes I executed the log requests in all the chains looking for the safest biggest batch size.
        These numbers are the result of those tests. For the case of mainnet, fetching the whole list of blocks works fine
        but I'm worried about really dense wallets so that's why I split the requests into these batches.

        For the case of BSC (56) and Fantom (250) we can't fetch the whole logs history so I set a fixed batch size. Check #L319
        */
        switch (chainId) {
            case 3:
            case 4:
            case 5:
            case 10:
            case 42:
            case 100:
            case 42161:
                return Math.ceil(currentBlock / 5);
            case 1:
            case 137:
                return Math.ceil(currentBlock / 6);
            case 43114:
                return Math.ceil(currentBlock / 20);
            case 56:
            case 250:
                return 2500;
            case 97:
            case 80001:
                return 500;
        }
        return Number.MAX_SAFE_INTEGER;
    };

    /**
     * Fetch logs with a retry logic
     * @param filter
     * @param provider
     * @returns
     */
    private _getLogs = async (
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
            log.warn('getLogs', e.message || e);
            await sleep(400 * MILISECOND);

            const toBlock = parseInt((filter.toBlock as string) || '0');
            const fromBlock = parseInt((filter.fromBlock as string) || '0');
            if (toBlock - fromBlock > 1) {
                return [
                    ...(await this._getLogs(chainId, provider, {
                        ...filter,
                        toBlock: Math.ceil(
                            fromBlock + (toBlock - fromBlock) / 2
                        ),
                    })),
                    ...(await this._getLogs(chainId, provider, {
                        ...filter,
                        fromBlock: Math.ceil(
                            fromBlock + (toBlock - fromBlock) / 2 + 1
                        ),
                    })),
                ];
            } else {
                return this._getLogs(chainId, provider, filter);
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
    private _parseTransactionLogs = async (
        chainId: number,
        address: string,
        logs: Log[],
        incoming: boolean
    ): Promise<{ [x: string]: TransactionMeta }> => {
        return await Object.assign(
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
                                await this._formatTransaction(
                                    chainId,
                                    address,
                                    _log,
                                    incoming
                                ),
                        };
                    })
            ))
        );
    };

    /**
     * Parses a Log into a transaction
     * @param Log
     * @returns TransactionMeta
     */
    private _formatTransaction = async (
        chainId: number,
        address: string,
        _log: Log,
        incoming: boolean
    ) => {
        let contractAddress: string = _log.address;
        let token: Token = { logo: '', decimals: 1, symbol: '' } as Token;
        let logData: utils.LogDescription | undefined;

        try {
            contractAddress = toChecksumAddress(_log.address);

            const tokens = await this._tokenController.search(
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
            log.warn('_formatTransaction', _log.transactionHash, e);
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
                // nonce: 0,
                // gasLimit: BigNumber.from("0"),
                // gasPrice: BigNumber.from("0"),
                data: _log.data,
                value: BigNumber.isBigNumber(logData?.args.value)
                    ? BigNumber.from(logData?.args.value)
                    : undefined,
                chainId,
                // type: 0
                // maxPriorityFeePerGas: BigNumber.from("0"),
                // maxFeePerGas: BigNumber.from("0"),
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
     * If there are new transaction emits NEW_KNOWN_ERC20_TRANSACTIONS
     */
    private _emitNewKnownERC20TransactionsEvent = (
        chainId: number,
        address: string,
        erc20Transactions: ERC20Transactions
    ) => {
        if (
            Object.keys(erc20Transactions.incomingTransactions).length ||
            Object.keys(erc20Transactions.outgoingTransactions).length
        ) {
            this.emit(
                TransactionWatcherControllerEvents.NEW_KNOWN_ERC20_TRANSACTIONS,
                chainId,
                address,
                erc20Transactions
            );
        }
    };

    /**
     * If there are new transaction emits NEW_ERC20_TRANSACTIONS
     */
    private _emitNewERC20TransactionsEvent = (
        chainId: number,
        address: string
    ) => {
        this.emit(
            TransactionWatcherControllerEvents.NEW_ERC20_TRANSACTIONS,
            chainId,
            address
        );
    };

    /**
     * Detects the transactions where the timestamp is not known,
     * fetches the transaction block, pick the timestamp and updates
     * the transaction.
     */
    private _fetchPendingTimestamps = async (): Promise<any> => {
        while (this.store.getState().transactions) {
            const chainId = this._networkController.network.chainId;
            const provider = this._networkController.getProvider();

            const transactionByAddress =
                this.store.getState().transactions[chainId];
            const blockNumbers: number[] = [];

            for (const address in transactionByAddress) {
                const transactions = transactionByAddress[address];

                for (const transactionHash in Object.assign(
                    transactions.incomingTransactions,
                    transactions.outgoingTransactions
                )) {
                    let tx = {} as TransactionMeta;
                    if (transactionHash in transactions.incomingTransactions) {
                        tx = transactions.incomingTransactions[transactionHash];
                    } else {
                        tx = transactions.outgoingTransactions[transactionHash];
                    }

                    if (!tx.time || !tx.submittedTime || !tx.confirmationTime) {
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

            const blockNumbersOrdered = blockNumbers.sort((a, b) => b - a);
            for (let i = 0; i < blockNumbers.length; i++) {
                const blockNumber = blockNumbersOrdered[i];
                let block: Block = {} as Block;
                let error = undefined;
                let retry = 0;
                do {
                    try {
                        block = await provider.getBlock(blockNumber);
                        error = undefined;
                    } catch (e) {
                        log.warn('getBlock', e.message || e);
                        error = e;
                        retry++;
                        await sleep(400 * MILISECOND);
                    }
                } while (error && retry < MAX_REQUEST_RETRY);

                if (!error && block.number) {
                    this._updateTransactionsTimestamps(chainId, block);
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
    private _updateTransactionsTimestamps = (chainId: number, block: Block) => {
        const timestamp = block.timestamp * 1000;

        const addresses = this.store.getState().transactions[chainId];
        for (const address in addresses) {
            const transactions = this.getState(chainId, address);

            for (const transactionHash in transactions.incomingTransactions) {
                const tx = transactions.incomingTransactions[transactionHash];

                if (tx.transactionReceipt?.blockNumber === block.number) {
                    tx.time = timestamp;
                    tx.submittedTime = timestamp;
                    tx.confirmationTime = timestamp;

                    transactions.incomingTransactions[transactionHash] = tx;
                }
            }

            for (const transactionHash in transactions.outgoingTransactions) {
                const tx = transactions.outgoingTransactions[transactionHash];

                if (tx.transactionReceipt?.blockNumber === block.number) {
                    tx.time = timestamp;
                    tx.submittedTime = timestamp;
                    tx.confirmationTime = timestamp;

                    transactions.outgoingTransactions[transactionHash] = tx;
                }
            }

            this.setState(chainId, address, transactions);
        }
    };

    /**
     * Analyzes the outgoing transactions detecting if they are valid.
     * Otherwise they are deleted from the list.
     */
    private _transactionRiskProcessor = async (): Promise<any> => {
        while (this.store.getState().transactions) {
            const chainId = this._networkController.network.chainId;
            const provider = this._networkController.getProvider();

            const transactionByAddress =
                this.store.getState().transactions[chainId];

            for (const address in transactionByAddress) {
                const { outgoingTransactions, outgoingTransactionsChecked } =
                    transactionByAddress[address];

                for (const transactionHash in outgoingTransactions) {
                    const transaction = outgoingTransactions[transactionHash];

                    // If it is already checked we pass.
                    if (outgoingTransactionsChecked.includes(transactionHash)) {
                        continue;
                    }

                    // If the contract address is one of the known tokens
                    // we pass.
                    // Or if it is not part of the spam tokens we pass
                    if (
                        transaction.transactionReceipt &&
                        transaction.transactionReceipt.contractAddress
                    ) {
                        const token = await this._tokenController.getToken(
                            transaction.transactionReceipt?.contractAddress,
                            address
                        );
                        if (token && token.address) {
                            this._updateOutgoingTransactionsChecked(
                                chainId,
                                address,
                                transactionHash,
                                false
                            );
                            continue;
                        }

                        if (
                            !isTokenExcluded(
                                chainId,
                                transaction.transactionReceipt?.contractAddress
                            )
                        ) {
                            this._updateOutgoingTransactionsChecked(
                                chainId,
                                address,
                                transactionHash,
                                false
                            );
                            continue;
                        }
                    }

                    // If it is in the transaction controller state it means that
                    // the tx was created in this wallet so we pass.
                    if (
                        this._transactionsController.store
                            .getState()
                            .transactions.some(
                                (transaction: TransactionMeta) => {
                                    return (
                                        transaction.transactionParams.hash?.toLowerCase() ===
                                        transactionHash?.toLowerCase()
                                    );
                                }
                            )
                    ) {
                        this._updateOutgoingTransactionsChecked(
                            chainId,
                            address,
                            transactionHash,
                            false
                        );
                        continue;
                    }

                    // Fetch the transaction to validate the creator
                    let transactionReceipt: TransactionReceipt =
                        {} as TransactionReceipt;
                    let error = undefined;
                    let retry = 0;
                    do {
                        try {
                            transactionReceipt =
                                await provider.getTransactionReceipt(
                                    transactionHash
                                );
                            error = undefined;
                        } catch (e) {
                            log.warn('getTransactionReceipt', e.message || e);
                            error = e;
                            retry++;
                            await sleep(400 * MILISECOND);
                        }
                    } while (error && retry < MAX_REQUEST_RETRY);

                    if (!error && transactionReceipt.from) {
                        // if the 'from' of the transaction is different from the 'from' of the log, we remove the tx.
                        const invalidTransaction =
                            transactionReceipt.from?.toLowerCase() !==
                            transaction.transactionParams.from?.toLowerCase();

                        this._updateOutgoingTransactionsChecked(
                            chainId,
                            address,
                            transactionHash,
                            invalidTransaction
                        );
                    }
                }
            }

            await sleep(1 * SECOND);
        }
    };

    /**
     * Adds a transaction hash to the list of checked outgoing transactions.
     * Also, deletes a transaction if we detected that it is invalid.
     * @param chainId
     * @param address
     * @param transactionHash
     * @param removeTransactionFromList
     */
    private _updateOutgoingTransactionsChecked = (
        chainId: number = this._networkController.network.chainId,
        address: string = this._preferencesController.getSelectedAddress(),
        transactionHash: string,
        removeTransactionFromList: boolean
    ) => {
        const state = this.store.getState() || {};

        if (!state.transactions) {
            state.transactions = {};
        }
        if (!(chainId in state.transactions)) {
            state.transactions[chainId] = {};
        }
        if (!(address in state.transactions[chainId])) {
            state.transactions[chainId][address] = {
                incomingTransactions: {},
                outgoingTransactions: {},
                outgoingTransactionsChecked: [],
                lastBlockQueried: 0,
            } as ERC20Transactions;
        }

        // mark transaction hash as checked
        if (
            !state.transactions[chainId][
                address
            ].outgoingTransactionsChecked.includes(transactionHash)
        ) {
            state.transactions[chainId][
                address
            ].outgoingTransactionsChecked.push(transactionHash);
        }

        // remove the transaction
        if (removeTransactionFromList) {
            delete state.transactions[chainId][address].outgoingTransactions[
                transactionHash
            ];
        }

        this.store.updateState({
            transactions: {
                ...state.transactions,
                [chainId]: {
                    ...state.transactions[chainId],
                    [address]: {
                        ...state.transactions[chainId][address],
                    },
                },
            },
        });
    };
}
