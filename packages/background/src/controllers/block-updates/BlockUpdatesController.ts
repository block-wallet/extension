import { BaseController } from '../../infrastructure/BaseController';
import BlockFetchController from './BlockFetchController';
import NetworkController, { NetworkEvents } from './../NetworkController';
import { ActionIntervalController } from './ActionIntervalController';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../../utils/constants/networks';
import { MINUTE } from './../../utils/constants/time';
import log from 'loglevel';

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
    private chromeAlarmsSetup = false;

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
        this.setupChromeAlarms();
    }

    /**
     * addNewOnBlockListener
     *
     * It adds a new block listener considering the state of the app.
     *
     */
    private addNewOnBlockListener() {
        if (!this.activeSubscriptions) {
            // when there is no active subscriptions (the extension is closed and locked)
            // the blocks are synced every 3 minutes.
            this._blockFetchController.addNewOnBlockListener(
                this._networkController.network.chainId,
                this._blockUpdates,
                3 * MINUTE
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
     * @param activeSubscription If there is any block wallet instance active.
     */
    public setActiveSubscriptions(
        isUnlocked: boolean,
        activeSubscription: boolean
    ): void {
        const prevActiveSubscriptions = this.activeSubscriptions;
        this.activeSubscriptions = isUnlocked && activeSubscription;
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

    /**
     * Setup Chrome Alarms for reliable block monitoring
     * This ensures block monitoring continues even when service worker goes idle
     */
    private setupChromeAlarms(): void {
        if (this.chromeAlarmsSetup) return;

        try {
            // Create alarms for different monitoring intervals
            // Active monitoring - every 15 seconds when extension is actively used
            chrome.alarms.create('blockMonitor-active', {
                periodInMinutes: 0.25 // 15 seconds
            });

            // Passive monitoring - every 3 minutes when extension is in background
            chrome.alarms.create('blockMonitor-passive', {
                periodInMinutes: 3
            });

            // Real-time check - every 5 seconds for immediate responsiveness
            chrome.alarms.create('blockMonitor-realtime', {
                periodInMinutes: 0.083 // ~5 seconds
            });

            // Listen to all block monitoring alarms
            chrome.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name.startsWith('blockMonitor-')) {
                    this.handleChromeAlarmUpdate(alarm.name);
                }
            });

            this.chromeAlarmsSetup = true;
            log.info('[BlockUpdatesController] Chrome Alarms setup completed');

        } catch (error) {
            log.error('[BlockUpdatesController] Failed to setup Chrome Alarms:', error);
        }
    }

    /**
     * Handle Chrome Alarm triggered block updates
     */
    private handleChromeAlarmUpdate(alarmName: string): void {
        const currentChainId = this._networkController.network.chainId;

        // Determine update frequency based on alarm type and subscription status
        let shouldUpdate = false;

        switch (alarmName) {
            case 'blockMonitor-realtime':
                // Real-time updates only when actively subscribed
                shouldUpdate = this.activeSubscriptions;
                break;
            case 'blockMonitor-active':
                // Active updates when subscribed or recently active
                shouldUpdate = this.activeSubscriptions;
                break;
            case 'blockMonitor-passive':
                // Passive updates always run in background for basic sync
                shouldUpdate = true;
                break;
        }

        if (shouldUpdate) {
            // Trigger a block number check
            this._blockFetchController.getCurrentBlockNumber(currentChainId);
            log.debug(`[BlockUpdatesController] Chrome Alarm triggered update: ${alarmName}`);
        }
    }

    /**
     * Cleanup Chrome Alarms when controller is disposed
     */
    public cleanup(): void {
        if (this.chromeAlarmsSetup) {
            chrome.alarms.clear('blockMonitor-active');
            chrome.alarms.clear('blockMonitor-passive');
            chrome.alarms.clear('blockMonitor-realtime');
            this.chromeAlarmsSetup = false;
        }
    }
}
