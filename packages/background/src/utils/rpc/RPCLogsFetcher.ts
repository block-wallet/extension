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
    public async batchedChainQuery(
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

    private _getBlockAsNumber(block: string | number): number {
        return typeof block === 'string' ? parseInt(block) : block;
    }

    public async getLogsFromChainInBatch(
        filter: Filter,
        lastMinedBlock?: number
    ): Promise<Log[]> {
        let logs: Log[] = [];
        if (isNil(filter.fromBlock) || isNil(filter.toBlock)) {
            throw new Error('You must specify a block range.');
        }

        const fromBlock = this._getBlockAsNumber(filter.fromBlock);

        const toBlock = this._getBlockAsNumber(filter.toBlock);

        await this.batchedChainQuery(
            fromBlock,
            toBlock,
            async (chunkFromBlock, chunkToBlock) => {
                const newLogs = await this.getLogsFromChain(
                    {
                        ...filter,
                        fromBlock: chunkFromBlock,
                        toBlock: chunkToBlock,
                    },
                    lastMinedBlock
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
    public getLogsFromChain = async (
        filter: Filter,
        lastMinedBlock?: number
    ): Promise<Log[]> => {
        let logs: Log[] = [];

        let lastBlock = lastMinedBlock;

        if (!lastBlock) {
            lastBlock = await this.provider.getBlockNumber();
        }

        // check to block
        if (filter.toBlock && lastBlock > 0 && filter.toBlock > lastBlock) {
            filter.toBlock = lastBlock;
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
                    ...(await this.getLogsFromChain(
                        {
                            ...filter,
                            toBlock: Math.ceil(
                                fromBlock + (toBlock - fromBlock) / 2
                            ),
                        },
                        lastBlock
                    )),
                    ...(await this.getLogsFromChain(
                        {
                            ...filter,
                            fromBlock: Math.ceil(
                                fromBlock + (toBlock - fromBlock) / 2 + 1
                            ),
                        },
                        lastBlock
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
}
