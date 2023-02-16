import { expect } from 'chai';
import { getExchangeRateMockController } from '../mocks/mock-exchangerates';
import { ExchangeRatesController } from '@block-wallet/background/controllers/ExchangeRatesController';
import sinon from 'sinon';

describe('Exchange Rates Controller', function () {
    let exchangeRatesController: ExchangeRatesController;
    let exchangeRatesControllerARS: ExchangeRatesController;
    const exchangeRateSandox = sinon.createSandbox();
    before(() => {
        exchangeRatesController = getExchangeRateMockController('USD');
        exchangeRatesControllerARS = getExchangeRateMockController('ARS');
        exchangeRateSandox
            .stub(exchangeRatesController as any, '_getTokenRates')
            .returns(Promise.resolve([]));
    });

    afterEach(function () {
        exchangeRateSandox.restore();
    });

    it('ETH-USD - it should feed the exchangeRates object', async function () {
        expect(exchangeRatesController.store.getState().exchangeRates).to.be
            .empty;

        exchangeRateSandox
            .stub(exchangeRatesController['_exchangeRateService'], 'getRate')
            .returns(Promise.resolve(1225));

        await exchangeRatesController.updateExchangeRates();

        //Run UpdateExchangeRates it should retrieve the object with values
        expect(
            exchangeRatesController.store.getState().exchangeRates['ETH']
        ).equal(1225);
    });

    it('ETH-ARS - it should feed the exchangeRates object', async function () {
        exchangeRateSandox
            .stub(exchangeRatesControllerARS as any, '_getTokenRates')
            .returns(
                Promise.resolve(
                    Promise.resolve({
                        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
                            usd: 1.001,
                        },
                        '0xdac17f958d2ee523a2206206994597c13d831ec7': {
                            usd: 1.001,
                        },
                    })
                )
            );

        exchangeRateSandox
            .stub(exchangeRatesControllerARS['_exchangeRateService'], 'getRate')
            .returns(Promise.resolve(50000));

        await exchangeRatesControllerARS.updateExchangeRates();

        //Run UpdateExchangeRates it should retrieve the object with values
        expect(
            exchangeRatesControllerARS.store.getState().exchangeRates['ETH']
        ).equal(50000);
    });

    it('AVX-USD - it should feed the exchangeRates object', async function () {
        exchangeRateSandox
            .stub(exchangeRatesController.store.getState(), 'exchangeRates')
            .value({ ['AVX']: 0 });
        exchangeRateSandox
            .stub(
                exchangeRatesController.store.getState(),
                'networkNativeCurrency'
            )
            .value({
                symbol: 'AVX',
                coingeckoPlatformId: '333999',
            });
        exchangeRateSandox
            .stub(exchangeRatesController as any, '_getTokenRates')
            .returns(Promise.resolve([]));

        exchangeRateSandox
            .stub(exchangeRatesController['_exchangeRateService'], 'getRate')
            .returns(Promise.resolve(125));

        await exchangeRatesController.updateExchangeRates();

        //Run UpdateExchangeRates it should retrieve the object with values
        expect(
            exchangeRatesController.store.getState().exchangeRates['AVX']
        ).equal(125);
    });
});
