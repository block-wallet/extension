import BlankProvider from '@block-wallet/provider/provider/BlankProvider';
import { Handlers } from '@block-wallet/background/utils/types/communication';
import { JSONRPCMethod } from '@block-wallet/background/utils/types/ethereum';
import { expect } from 'chai';
import LocalStorageMock from './LocalStorageMock';

// Create test interface to test private properties
// Temporary workaround for JSDOM not being able to trigger on message callbacks,
// so we're unable to mock messages.
// @ts-ignore
interface TestProvider extends BlankProvider {
    _state: {
        accounts: string[];
        isConnected: boolean;
    };
    _handlers: Handlers;
    _requestId: number;
}

describe('Blank Provider', function () {
    let provider: TestProvider;
    let windowLocalStorage: any;

    this.beforeAll(() => {
        //Prevent the following error: "SecurityError: localStorage is not available for opaque origins"
        require('jsdom-global')(undefined, {
            url: 'http://localhost',
        });
        windowLocalStorage = window.localStorage;
        // @ts-ignore
        provider = new BlankProvider() as TestProvider;
    });

    beforeEach(() => {
        provider._handlers = {};
        Object.defineProperty(window, 'localStorage', {
            value: LocalStorageMock,
        });
        window.localStorage.clear();
    });

    this.afterAll(() => {
        Object.defineProperty(window, 'localStorage', {
            value: windowLocalStorage,
        });
    });

    describe('Request', function () {
        it('Should correctly generate handler', async function () {
            provider.request({
                method: JSONRPCMethod.eth_accounts,
            });

            const handler =
                provider._handlers[Object.keys(provider._handlers)[0]];

            expect(handler.reject).to.be.a('function');
            expect(handler.resolve).to.be.a('function');
            expect(handler.subscriber).to.be.undefined;
        });

        it('Should resolve correctly', function () {
            const accountResponse = [
                '0xc0b87c7a9f16a6bA1D6a9b3069E0D5F3FED3b99C',
            ];

            provider
                .request({
                    method: JSONRPCMethod.eth_accounts,
                })
                .then((resolved) => {
                    expect(resolved).to.be.equal(accountResponse);
                });

            provider.handleResponse({
                id: Object.keys(provider._handlers)[0],
                response: accountResponse,
            });
        });
    });
});
