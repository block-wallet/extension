import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Filter, Log } from '@ethersproject/abstract-provider';
import { SECOND } from '../constants/time';
import log from 'loglevel';
import { checkIfNotAllowedError } from '../ethersError';
import { sleep } from '../sleep';
import {
    buildRPCConfig,
    DEFAULT_BATCH_MULTIPLIER,
    RPCChainConfig,
} from './rpcConfigBuilder';
import { isNil } from 'lodash';
import { fetchBlockWithRetries } from '../blockFetch';
import { unixTimestampToJSTimestamp } from '../timestamp';

export class RPCLogsFetcher {
    private readonly chainId: number;
    private readonly config: RPCChainConfig;
    constructor(private provider: StaticJsonRpcProvider) {
        this.chainId = this.provider.network.chainId;
        this.config = buildRPCConfig(this.chainId);
    }

    /**
     * Process a chain query by batch and invokes the executor for every chunk
     * @param fromBlock start block of the query
     * @param toBlock end block of the query
     * @returns
     */
    public async batchedQuery(
        fromBlock: number,
        toBlock: number,
        chunkExecutor: (
            chunkFromBlock: number,
            chunkToBlock: number
        ) => Promise<void>
    ): Promise<void> {
        if (toBlock > fromBlock) {
            const max = this.config.maxBlockBatchSize;
            const steps = Math.ceil((toBlock - fromBlock) / max);
            for (let i = 0; i < steps; i++) {
                const chunkFromBlock = fromBlock + max * i;
                const chunkToBlock = Math.min(
                    fromBlock + max * (i + 1),
                    toBlock
                );
                await chunkExecutor(chunkFromBlock, chunkToBlock);
            }
        }
    }

    private _getBlockAsNumber(
        block: string | number | 'latest'
    ): Promise<number> {
        if (block === 'latest') {
            return this.provider.getBlockNumber();
        }
        return Promise.resolve(
            typeof block === 'string' ? parseInt(block) : block
        );
    }

    public async getLogsInBatch(
        filter: Filter,
        lastMinedBlock?: number
    ): Promise<Log[]> {
        let logs: Log[] = [];
        if (isNil(filter.fromBlock) || isNil(filter.toBlock)) {
            throw new Error('You must specify a block range.');
        }

        let lastBlock = lastMinedBlock;

        if (!lastBlock) {
            lastBlock = await this.provider.getBlockNumber();
        }

        const fromBlock = await this._getBlockAsNumber(filter.fromBlock);

        const toBlock = await this._getBlockAsNumber(filter.toBlock);

        await this.batchedQuery(
            fromBlock,
            toBlock,
            async (chunkFromBlock, chunkToBlock) => {
                const newLogs = await this._getLogs(
                    {
                        ...filter,
                        fromBlock: chunkFromBlock,
                        toBlock: chunkToBlock,
                    },
                    lastBlock as number
                );
                logs = logs.concat(newLogs);
            }
        );
        return logs;
    }

    /**
     * Fetch logs with a retry logic
     * @param filter
     * @param provider
     * @returns
     */
    private _getLogs = async (
        filter: Filter,
        lastMinedBlock: number
    ): Promise<Log[]> => {
        let logs: Log[] = [];

        // check to block
        if (
            filter.toBlock &&
            lastMinedBlock > 0 &&
            filter.toBlock > lastMinedBlock
        ) {
            filter.toBlock = lastMinedBlock;
        }

        try {
            logs = await this.provider.getLogs(filter);
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
                    ...(await this._getLogs(
                        {
                            ...filter,
                            toBlock: Math.ceil(
                                fromBlock + (toBlock - fromBlock) / 2
                            ),
                        },
                        lastMinedBlock
                    )),
                    ...(await this._getLogs(
                        {
                            ...filter,
                            fromBlock: Math.ceil(
                                fromBlock + (toBlock - fromBlock) / 2 + 1
                            ),
                        },
                        lastMinedBlock
                    )),
                ];
            } else {
                throw e;
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
    public getOldestSafeBlockToFetchERC20Logs = (
        lastBlockQueried: number,
        currentBlock: number
    ): number => {
        const batchMultiplier = Math.min(
            DEFAULT_BATCH_MULTIPLIER,
            this.config.batchMultiplier
        );

        const erc20SafeInitialBlock = this.config.initialERC20Block;

        const oldestSafeBlock = Math.max(
            erc20SafeInitialBlock,
            currentBlock - this.config.maxBlockBatchSize * batchMultiplier
        );

        return Math.max(lastBlockQueried, oldestSafeBlock);
    };

    /**
     * getLogTimestampInMilliseconds
     * Returns the log timestamp in milliseconds. If the log comes from the API, then the `timeStamp` property will be filled.
     * Otherwise, it fetches the block when the log appears and returns its timestamp
     * @param log
     * @returns log timestamp in millis
     */
    public async getLogTimestampInMilliseconds(
        log: Log,
        retries = 20
    ): Promise<number | undefined> {
        //API logs return the hexadecimal timestamp
        const logTimestamp: string = (log as any).timeStamp;
        //some networks returns the log timestamp
        let txTimestamp = logTimestamp ? parseInt(logTimestamp) : undefined;
        if (!txTimestamp) {
            const block = await fetchBlockWithRetries(
                log.blockNumber,
                this.provider,
                retries
            );
            if (block) {
                txTimestamp = block.timestamp;
            }
        }

        return unixTimestampToJSTimestamp(txTimestamp);
    }
}
