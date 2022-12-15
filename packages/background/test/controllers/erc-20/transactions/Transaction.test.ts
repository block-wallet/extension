import {
    accountParamNotPresentError,
    ownerParamNotPresentError,
    spenderParamNotPresentError,
    tokenAddressParamNotPresentError,
} from '../../../../src/controllers/erc-20/TokenController';
import { expect } from 'chai';
import NetworkController from '../../../../src/controllers/NetworkController';
import sinon from 'sinon';
import {
    TokenOperationsController,
    TokenTransactionController,
    TokenTransactionProps,
} from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';

describe('Transaction', function () {
    describe('TokenTransactionController implementation', function () {
        class TokenTransactionControllerTest extends TokenTransactionController {
            constructor(props: TokenTransactionProps) {
                super(props);
            }
            public getContract(tokenAddress: string) {
                return super.getContract(tokenAddress);
            }
        }
        let tokenTransactionControllerTest: TokenTransactionControllerTest;
        let networkController: NetworkController;

        beforeEach(() => {
            networkController = getNetworkControllerInstance();
            tokenTransactionControllerTest = new TokenTransactionControllerTest(
                {
                    networkController,
                }
            );
        });
        afterEach(function () {
            sinon.restore();
        });

        describe('getContract', function () {
            it('Should fail - tokenAddress not present', () => {
                try {
                    tokenTransactionControllerTest.getContract('');
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
            it('Goerli DAI contract', () => {
                try {
                    const address =
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
                    const contract =
                        tokenTransactionControllerTest.getContract(address);
                    expect(contract).to.be.not.null;
                    expect(contract.address).to.be.not.null;
                    expect(contract.address).to.be.equal(address);
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
            it('Goerli USDC contract', () => {
                try {
                    const address =
                        '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C';
                    const contract =
                        tokenTransactionControllerTest.getContract(address);
                    expect(contract).to.be.not.null;
                    expect(contract.address).to.be.not.null;
                    expect(contract.address).to.be.equal(address);
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
        });
    });

    describe('TokenOperationsController implementation', function () {
        let networkController: NetworkController;
        let tokenOperationsController: TokenOperationsController;
        const daiAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
        const accounts = {
            goerli: [
                {
                    key: '7fe1315d0fa2f408dacddb41deacddec915e85c982e9cbdaacc6eedcb3f9793b',
                    address: '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                },
                {
                    key: '4b95973deb96905fd605d765f31d1ce651e627d61c136fa2b8eb246a3c549ebe',
                    address: '0xbda8C7b7B5d0579Eb18996D1f684A434E4fF701f',
                },
            ],
        };

        beforeEach(() => {
            networkController = getNetworkControllerInstance();
            tokenOperationsController = new TokenOperationsController({
                networkController,
            });
        });
        afterEach(function () {
            sinon.restore();
        });

        describe('balanceOf', function () {
            it('Should fail - tokenAddress not present', () => {
                tokenOperationsController
                    .balanceOf('', '')
                    .catch((e) =>
                        expect(e).equal(tokenAddressParamNotPresentError)
                    );
            });
            it('Should fail - account not present', () => {
                tokenOperationsController
                    .balanceOf(daiAddress, '')
                    .catch((e) => expect(e).equal(accountParamNotPresentError));
            });
            it('Should get balance', async () => {
                const balance = await tokenOperationsController.balanceOf(
                    daiAddress,
                    accounts.goerli[0].address
                );
                expect(balance).to.be.not.null;
            });
        });

        describe('allowance', function () {
            it('Should fail - tokenAddress not present', () => {
                tokenOperationsController
                    .allowance('', '', '')
                    .catch((e) =>
                        expect(e).equal(tokenAddressParamNotPresentError)
                    );
            });
            it('Should fail - owner not present', () => {
                tokenOperationsController
                    .allowance(daiAddress, '', '')
                    .catch((e) => expect(e).equal(ownerParamNotPresentError));
            });
            it('Should fail - spender not present', () => {
                tokenOperationsController
                    .allowance(daiAddress, accounts.goerli[0].address, '')
                    .catch((e) => expect(e).equal(spenderParamNotPresentError));
            });
            it('Should get allowance', async () => {
                const allowance = await tokenOperationsController.allowance(
                    daiAddress,
                    accounts.goerli[0].address,
                    accounts.goerli[0].address
                );
                expect(allowance).to.be.not.null;
            });
        });

        describe('populateTokenData', function () {
            it('Should fail - token address not present', () => {
                tokenOperationsController.fetchTokenDataFromChain('').catch((e) => {
                    expect(e).equal(tokenAddressParamNotPresentError);
                });
            });
            it('Should populate token data', () => {
                const tokenAddress =
                    '0x336711444d1f4e823c1679e5368c874d2700ce51';
                tokenOperationsController
                    .fetchTokenDataFromChain(tokenAddress)
                    .then((fetchTokenResult) => {
                        const token = fetchTokenResult.token
                        expect(token).to.be.not.null;
                        expect(token.address).equal(tokenAddress);
                        expect(token.name).equal('USDC');
                        expect(token.symbol).equal('USDC');
                        expect(token.decimals).equal(18);
                    });
            });
            it('Should not populate token data', () => {
                const tokenAddress =
                    '0x6b175474e89094c44da98b954eedeac495271d0f';
                tokenOperationsController
                    .fetchTokenDataFromChain(tokenAddress)
                    .then((fetchTokenResult) => {
                        const token = fetchTokenResult.token
                        expect(token).to.be.not.null;
                        expect(token.address).equal(tokenAddress);
                        expect(token.name).equal('');
                        expect(token.symbol).equal('');
                        expect(token.decimals).equal(0);
                    });
            });
        });
    });
});
