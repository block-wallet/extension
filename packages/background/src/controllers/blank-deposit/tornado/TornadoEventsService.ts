import { BigNumber, Contract, Event } from 'ethers';
import { addHexPrefix } from 'ethereumjs-util';
import log from 'loglevel';
import { CurrencyAmountPair } from '../types';
import { Deposit, Withdrawal } from './stores/ITornadoEventsDB';
import BlockUpdatesController from '../../block-updates/BlockUpdatesController';
import { TornadoEvents } from './config/ITornadoContract';
import httpClient, { RequestError } from '../../../utils/http';

export interface TornadoEventsServiceProps {
    blockUpdatesController: BlockUpdatesController;
    endpoint: string;
    version: string;
}

export interface EventsChainFetchOptions {
    fromBlock: number;
    contract: Contract;
}

export interface EventsFetchOptions {
    chainId: number;
    pair: CurrencyAmountPair;
    from?: number;
    chainOptions: EventsChainFetchOptions;
}

const MAX_HTTP_RETRIES = 5;
const RETRIES_DELAY = 500;
const BLOCKS_TO_FETCH = 1000000;
const MAX_CHAIN_RETRIES = 20;

export class TornadoEventsService {
    private readonly _blockUpdatesController: BlockUpdatesController;
    private _endpoint: string;

    constructor(props: TornadoEventsServiceProps) {
        this._blockUpdatesController = props.blockUpdatesController;
        this._endpoint = this._parseEndpoint(props.endpoint, props.version);
    }

    public async getDeposits({
        chainId,
        pair: { currency, amount },
        from,
        chainOptions,
    }: EventsFetchOptions): Promise<Deposit[]> {
        return this._getEvents(
            'deposits',
            chainId,
            currency,
            amount,
            chainOptions,
            from
        );
    }

    public async getWithdrawals({
        chainId,
        pair: { currency, amount },
        from,
        chainOptions,
    }: EventsFetchOptions): Promise<Withdrawal[]> {
        return this._getEvents(
            'withdrawals',
            chainId,
            currency,
            amount,
            chainOptions,
            from
        );
    }

    private async _getEvents<T extends 'deposits' | 'withdrawals'>(
        type: T,
        chainId: number,
        currency: string,
        amount: string,
        chainOptions: EventsChainFetchOptions,
        from?: number
    ): Promise<T extends 'deposits' ? Deposit[] : Withdrawal[]> {
        const events = [];

        try {
            const results = await this._getPaginated(
                type,
                chainId,
                currency,
                amount,
                from || 0
            );

            for (let i = 0; i < results.length; i++) {
                /* eslint-disable-next-line */
                const result = results[i] as any;

                if (type == 'deposits') {
                    events.push({
                        leafIndex: parseInt((result['li'] || '0').toString()),
                        commitment: addHexPrefix(result['c'].toString()),
                        timestamp: result['t'].toString(),
                        transactionHash: result['th'].toString(),
                        blockNumber: parseInt(result['bn'].toString()),
                    } as Deposit);
                } else {
                    events.push({
                        nullifierHex: addHexPrefix(result['nh'].toString()),
                        to: result['t'].toString(),
                        fee: BigNumber.from(result['f'].toString()),
                        transactionHash: result['th'].toString(),
                        blockNumber: parseInt(result['bn'].toString()),
                    } as Withdrawal);
                }
            }
        } catch (e) {
            log.error(
                `Error fetching tornado events from service: ${e.message}`
            );

            //If there is an error here, we should query the blockchain
            const results = await this._fetchEventsFromChain(
                type == 'deposits'
                    ? TornadoEvents.DEPOSIT
                    : TornadoEvents.WITHDRAWAL,
                chainOptions.fromBlock,
                chainOptions.contract,
                chainOptions.fromBlock + BLOCKS_TO_FETCH
            );

            for (let i = 0; i < results.length; i++) {
                const ev = results[i];

                if (type == 'deposits') {
                    events.push({
                        transactionHash: ev.transactionHash,
                        blockNumber: ev.blockNumber,
                        commitment: ev.args?.commitment,
                        leafIndex: ev.args?.leafIndex,
                        timestamp: ev.args?.timestamp.toString(),
                    } as Deposit);
                } else {
                    events.push({
                        transactionHash: ev.transactionHash,
                        blockNumber: ev.blockNumber,
                        to: ev.args?.to,
                        nullifierHex: ev.args?.nullifierHash,
                        fee: ev.args?.fee,
                    } as Withdrawal);
                }
            }
        } finally {
            log.debug(
                `${events.length} events fetched of this combination`,
                type,
                chainId,
                currency,
                amount
            );
        }
        return events as T extends 'deposits' ? Deposit[] : Withdrawal[];
    }

    private async _getPaginated(
        type: 'deposits' | 'withdrawals',
        chain_id: number,
        currency: string,
        amount: string,
        from: number,
        retry = 0
    ): Promise<unknown[]> {
        const results = [];

        const url = `${this._endpoint}/${type}`;

        try {
            const response = await httpClient.get<any>(url, {
                chain_id,
                currency,
                amount,
                from,
            });

            if (type in response) {
                if (response[type].length) {
                    results.push(...response[type]);
                }
            }

            if ('last' in response) {
                results.push(
                    ...(await this._getPaginated(
                        type,
                        chain_id,
                        currency,
                        amount,
                        parseInt(response['last'])
                    ))
                );
            }

            return results;
        } catch (error) {
            if (retry < MAX_HTTP_RETRIES) {
                log.debug(
                    `Communication error, retrying: ${JSON.stringify(
                        (error as RequestError).response
                    )}`
                );

                retry = retry + 1;
                await delay(RETRIES_DELAY * retry);

                return this._getPaginated(
                    type,
                    chain_id,
                    currency,
                    amount,
                    from,
                    retry
                );
            } else {
                throw new Error(
                    `Error fetching ${url}. ${JSON.stringify(
                        (error as RequestError).response
                    )}`
                );
            }
        }
    }

    private _fetchEventsFromChain = async (
        type: TornadoEvents,
        fromBlock: number,
        contract: Contract,
        toBlock: number
    ): Promise<Event[]> => {
        const filter = contract.filters[type]();

        const getLogsPaginated = async (
            fromBlock: number,
            toBlock: number,
            obtainedEvents: Event[] = [],
            retry = 0
        ): Promise<Event[]> => {
            try {
                const events = await contract.queryFilter(
                    filter,
                    fromBlock,
                    toBlock
                );

                const blockNumber =
                    this._blockUpdatesController.getBlockNumber();

                if (toBlock < blockNumber) {
                    fromBlock = toBlock + 1;
                    return getLogsPaginated(
                        fromBlock,
                        fromBlock + BLOCKS_TO_FETCH,
                        [...obtainedEvents, ...events],
                        0
                    );
                } else {
                    return [...obtainedEvents, ...events];
                }
            } catch (error) {
                retry = retry + 1;
                if (retry < MAX_CHAIN_RETRIES) {
                    await delay(RETRIES_DELAY * retry);
                    const toNextBlock =
                        fromBlock + Math.floor((toBlock - fromBlock) / 2);
                    return getLogsPaginated(
                        fromBlock,
                        toNextBlock,
                        obtainedEvents,
                        retry
                    );
                } else {
                    throw new Error('Unable to fetch the events');
                }
            }
        };

        return getLogsPaginated(fromBlock, toBlock);
    };

    private _parseEndpoint(rawEndpoint: string, version: string): string {
        if (!rawEndpoint.endsWith('/')) {
            rawEndpoint = rawEndpoint.concat('/');
        }
        return `${rawEndpoint}${version}`;
    }
}

const delay = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
