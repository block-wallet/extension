import { currentTimestamp, Duration } from '../../utils/constants/time';
import { Mutex } from 'async-mutex';
import log from 'loglevel';
import NetworkController, { NetworkEvents } from '../NetworkController';

export class ActionIntervalController {
    private _currentTimestamp: number;
    private readonly _mutex: Mutex;

    constructor(protected readonly _networkController: NetworkController) {
        this._currentTimestamp = 0;
        this._mutex = new Mutex();
        this._networkController.on(NetworkEvents.NETWORK_CHANGE, async () => {
            this._updateCurrentTimestamp(0);
        });
    }

    /**
     * Determines if the interval has passed considering the last recorded and the current timestamp
     * @param interval the minimal duration needed to wait before execute the action
     * @param cb the action to be called
     */
    public async tick<T>(
        interval: Duration,
        cb: () => Promise<T>
    ): Promise<void> {
        const _now = currentTimestamp();
        const timeEllapsedSinceLastUpdate = _now - this._currentTimestamp;
        if (timeEllapsedSinceLastUpdate >= interval) {
            await this._mutex.runExclusive(async () => {
                this._updateCurrentTimestamp(currentTimestamp());
                try {
                    await cb();
                } catch (err) {
                    log.debug(
                        'action interval controller error',
                        err.message,
                        'calling',
                        cb
                    );
                }
            });
        }
    }

    /**
     * Updates the value of the internal variable _currentTimestamp.
     * Need to be called when the action is executed in tick() also when the network changes.
     * @param _currentTimestamp
     */
    private _updateCurrentTimestamp(_currentTimestamp: number) {
        this._currentTimestamp = _currentTimestamp;
    }
}
