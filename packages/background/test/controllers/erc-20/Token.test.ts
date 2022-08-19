import { expect } from 'chai';
import { Token } from '../../../src/controllers/erc-20/Token';

describe('Tokens implementation', function () {
    it('Token construction', () => {
        const DAI = new Token(
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            'Dai Stablecoin',
            'DAI',
            18
        );
        expect(DAI.address).to.equal(
            '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        );
        expect(DAI.name).to.equal('Dai Stablecoin');
        expect(DAI.symbol).to.equal('DAI');
        expect(DAI.decimals).to.equal(18);

        const USDC = new Token(
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            'StableUSD',
            'USDC',
            6
        );
        expect(USDC.address).to.equal(
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        );
        expect(USDC.name).to.equal('StableUSD');
        expect(USDC.symbol).to.equal('USDC');
        expect(USDC.decimals).to.equal(6);
    });
});
