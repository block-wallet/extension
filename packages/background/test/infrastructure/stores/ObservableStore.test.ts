import ObservableStore from '@block-wallet/background/infrastructure/stores/ObservableStore';
import { expect } from 'chai';
import sinon from 'sinon';

describe('ObservableStore implementation', () => {
    let store: ObservableStore<{
        testKey: string;
        complexObject: { key1: { subKey1: string }; key2: number };
    }>;

    beforeEach(() => {
        store = new ObservableStore({
            testKey: 'test',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should set the initial state correctly', async () => {
        const state = store.getState();
        expect(state).to.be.deep.equal({
            testKey: 'test',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
        });
    });

    it('Should subscribe to state updates correctly', async () => {
        const sub = sinon.spy((_) => {});
        store.subscribe(sub);
        expect(store['subscriptions'].length).to.be.equal(1);

        store.updateState({
            testKey: 'tested',
        });

        expect(sub.callCount).to.be.equal(1);

        sub.getCall(0).calledWith({
            testKey: 'tested',
            complexObject: { key1: { subKey1: '1' }, key2: 1 },
        });
    });

    it('Should unsubscribe from state updates correctly', async () => {
        const sub = sinon.spy((_) => {});

        store.subscribe(sub);
        store.subscribe(sub);
        expect(store['subscriptions'].length).to.be.equal(2);

        store.unsubscribe(sub);
        expect(store['subscriptions'].length).to.be.equal(1);

        store.unsubscribe(sub);
        expect(store['subscriptions'].length).to.be.equal(0);
    });

    it('Should partially update the state correctly', async () => {
        store.updateState({
            complexObject: { key1: { subKey1: '1' }, key2: 4 },
        });

        expect(store.getState()).to.be.deep.equal({
            testKey: 'test',
            complexObject: { key1: { subKey1: '1' }, key2: 4 },
        });
    });

    it('Should replace the state correctly', async () => {
        store.setState({
            testKey: 'tested',
            complexObject: { key1: { subKey1: '1' }, key2: 4 },
        });
        expect(store.getState()).to.be.deep.equal({
            testKey: 'tested',
            complexObject: { key1: { subKey1: '1' }, key2: 4 },
        });
    });
});
