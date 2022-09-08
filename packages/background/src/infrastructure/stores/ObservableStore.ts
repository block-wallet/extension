import { clone, cloneDeep } from 'lodash';

/**
 * ObservableStore generic interface
 */
export interface IObservableStore<T> {
    getState(): T;
    setState(newState: T): void;
    updateState(partialState: Partial<T>): void;
    subscribe(handler: (s: T, oldState?: T) => void): void;
    unsubscribe(handler: (s: T) => void): void;
    notify(oldState?: T, action?: string): void;
}

/**
 * Listener function that will subscribe to state updates
 */
export type Listener<T> = (state: T, oldState?: T, action?: string) => void;

/**
 * State change actions enum
 */
export enum STATE_ACTIONS {
    INIT_STATE = 'INIT_STATE',
    UPDATE_STATE = 'UPDATE_STATE',
    PUT_STATE = 'PUT_STATE',
}

export default class ObservableStore<T> implements IObservableStore<T> {
    private _state: T;
    private readonly subscriptions: Listener<T>[];

    constructor(initialState?: T, private readonly storeName?: string) {
        this._state = initialState ?? ({} as unknown as T);
        this.subscriptions = [];
    }

    /**
     * Retrieves the store's state.
     */
    public getState(): T {
        return this._state;
    }

    /**
     * Replaces the store state with the newly provided one
     *
     * @param newState The state to replace with
     */
    public setState(newState: T, action?: string): void {
        const oldState =
            typeof this._state === 'object'
                ? cloneDeep(this._state)
                : this._state;
        this._state = newState;
        this.notify(oldState, action);
    }

    /**
     * Partially updates the store state
     *
     * @param partialState The partial state to update the store with
     * @param actionName The action name to trigger (default UPDATE_STATE)
     */
    public updateState(partialState: Partial<T>, actionName?: string): void {
        if (partialState && typeof partialState === 'object') {
            // If partialState is an object merge with current one
            this.setState(
                { ...this._state, ...partialState },
                actionName ?? STATE_ACTIONS.UPDATE_STATE
            );
        } else {
            // If partialState is a non-object primitive, replace
            this.setState(partialState);
        }
    }

    /**
     * Subscribes a function to state changes
     *
     * @param listener The subscription callback
     */
    public subscribe(listener: Listener<T>): void {
        this.subscriptions.push(listener);
    }

    /**
     * Unsubscribes a function from state changes
     *
     * If any single function has been subscribed multiple times, then
     * `unsuscribe()` must be called multiple times to remove each instance
     *
     * @param listener The subscription callback
     */

    public unsubscribe(listener: Listener<T>): void {
        // Find subscription index
        const index = this.subscriptions.findIndex((sub) => listener === sub);

        // If subscription was not found, return
        if (index < 0) {
            return;
        }

        // Remove subscription
        this.subscriptions.splice(index, 1);
    }

    /**
     * Notify all subscriptions of current state
     */
    public notify(oldState?: T, action?: string): void {
        this.subscriptions.forEach((subscription) => {
            subscription(this._state, oldState, action);
        });
    }
}
