/* eslint-disable @typescript-eslint/ban-types */
import { Flatten } from '@block-wallet/background/utils/types/helpers';
import ObservableStore, { IObservableStore } from './ObservableStore';

type SubStore<T> = Record<keyof T, IObservableStore<T[keyof T]>>;

export default class ComposedStore<
    T extends Object
> extends ObservableStore<T> {
    private readonly _subStores: SubStore<T>;

    constructor(subStores: SubStore<T>) {
        super({} as unknown as T);
        this._subStores = subStores;

        Object.keys(this._subStores).forEach((storeName) => {
            const subStore = this._subStores[storeName as keyof T];
            this._addSubStore(storeName as keyof T, subStore);
        });
    }

    /**
     * Adds a new sub store to the composed representation
     *
     * @param storeName The sub store (controller) name
     * @param subStore The sub observable store object
     */
    private _addSubStore(
        storeName: keyof T,
        subStore: IObservableStore<T[keyof T]>
    ): void {
        const updateFromChild = (childValue: T[keyof T]) => {
            const state = this.getState();
            state[storeName] = childValue;
            this.setState(state);
        };

        subStore.subscribe(updateFromChild);
        updateFromChild(subStore.getState());
    }

    /**
     * Flattens the composed state representation of every sub store
     * into a single object, removing each sub store(controller) key name
     *
     * @returns Flatten state representation of composed store.
     */
    public get flatState(): Flatten<T> {
        let flatState: T[keyof T] = {} as T[keyof T];
        for (const subStore in this._subStores) {
            flatState = {
                ...flatState,
                ...this._subStores[subStore].getState(),
            };
        }
        return flatState as Flatten<T>;
    }
}
