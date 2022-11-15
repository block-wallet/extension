import { isNativeTokenAddress } from '@block-wallet/background/utils/token';
import { expect } from 'chai';

describe('isNativeToken', function () {
    it('false - empty address is not native', () => {
        expect(isNativeTokenAddress('')).to.be.false;
    });
    it('false', () => {
        expect(
            isNativeTokenAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F')
        ).to.be.false;
        expect(isNativeTokenAddress('wrong address')).to.be.false;
    });
    it('true', () => {
        expect(
            isNativeTokenAddress('0x0000000000000000000000000000000000000000')
        ).to.be.true;
        expect(isNativeTokenAddress('0x0')).to.be.true;
    });
});
