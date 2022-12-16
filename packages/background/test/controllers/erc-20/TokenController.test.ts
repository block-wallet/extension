import {
    searchParamNotPresentError,
    tokenAddressParamNotPresentError,
    TokenController,
    TokenControllerProps,
    tokenParamNotPresentError,
} from '../../../src/controllers/erc-20/TokenController';
import { expect } from 'chai';
import { ITokens, Token } from '../../../src/controllers/erc-20/Token';
import NetworkController from '../../../src/controllers/NetworkController';
import sinon from 'sinon';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import { toChecksumAddress } from 'ethereumjs-util';
import { getNetworkControllerInstance } from '../../mocks/mock-network-instance';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { mockPreferencesController } from '../../mocks/mock-preferences';
import { isNativeTokenAddress } from '@block-wallet/background/utils/token';

describe('Token controller implementation', function () {
    let tokenController: TokenController;
    let networkController: NetworkController;
    let tokenControllerProps: TokenControllerProps;
    let tokenOperationsController: TokenOperationsController;
    let preferencesController: PreferencesController;

    beforeEach(() => {
        networkController = getNetworkControllerInstance();
        tokenOperationsController = new TokenOperationsController({
            networkController: networkController,
        });
        preferencesController = mockPreferencesController;

        tokenControllerProps = {
            tokenOperationsController,
            preferencesController,
            networkController,
        } as TokenControllerProps;

        tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
                cachedPopulatedTokens: {} as any,
            },
            tokenControllerProps
        );
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('getContractAddresses', function () {
        it('Should return empty token addresses', async () => {
            sinon
                .stub(networkController, 'network')
                .value({ chainId: 42, name: 'kovan' });

            const addresses = await tokenController.getContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.empty;
        });
        it('Should return token addresses', async () => {
            sinon.stub(TokenController.prototype, 'getTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                        '0x4102997e68f44666aD14956681506F71d7F9b4A0': new Token(
                            '0x4102997e68f44666aD14956681506F71d7F9b4A0',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                        '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416': new Token(
                            '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416',
                            'Goerli USDC',
                            'USDC',
                            18
                        ),
                    });
                })
            );
            const addresses = await tokenController.getContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.empty;
        });
    });

    describe('getUserTokenContractAddresses', function () {
        it('Should return empty token addresses', async () => {
            sinon
                .stub(networkController, 'getNetwork')
                .returns(Promise.resolve({ chainId: 42, name: 'kovan' }));

            const addresses =
                await tokenController.getUserTokenContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.empty;
        });
        it('Should return token addresses', async () => {
            sinon.stub(TokenController.prototype, 'getUserTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                        '0x4102997e68f44666aD14956681506F71d7F9b4A0': new Token(
                            '0x4102997e68f44666aD14956681506F71d7F9b4A0',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                        '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416': new Token(
                            '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416',
                            'Goerli USDC',
                            'USDC',
                            18
                        ),
                    });
                })
            );
            const addresses =
                await tokenController.getUserTokenContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.empty;
        });
    });

    describe('getDeletedUserTokenContractAddresses', function () {
        it('Should return empty token addresses', async () => {
            sinon
                .stub(networkController, 'getNetwork')
                .returns(Promise.resolve({ chainId: 42, name: 'kovan' }));

            const addresses =
                await tokenController.getDeletedUserTokenContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.empty;
        });
        it('Should return token addresses', async () => {
            sinon
                .stub(TokenController.prototype, 'getDeletedUserTokens')
                .returns(
                    new Promise<ITokens>((resolve) => {
                        resolve({
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60':
                                new Token(
                                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                                    'Goerli DAI',
                                    'DAI',
                                    18
                                ),
                            '0x4102997e68f44666aD14956681506F71d7F9b4A0':
                                new Token(
                                    '0x4102997e68f44666aD14956681506F71d7F9b4A0',
                                    'Goerli USDT',
                                    'USDT',
                                    18
                                ),
                            '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416':
                                new Token(
                                    '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416',
                                    'Goerli USDC',
                                    'USDC',
                                    18
                                ),
                        });
                    })
                );
            const addresses =
                await tokenController.getDeletedUserTokenContractAddresses();

            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.empty;
        });
    });

    describe('getTokens', function () {
        it('Should return no tokens', async () => {
            sinon
                .stub(networkController, 'network')
                .value({ chainId: 42, name: 'kovan' });
            const tokens = await tokenController.getTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.empty;
        });
        it('Should return tokens', async () => {
            sinon.stub(TokenController.prototype, 'getTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                        '0x4102997e68f44666aD14956681506F71d7F9b4A0': new Token(
                            '0x4102997e68f44666aD14956681506F71d7F9b4A0',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                        '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416': new Token(
                            '0xb1FFd2B420a76c5DE0E2Da00F7263633f25D3416',
                            'Goerli USDC',
                            'USDC',
                            18
                        ),
                    });
                })
            );
            const tokens = await tokenController.getTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.not.empty;
        });
    });

    describe('getUserTokens', function () {
        it('Should return empty', async () => {
            const tokens = await tokenController.getUserTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.empty;
        });
        it('Should return tokens', async () => {
            await tokenController.addCustomToken(
                new Token(
                    '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    'Dai Stablecoin',
                    'DAI',
                    18
                )
            );

            const tokens = await tokenController.getUserTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.not.empty;
        });
    });

    describe('getDeletedUserTokens', function () {
        it('Should return empty', async () => {
            const tokens = await tokenController.getDeletedUserTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.empty;
        });
        it('Should return tokens', async () => {
            const token = new Token(
                '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                'Dai Stablecoin',
                'DAI',
                18
            );
            await tokenController.deleteUserToken(token.address);

            const tokens = await tokenController.getDeletedUserTokens();

            expect(tokens).to.be.not.null;
            expect(tokens).to.be.not.empty;
        });
    });

    describe('getToken', function () {
        it('Should fail - tokenAddress not present', async () => {
            try {
                await tokenController.getToken('');
            } catch (e: any) {
                expect(e).equal(tokenAddressParamNotPresentError);
            }
        });
        it('Should return DAI token', async () => {
            sinon.stub(TokenController.prototype, 'getTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0x6B175474E89094C44Da98b954EedeAC495271d0F': new Token(
                            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                    });
                })
            );
            const dai = await tokenController.getToken(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );
            expect(dai).to.be.not.null;
            expect(dai.address).equal(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );
        });
    });

    describe('search', function () {
        it('Should fail - search not present', async () => {
            try {
                await tokenController.search('');
            } catch (e: any) {
                expect(e).equal(searchParamNotPresentError);
            }
        });
        it('Should search and return DAI token', async () => {
            sinon.stub(TokenController.prototype, 'getTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0x6B175474E89094C44Da98b954EedeAC495271d0F': new Token(
                            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                            'Dai Stablecoin',
                            'DAI',
                            18
                        ),
                    });
                })
            );
            const { tokens: dai_1 } = await tokenController.search('DAI');
            expect(dai_1).to.be.not.null;
            expect(dai_1).to.be.not.undefined;
            expect(dai_1.length).to.be.greaterThan(0);
            const addresses = new Set(dai_1.map((t) => t.address));
            expect(addresses.has('0x6B175474E89094C44Da98b954EedeAC495271d0F'))
                .to.be.true;

            const { tokens: dai_2 } = await tokenController.search('Dai Stablecoin');
            expect(dai_2[0]).to.be.not.null;
            expect(dai_2[0]).to.be.not.undefined;
            expect(dai_2[0].address).equal(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );

            const { tokens: dai_3 } = await tokenController.search(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );
            expect(dai_3).to.be.not.null;
            expect(dai_3).to.be.not.undefined;
            expect(dai_3[0].address).equal(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );
        });
    });

    describe('addCustomToken', function () {
        it('Should fail - token not present', async () => {
            try {
                await tokenController.addCustomToken(
                    undefined as unknown as Token
                );
            } catch (e: any) {
                expect(e).equal(tokenParamNotPresentError);
            }
        });
        it('Adding manual tokens', async () => {
            await tokenController.addCustomToken(
                new Token(
                    '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    'Dai Stablecoin',
                    'DAI',
                    18
                )
            );

            const T = await tokenController.getToken(
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            );
            expect(T).to.be.not.null;
        });
    });

    describe('removeUserToken', function () {
        it('Should fail - token not present', async () => {
            try {
                await tokenController.deleteUserToken(
                    undefined as unknown as string
                );
            } catch (e: any) {
                expect(e).equal(tokenAddressParamNotPresentError);
            }
        });
        it('Removing a token', async () => {
            const token = new Token(
                toChecksumAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
                'Dai Stablecoin',
                'DAI',
                18
            );

            await tokenController.addCustomToken(token);
            expect(
                (
                    await tokenController.getUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(true);
            expect(
                (
                    await tokenController.getDeletedUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(false);

            await tokenController.deleteUserToken(token.address);
            expect(
                (
                    await tokenController.getUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(false);
            expect(
                (
                    await tokenController.getDeletedUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(true);

            await tokenController.addCustomToken(token);
            expect(
                (
                    await tokenController.getUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(true);
            expect(
                (
                    await tokenController.getDeletedUserTokenContractAddresses()
                ).includes(token.address)
            ).equal(false);
        });
    });
});
