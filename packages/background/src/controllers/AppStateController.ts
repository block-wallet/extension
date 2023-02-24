/* eslint-disable @typescript-eslint/ban-ts-comment */
import log from 'loglevel';
import { BaseController } from '../infrastructure/BaseController';
import { isManifestV3 } from '../utils/manifest';
import KeyringControllerDerivated from './KeyringControllerDerivated';
import TransactionController from './transactions/TransactionController';

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

export type SessionToken = {
    encryptionKey: string;
    encryptionSalt: string;
};

export default class AppStateController extends BaseController<AppStateControllerState> {
    private _timer: ReturnType<typeof setTimeout> | null;

    constructor(
        initState: AppStateControllerState,
        private readonly _keyringController: KeyringControllerDerivated,
        private readonly _transactionController: TransactionController
    ) {
        super(initState);

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
    }

    /**
     * Updates last active time
     *
     */
    public setLastActiveTime = (): void => {
        this.store.updateState({ lastActiveTime: new Date().getTime() });
        this._resetTimer();
    };

    public get lastActiveTime(): number {
        return this.lastActiveTime;
    }

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
                chrome.storage.session && chrome.storage.session.clear();
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
            const sessionToken = await this._keyringController.submitPassword(
                password
            );

            if (isManifestV3()) {
                this._storeSessionToken({
                    encryptionKey: sessionToken.encryptionKey,
                    encryptionSalt: sessionToken.encryptionSalt,
                });
            }

            await this._postLoginAction();
        } catch (error) {
            throw new Error(error.message || error);
        }
    };

    private _getSessionToken(): Promise<SessionToken | undefined> {
        return new Promise((resolve) => {
            // @ts-ignore
            if (chrome.storage.session) {
                // @ts-ignore
                chrome.storage.session.get(
                    ['sessionToken'],
                    async ({ sessionToken }: { [key: string]: any }) => {
                        if (!sessionToken) {
                            resolve(undefined);
                        }
                        resolve(sessionToken as SessionToken);
                    }
                );
            } else {
                resolve(undefined);
            }
        });
    }

    private async _storeSessionToken(
        sessionToken: SessionToken
    ): Promise<SessionToken> {
        if (chrome.storage.session) {
            await chrome.storage.session
                .set({
                    sessionToken: {
                        encryptionKey: sessionToken.encryptionKey,
                        encryptionSalt: sessionToken.encryptionSalt,
                    },
                })
                .catch((err: any) => {
                    log.error('error setting sessionToken', err);
                });
        }

        return sessionToken;
    }

    public autoUnlock = async (): Promise<void> => {
        if (isManifestV3()) {
            const { isAppUnlocked } = this.store.getState();
            if (isAppUnlocked) {
                let forceLock = true;
                try {
                    const sessionToken = await this._getSessionToken();
                    if (sessionToken) {
                        const newSessionToken =
                            await this._keyringController.submitEncryptionKey(
                                sessionToken.encryptionKey,
                                sessionToken.encryptionSalt
                            );
                        await this._storeSessionToken({
                            encryptionKey: newSessionToken.encryptionKey,
                            encryptionSalt: newSessionToken.encryptionSalt,
                        });
                        await this._postLoginAction();
                        forceLock = false;
                    }
                } catch (e) {
                    log.error('Unable to autoUnlock keyring', e);
                } finally {
                    // if we were unable to unlock keyring we should lock the wallet
                    // the user needs to unlock the keyring and the wallet by his own
                    if (forceLock) {
                        this.lock();
                    }
                }
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
