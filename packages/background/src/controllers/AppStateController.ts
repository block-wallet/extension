/* eslint-disable @typescript-eslint/ban-ts-comment */
import log from 'loglevel';
import { BaseController } from '../infrastructure/BaseController';
import { isManifestV3 } from '../utils/manifest';
import KeyringControllerDerivated from './KeyringControllerDerivated';
import TransactionController from './transactions/TransactionController';
import browser from 'webextension-polyfill';

const STICKY_STORAGE_DATA_TTL = 60000 * 10;

export interface AppStateControllerMemState {
    expiredStickyStorage: boolean;
    isAppUnlocked: boolean;
    lockedByTimeout: boolean;
    idleTimeout: number;
}

export interface AppStateControllerState {
    idleTimeout: number; // Minutes until auto-lock - Zero if disabled
    isAppUnlocked: boolean;
    lockedByTimeout: boolean;
    lastActiveTime: number;
}

export enum AppStateEvents {
    APP_LOCKED = 'APP_LOCKED',
    APP_UNLOCKED = 'APP_UNLOCKED',
}

export default class AppStateController extends BaseController<
    AppStateControllerState,
    AppStateControllerMemState
> {
    private _timer: ReturnType<typeof setTimeout> | null;
    private _stickyStorageTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        initState: AppStateControllerState,
        private readonly _keyringController: KeyringControllerDerivated,
        private readonly _transactionController: TransactionController
    ) {
        super(initState, {
            idleTimeout: initState.idleTimeout,
            isAppUnlocked: initState.isAppUnlocked,
            lockedByTimeout: initState.lockedByTimeout,
            expiredStickyStorage: false,
        });

        this._timer = null;

        const { idleTimeout, isAppUnlocked, lastActiveTime } =
            this.store.getState();

        if (isAppUnlocked) {
            const now = new Date().getTime();
            if (
                lastActiveTime + idleTimeout * 60 * 1000 < now ||
                //Force locking on refresh if it is not MV3.
                !isManifestV3()
            ) {
                this.lock(true);
            }
        }

        this._resetTimer();
        this.store.subscribe(
            (
                newState: AppStateControllerState,
                oldState?: AppStateControllerState
            ) => {
                //To avoid sending the lastActiveTime to the UI, update the UIStore based on the store data.

                if (newState.isAppUnlocked !== oldState?.isAppUnlocked) {
                    this.UIStore.updateState({
                        isAppUnlocked: newState.isAppUnlocked,
                        lockedByTimeout: newState.lockedByTimeout,
                    });
                    return;
                }

                if (newState.idleTimeout !== oldState?.idleTimeout) {
                    this.UIStore.updateState({
                        idleTimeout: newState.idleTimeout,
                    });
                }
            }
        );
    }

    /**
     * Updates last active time
     *
     */
    public setLastActiveTime = (): void => {
        this.store.updateState({ lastActiveTime: new Date().getTime() });
        this._resetTimer();
        this._resetStickyStorageTimer();
    };

    /**
     * Set a custom time in minutes for the extension auto block
     * The idle timeout should be greater than zero
     * If zero, then auto-lock is disabled
     *
     * @param idleTimeout the new timeout in minutes.
     */
    public setIdleTimeout = (idleTimeout: number): void => {
        // Throw if timeout is not valid
        if (idleTimeout < 0) {
            throw new Error("Idle timeout can't be a negative number");
        }

        this.store.updateState({ idleTimeout });
        this._transactionController.recalculateTxTimeout(idleTimeout);

        this._resetTimer();
    };

    /**
     * @returns Returns the idle timeout stored in the state.
     */
    public getIdleTimeout = (): number => {
        return this.store.getState().idleTimeout;
    };

    /**
     * Locks the vault and the app
     */
    public lock = async (lockedByTimeout = false): Promise<void> => {
        try {
            // Lock vault
            await this._keyringController.setLocked();

            // Removing login token from storage
            if (isManifestV3()) {
                // @ts-ignore
                browser.storage.session && browser.storage.session.clear();
            }

            // Update controller state
            this.store.updateState({ isAppUnlocked: false, lockedByTimeout });

            // event emit
            this.emit(AppStateEvents.APP_LOCKED);
        } catch (error) {
            throw new Error(error.message || error);
        }
    };

    /**
     * Unlocks the vault and the app
     *
     * @param password user's password
     */
    public unlock = async (password: string): Promise<void> => {
        try {
            // Unlock vault
            const loginToken = await this._keyringController.submitPassword(
                password
            );

            if (isManifestV3()) {
                // @ts-ignore
                browser.storage.session &&
                    // @ts-ignore
                    browser.storage.session
                        .set({ loginToken })
                        .catch((err: any) => {
                            log.error('error setting loginToken', err);
                        });
            }

            await this._postLoginAction();
        } catch (error) {
            throw new Error(error.message || error);
        }
    };

    private _resetStickyStorageTimer = () => {
        if (this._stickyStorageTimer) {
            clearTimeout(this._stickyStorageTimer);
        }
        //only update UIStore when it is necessary.
        if (this.UIStore.getState().expiredStickyStorage) {
            this.UIStore.updateState({ expiredStickyStorage: false });
        }

        this._stickyStorageTimer = setTimeout(() => {
            this.UIStore.updateState({ expiredStickyStorage: true });
        }, STICKY_STORAGE_DATA_TTL);
    };
    public autoUnlock = async (): Promise<void> => {
        if (isManifestV3()) {
            const { isAppUnlocked } = this.store.getState();
            if (!isAppUnlocked) {
                // @ts-ignore
                browser.storage.session &&
                    // @ts-ignore
                    browser.storage.session
                        .get(['loginToken'])
                        .then(
                            async ({
                                loginToken,
                            }: {
                                [key: string]: string;
                            }) => {
                                if (loginToken) {
                                    await (this._keyringController as any)[
                                        'submitEncryptionKey'
                                    ](loginToken);
                                    await this._postLoginAction();
                                }
                            }
                        );
            }
        }
    };

    /**
     * Sets the app as unlocked
     */
    private _postLoginAction = async () => {
        // Set Ledger transport method to WebHID
        await this._keyringController.setLedgerWebHIDTransportType();

        // Update controller state
        this.store.updateState({
            isAppUnlocked: true,
            lockedByTimeout: false,
        });

        this._resetTimer();

        // event emit
        this.emit(AppStateEvents.APP_UNLOCKED);
    };

    /**
     * Resets the idle timer
     *
     */
    private _resetTimer = () => {
        const { idleTimeout } = this.store.getState();

        if (this._timer) {
            clearTimeout(this._timer); // Halt current execution
        }

        if (idleTimeout === 0) {
            this._timer = null; // Disable auto lock
        } else {
            this._timer = setTimeout(
                () => this.lock(true),
                idleTimeout * 60 * 1000
            );
        }
    };
}
