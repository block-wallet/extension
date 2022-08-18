import { EventEmitter } from 'events';
import ObservableStore, { IObservableStore } from './stores/ObservableStore';

/**
 * Controller class that provides configuration, state management, and events
 */
export abstract class BaseController<S, M = unknown> extends EventEmitter {
    /**
     * The persistable store
     */
    private readonly _store: IObservableStore<S>;

    /**
     * The UI's volatile calculated store
     */
    private readonly _UIStore: IObservableStore<M>;

    /**
     * It returns the controller's UI's volatile calculated store
     * (Used only by certain controllers)
     */
    public get UIStore(): IObservableStore<M> {
        return this._UIStore;
    }

    /**
     * It returns the controller's store
     */
    public get store(): IObservableStore<S> {
        return this._store;
    }

    /**
     * Creates a BaseController instance.
     *
     * @param state - Initial state to set on this controller
     */
    constructor(state?: S, memState?: M) {
        super();
        this._store = new ObservableStore(state);
        this._UIStore = new ObservableStore(memState || ({} as unknown as M));
    }
}
