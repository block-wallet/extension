import { ACTIONS_TIME_INTERVALS_DEFAULT_VALUES } from '../../utils/constants/networks';
import { Mutex } from 'async-mutex';
import log from 'loglevel';
import { BaseController } from '../../infrastructure/BaseController';
import NetworkController from '../NetworkController';
import httpClient, { RequestError } from '../../utils/http';
import { retryHandling } from '../../utils/retryHandling';
import { MILISECOND } from '../../utils/constants/time';

export const BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT = 100;
const OFF_CHAIN_BLOCK_FETCH_SERVICE_URL = 'https://chain-fee.blockwallet.io/v1';
const OFF_CHAIN_BLOCK_FETCH_SERVICE_MAX_REPEATED_BLOCKS_TOLERANCE = 100;
const OFF_CHAIN_BLOCK_CUSTOM_HEADER = { wallet: 'BlockWallet' };
const API_CALLS_DELAY = 100 * MILISECOND;
const API_CALLS_RETRIES = 5;

export interface BlockFetchData {
    offChainSupport: boolean;
    checkingOffChainSupport: boolean;
    lastBlockOffChainChecked: number;
    currentBlockNumber: number;
}

export interface BlockFetchControllerState {
    blockFetchData: {
        [chainId: number]: BlockFetchData;
    };
}

/**
 * This class controls if the block number should be pulled from the chain or from
 * the off chain service
 */
export default class BlockFetchController extends BaseController<BlockFetchControllerState> {
    private _offChainBlockFetchService: OffChainBlockFetchService;
    private readonly _mutex: Mutex;
    constructor(
        private readonly _networkController: NetworkController,
        initialState: BlockFetchControllerState
    ) {
        super(initialState);

        this._offChainBlockFetchService = new OffChainBlockFetchService();
        this._mutex = new Mutex();
    }

    /**
     * Returns the current block number pulled from the chain or from the off chain service
     * @param chainId
     * @returns the current block number
     */
    public getCurrentBlockNumber(
        chainId: number = this._networkController.network.chainId
    ): number {
        return this._getState(chainId).currentBlockNumber;
    }

    /**
     * This function adds a on new block listener. When a new block is pulled then
     * the callback function is executed.
     *
     * It checks if the off chain service is available for the selected chain.
     *
     * All the previous listeners are removed here. Currently, there is no need for multiple
     * on new block subscriptions.
     *
     * @param chainId
     * @param blockListener a callback function to be called when there is a new block
     */
    public async addNewOnBlockListener(
        chainId: number = this._networkController.network.chainId,
        blockListener: (blockNumber: number) => void | Promise<void>,
        interval?: number
    ): Promise<void> {
        const releaseLock = await this._mutex.acquire();
        try {
            // Check if for any reason it's trying to set a listener for another chain
            if (chainId != this._networkController.network.chainId) {
                return;
            }
            interval =
                interval ||
                this._networkController.network.actionsTimeIntervals
                    .blockNumberPull ||
                ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.blockNumberPull;

            if (await this._isOffChainServiceAvailable(chainId)) {
                this._networkController.removeAllOnBlockListener();
                this._offChainBlockFetchService.setFetch(
                    interval,
                    chainId,
                    this._getState(chainId).currentBlockNumber,
                    this._getBlockNumberCallback(
                        chainId,
                        blockListener,
                        interval
                    )
                );
            } else {
                this._offChainBlockFetchService.unsetFetch();
                this._networkController.getProvider().pollingInterval =
                    interval;

                this._networkController.addOnBlockListener(
                    this._getBlockNumberCallback(
                        chainId,
                        blockListener,
                        interval
                    )
                );
            }
        } finally {
            releaseLock();
        }
    }

    /**
     * Removes all the new block listeners.
     * It does not check if the subscription is created from the chain or from the service,
     * it removes all kind of them.
     */
    public removeAllOnBlockListener(): void {
        this._offChainBlockFetchService.unsetFetch();
        this._networkController.removeAllOnBlockListener();
    }

    /**
     * It decorates the BlockUpdatesController callback to track the current block number
     * to detect anomalies and to detect if the off chain service is available for a chain.
     * @param chainId
     * @param blockListener
     * @returns a callback that recieves the current block number and a posible error.
     */
    private _getBlockNumberCallback(
        chainId: number = this._networkController.network.chainId,
        blockListener: (blockNumber: number) => void | Promise<void>,
        interval: number
    ): (blockNumber: number, error?: Error) => void | Promise<void> {
        return (blockNumber: number, error?: Error) => {
            // Check if in the middle of the execution the chain has changed
            if (chainId != this._networkController.network.chainId) {
                return;
            }
            if (!error) {
                this._updateState(chainId, {
                    currentBlockNumber: blockNumber,
                });
                blockListener(blockNumber);

                // check if it is possible to fetch the block number from
                // the service
                const { offChainSupport, checkingOffChainSupport } =
                    this._getState(chainId);
                if (!offChainSupport) {
                    if (!checkingOffChainSupport) {
                        this._updateState(chainId, {
                            checkingOffChainSupport: true,
                        });
                        this._isOffChainServiceAvailable()
                            .then((r) => {
                                this._updateState(chainId, {
                                    checkingOffChainSupport: false,
                                });
                                if (r) {
                                    this.addNewOnBlockListener(
                                        chainId,
                                        blockListener,
                                        interval
                                    );
                                }
                            })
                            .catch(() => {
                                this._updateState(chainId, {
                                    checkingOffChainSupport: false,
                                });
                            });
                    }
                }
            } else {
                // if the pull is doing from the service and there is an
                // error, then stop the service and start pulling from the chain
                if (this._getState(chainId).offChainSupport) {
                    const { currentBlockNumber } = this._getState(chainId);
                    this._updateState(chainId, {
                        offChainSupport: false,
                        checkingOffChainSupport: false,
                        currentBlockNumber: currentBlockNumber,
                        lastBlockOffChainChecked: currentBlockNumber,
                    });

                    this.addNewOnBlockListener(
                        chainId,
                        blockListener,
                        interval
                    );
                }
            }
        };
    }

    /**
     * Resolves if the off chain service is available for a new block pull.
     *
     * First, it checks the controller state, if it is true then it derivates the traffic to the service.
     * Otherwise, it will request the service to detect if it is available again for the chain,
     * this happens only if the minimum amount of block has been passed. If that amount of block has not
     * been passed then it redirects the traffic to the chain.
     * @param chainId
     * @returns a boolean that indicates if the service is available or not.
     */
    private async _isOffChainServiceAvailable(
        chainId: number = this._networkController.network.chainId
    ): Promise<boolean> {
        const state = this._getState(chainId);

        if (state.offChainSupport) {
            return true;
        }

        if (
            state.currentBlockNumber - state.lastBlockOffChainChecked >=
            BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT
        ) {
            try {
                const currentBlockNumber =
                    await this._offChainBlockFetchService.fetchBlockNumber(
                        chainId
                    );

                if (state.currentBlockNumber > currentBlockNumber) {
                    throw new Error(
                        'block number fetched from off chain service is not updated'
                    );
                }

                this._updateState(chainId, {
                    offChainSupport: true,
                    lastBlockOffChainChecked: currentBlockNumber,
                    currentBlockNumber: currentBlockNumber,
                });

                return true;
            } catch (err) {
                // re-checks only in the pre set interval
                this._updateState(chainId, {
                    offChainSupport: false,
                    lastBlockOffChainChecked: state.currentBlockNumber,
                });

                return false;
            }
        }

        return false;
    }

    private _getState(
        chainId: number = this._networkController.network.chainId
    ): BlockFetchData {
        if (chainId in this.store.getState().blockFetchData) {
            return this.store.getState().blockFetchData[chainId];
        }
        return {
            offChainSupport: false,
            checkingOffChainSupport: false,
            lastBlockOffChainChecked:
                -1 * BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
            currentBlockNumber: 0,
        };
    }

    private _updateState(
        chainId: number = this._networkController.network.chainId,
        blockFetchData: Partial<BlockFetchData>
    ): void {
        this.store.setState({
            blockFetchData: {
                ...this.store.getState().blockFetchData,
                [chainId]: {
                    ...this.store.getState().blockFetchData[chainId],
                    ...blockFetchData,
                },
            },
        });
    }
}

/**
 * This class controlates the pull of the current block number from the off chain service.
 */
export class OffChainBlockFetchService {
    private _recurrentFetch: NodeJS.Timeout | null;

    constructor() {
        this._recurrentFetch = null;
    }

    /**
     * It creates a new block number pull, also it checks if there is any error or if the
     * service is stuck.
     * @param interval
     * @param chainId
     * @param currentBlockNumber
     * @param blockListener
     */
    public setFetch(
        interval: number,
        chainId: number,
        currentBlockNumber: number,
        blockListener: (
            blockNumber: number,
            error?: Error
        ) => void | Promise<void>
    ): void {
        this.unsetFetch();
        let blockNumberRepeatedCounter = 0;

        const fetchPerform = async () => {
            try {
                const fetchedBlockNumber = await this.fetchBlockNumber(chainId);

                if (fetchedBlockNumber == currentBlockNumber) {
                    blockNumberRepeatedCounter++;
                    if (
                        blockNumberRepeatedCounter >
                        OFF_CHAIN_BLOCK_FETCH_SERVICE_MAX_REPEATED_BLOCKS_TOLERANCE
                    ) {
                        throw new Error(
                            `off chain service stuck in the same block (${fetchedBlockNumber}) for chain ${chainId}`
                        );
                    }
                } else {
                    blockNumberRepeatedCounter = 0;
                }

                if (fetchedBlockNumber > currentBlockNumber) {
                    currentBlockNumber = fetchedBlockNumber;
                    blockListener(fetchedBlockNumber);
                }
            } catch (err) {
                log.warn(err);
                blockListener(-1, err);
            }
        };

        this._recurrentFetch = setInterval(fetchPerform, interval);

        if (currentBlockNumber) {
            blockListener(currentBlockNumber);
        }
        fetchPerform();
    }

    /**
     * It disables the pull if there is any
     */
    public unsetFetch(): void {
        if (this._recurrentFetch) {
            clearInterval(this._recurrentFetch);
            this._recurrentFetch = null;
        }
    }

    /**
     * It fetches the current block number from the off chain service.
     * Also, it validates that the response of the service is valid, otherwise it returns an error.
     * @param chainId
     * @returns
     */
    public async fetchBlockNumber(chainId: number): Promise<number> {
        try {
            const blockDataResponse = await retryHandling(
                () =>
                    httpClient.request<{
                        bn: string;
                    }>(`${OFF_CHAIN_BLOCK_FETCH_SERVICE_URL}/bn`, {
                        params: {
                            c: chainId,
                        },
                        headers: OFF_CHAIN_BLOCK_CUSTOM_HEADER,
                    }),
                API_CALLS_DELAY,
                API_CALLS_RETRIES
            );

            if (!blockDataResponse) {
                throw new Error('empty response');
            }

            if (
                !blockDataResponse.bn ||
                isNaN(parseInt(blockDataResponse.bn))
            ) {
                throw new Error(
                    `block number with invalid format: ${blockDataResponse.bn}`
                );
            }

            return parseInt(blockDataResponse.bn);
        } catch (err) {
            log.warn(
                `Error fetching block number for chain ${chainId}`,
                JSON.stringify((err as RequestError).response)
            );
            throw new Error(`Error fetching block number for chain ${chainId}`);
        }
    }
}
