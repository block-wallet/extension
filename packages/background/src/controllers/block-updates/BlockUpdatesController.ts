import { BaseController } from '../../infrastructure/BaseController';
import BlockFetchController from './BlockFetchController';
import NetworkController, { NetworkEvents } from './../NetworkController';
import { ActionIntervalController } from './ActionIntervalController';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../../utils/constants/networks';
import { MINUTE } from './../../utils/constants/time';

export interface BlockUpdatesControllerState {
    blockData: {
        [chainId: number]: { blockNumber: number };
    };
}

export enum BlockUpdatesEvents {
    BLOCK_UPDATES_SUBSCRIPTION = 'SUBSCRIBE_TO_BLOCK_UPDATES',
    BACKGROUND_AVAILABLE_BLOCK_UPDATES_SUBSCRIPTION = 'BACKGROUND_AVAILABLE_BLOCK_UPDATES_SUBSCRIPTION',
}

export default class BlockUpdatesController extends BaseController<BlockUpdatesControllerState> {
    private readonly _blockNumberPullIntervalController: ActionIntervalController;

    private activeSubscriptions = false;

    constructor(
        private readonly _networkController: NetworkController,
        private readonly _blockFetchController: BlockFetchController,
        initialState: BlockUpdatesControllerState
    ) {
        super(initialState);

        this._blockNumberPullIntervalController = new ActionIntervalController(
            this._networkController
        );

        this.initBlockNumber(this._networkController.network.chainId);

        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            async ({ chainId }: Network) => {
                this.initBlockNumber(chainId);
                this.addNewOnBlockListener();
            }
        );

        this.addNewOnBlockListener();
    }

    /**
     * addNewOnBlockListener
     *
     * It adds a new block listener considering the state of the app.
     *
     */
    private addNewOnBlockListener() {
        if (!this.activeSubscriptions) {
            this._blockFetchController.addNewOnBlockListener(
                this._networkController.network.chainId,
                this._blockUpdates,
                1 * MINUTE
            );
        } else {
            this._blockFetchController.addNewOnBlockListener(
                this._networkController.network.chainId,
                this._blockUpdates
            );
        }
    }

    /**
     * Sets a default block number for the specified chainId
     *
     * @param chainId The chainId to init the block number from
     */
    private initBlockNumber = (chainId: number) => {
        const { blockData } = this.store.getState();
        if (!(chainId in blockData)) {
            this.store.setState({
                blockData: {
                    ...blockData,
                    [chainId]: { blockNumber: -1 },
                },
            });
        } else {
            this.store.setState({
                blockData: {
                    ...blockData,
                    [chainId]: {
                        ...blockData[chainId],
                    },
                },
            });
        }
    };

    /**
     * setActiveSubscriptions
     *
     * It sets if there is at least one active subscription to the background
     *
     * @param isUnlocked Whether the extension is unlocked or not
     * @param subscriptions The number of subscriptions to the background
     */
    public setActiveSubscriptions(
        isUnlocked: boolean,
        subscriptions: number
    ): void {
        const prevActiveSubscriptions = this.activeSubscriptions;
        this.activeSubscriptions = isUnlocked || subscriptions > 0;
        if (this.activeSubscriptions != prevActiveSubscriptions) {
            this.addNewOnBlockListener();
        }
    }

    /**
     * getBlockNumber
     *
     * @param chainId The chainId to get the block number from
     * @returns The most recently mined block number
     */
    public getBlockNumber(
        chainId: number = this._networkController.network.chainId
    ): number {
        let blockNumber = -1;

        const { blockData } = this.store.getState();
        if (chainId in blockData) {
            blockNumber = blockData[chainId].blockNumber;
        }

        if (blockNumber <= 0) {
            blockNumber =
                this._blockFetchController.getCurrentBlockNumber(chainId);
        }

        return blockNumber;
    }

    /**
     * _blockUpdates
     *
     * Triggered on each block update, it stores the latest block number
     * and triggers updates for different controllers if needed
     */
    private _blockUpdates = async (blockNumber: number): Promise<void> => {
        if (!this._networkController.isNetworkChanging) {
            const network = this._networkController.network;
            const interval =
                network.actionsTimeIntervals.blockNumberPull ||
                ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.blockNumberPull;

            this._blockNumberPullIntervalController.tick(interval, async () => {
                const chainId = network.chainId;

                let { blockData } = this.store.getState();
                if (!(chainId in blockData)) {
                    // preventing race condition
                    this.initBlockNumber(chainId);
                    blockData = this.store.getState().blockData;
                }
                const currentBlock =
                    chainId in blockData ? blockData[chainId].blockNumber : -1;

                if (blockNumber != currentBlock) {
                    this.store.setState({
                        blockData: {
                            ...blockData,
                            [chainId]: {
                                blockNumber,
                            },
                        },
                    });

                    // Emit new block subscription
                    if (this.activeSubscriptions) {
                        this.emit(
                            BlockUpdatesEvents.BLOCK_UPDATES_SUBSCRIPTION,
                            chainId, // Update chainId
                            currentBlock, // Old block number
                            blockNumber // New block number
                        );
                    } else {
                        this.emit(
                            BlockUpdatesEvents.BACKGROUND_AVAILABLE_BLOCK_UPDATES_SUBSCRIPTION,
                            chainId, // Update chainId
                            currentBlock, // Old block number
                            blockNumber // New block number
                        );
                    }
                }
            });
        }
    };
}
