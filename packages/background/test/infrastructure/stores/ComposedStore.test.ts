import ComposedStore from '@block-wallet/background/infrastructure/stores/ComposedStore';
import ObservableStore from '@block-wallet/background/infrastructure/stores/ObservableStore';
import { expect } from 'chai';
import sinon from 'sinon';

describe('ComposedStore implementation', () => {
    let store1: ObservableStore<{
        testKey: string;
        complexObject: { key1: { subKey1: string }; key2: number };
    }>;

    let store2: ObservableStore<{
        secondStoreTestKey: string;
        secondStoreComplexObject: { key1: { subKey1: string }; key2: number };
    }>;

    let composedStore: ComposedStore<{
        store1: {
            testKey: string;
            complexObject: { key1: { subKey1: string }; key2: number };
        };
        store2: {
            secondStoreTestKey: string;
            secondStoreComplexObject: {
                key1: { subKey1: string };
                key2: number;
            };
        };
    }>;

    beforeEach(() => {
        store1 = new ObservableStore({
            testKey: 'test',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
        });

        store2 = new ObservableStore({
            secondStoreTestKey: 'secondStoreTestKey',
            secondStoreComplexObject: {
                key1: { subKey1: '123456' },
                key2: 123456,
            },
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should set the composed initial state correctly', async () => {
        composedStore = new ComposedStore<{
            store1: {
                testKey: string;
                complexObject: { key1: { subKey1: string }; key2: number };
            };
            store2: {
                secondStoreTestKey: string;
                secondStoreComplexObject: {
                    key1: { subKey1: string };
                    key2: number;
                };
            };
        }>({
            store1,
            store2,
        });

        const state = composedStore.getState();

        expect(state).to.be.deep.equal({
            store1: {
                testKey: 'test',
                complexObject: { key1: { subKey1: '1' }, key2: 1 },
            },
            store2: {
                secondStoreTestKey: 'secondStoreTestKey',
                secondStoreComplexObject: {
                    key1: { subKey1: '123456' },
                    key2: 123456,
                },
            },
        });
    });

    it('Should flatten the composed state correctly', async () => {
        composedStore = new ComposedStore<{
            store1: {
                testKey: string;
                complexObject: { key1: { subKey1: string }; key2: number };
            };
            store2: {
                secondStoreTestKey: string;
                secondStoreComplexObject: {
                    key1: { subKey1: string };
                    key2: number;
                };
            };
        }>({
            store1,
            store2,
        });

        const state = composedStore.flatState;

        expect(state).to.be.deep.equal({
            testKey: 'test',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
            secondStoreTestKey: 'secondStoreTestKey',
            secondStoreComplexObject: {
                key1: { subKey1: '123456' },
                key2: 123456,
            },
        });
    });

    it('Should update the composed state after a child updated its internal one correctly', async () => {
        composedStore = new ComposedStore<{
            store1: {
                testKey: string;
                complexObject: { key1: { subKey1: string }; key2: number };
            };
            store2: {
                secondStoreTestKey: string;
                secondStoreComplexObject: {
                    key1: { subKey1: string };
                    key2: number;
                };
            };
        }>({
            store1,
            store2,
        });

        store1.updateState({
            testKey: 'updatedTestKey',
        });

        const state = composedStore.flatState;

        expect(state).to.be.deep.equal({
            testKey: 'updatedTestKey',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
            secondStoreTestKey: 'secondStoreTestKey',
            secondStoreComplexObject: {
                key1: { subKey1: '123456' },
                key2: 123456,
            },
        });
    });
});
