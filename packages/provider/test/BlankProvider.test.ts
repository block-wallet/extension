import BlankProvider from '@block-wallet/provider/provider/BlankProvider';
import { Handlers } from '@block-wallet/background/utils/types/communication';
import { JSONRPCMethod } from '@block-wallet/background/utils/types/ethereum';
import { expect } from 'chai';

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

    this.beforeAll(function () {
        // @ts-ignore
        provider = new BlankProvider() as TestProvider;
    });

    beforeEach(function () {
        provider._handlers = {};
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
