import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import SwapController, {
    ExchangeType,
} from '@block-wallet/background/controllers/SwapController';
import NetworkController from '../../src/controllers/NetworkController';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import sinon from 'sinon';
import { ApproveTransaction } from '@block-wallet/background/controllers/erc-20/transactions/ApproveTransaction';
import { BigNumber } from '@ethersproject/bignumber';
import { ContractSignatureParser } from '@block-wallet/background/controllers/transactions/ContractSignatureParser';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import {
    MetaType,
    TransactionCategories,
    TransactionStatus,
} from '@block-wallet/background/controllers/transactions/utils/types';
import { PreferencesController } from '../../src/controllers/PreferencesController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
import { expect } from 'chai';
import { expectThrowsAsync } from 'test/utils/expectThrowsAsync.test';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import { mockHttpClientResponse } from 'test/mocks/mockApiResponse';
import { mockPreferencesController } from '../mocks/mock-preferences';
import { mockedPermissionsController } from 'test/mocks/mock-permissions';
import {
    TokenController,
    TokenControllerProps,
} from '../../src/controllers/erc-20/TokenController';
import httpClient from './../../src/utils/http';
import { TypedTransaction } from '@ethereumjs/tx';
import TokenAllowanceController from '@block-wallet/background/controllers/erc-20/transactions/TokenAllowanceController';
import { mockKeyringController } from 'test/mocks/mock-keyring-controller';
import { BASE_SWAP_FEE } from '@block-wallet/background/utils/swaps/1inch';

const BLANK_TOKEN_ADDRESS = '0x41a3dba3d677e573636ba691a70ff2d606c29666';

describe('Swap Controller', function () {
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

    let tokenController: TokenController;
    let preferencesController: PreferencesController;
    let networkController: NetworkController;
    let tokenOperationsController: TokenOperationsController;
    let blockUpdatesController: BlockUpdatesController;
    let gasPricesController: GasPricesController;
    let permissionsController: PermissionsController;
    let transactionController: TransactionController;
    let swapController: SwapController;
    let tokenAllowanceController: TokenAllowanceController;

    this.beforeAll(() => {
        // Instantiate objects
        networkController = getNetworkControllerInstance();

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );

        preferencesController = mockPreferencesController;

        tokenOperationsController = new TokenOperationsController({
            networkController: networkController,
        });

        tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
                cachedPopulatedTokens: {} as any,
            },
            {
                networkController,
                preferencesController,
                tokenOperationsController,
            } as TokenControllerProps
        );

        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );

        permissionsController = mockedPermissionsController;

        transactionController = new TransactionController(
            networkController,
            preferencesController,
            permissionsController,
            gasPricesController,
            tokenController,
            blockUpdatesController,
            mockKeyringController,
            {
                transactions: [],
                txSignTimeout: 0,
            },
            async (_: string, ethTx: TypedTransaction) => {
                const privateKey = Buffer.from(accounts.goerli[0].key, 'hex');
                return Promise.resolve(ethTx.sign(privateKey));
            },
            { txHistoryLimit: 40 }
        );

        tokenAllowanceController = new TokenAllowanceController(
            networkController,
            preferencesController,
            tokenOperationsController,
            transactionController
        );

        swapController = new SwapController(
            networkController,
            transactionController,
            tokenController,
            tokenAllowanceController,
            gasPricesController
        );
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Exchange compatibility', function () {
        it('Should fail for bad exchange type on allowance', async function () {
            const error = await expectThrowsAsync(async () => {
                await swapController.checkSwapAllowance(
                    accounts.goerli[0].address,
                    BigNumber.from('500000000000000000'),
                    'Not an exchange type' as ExchangeType,
                    BLANK_TOKEN_ADDRESS
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Unable to fetch exchange spender');
        });

        it('Should fail for bad exchange type on quote', async function () {
            const error = await expectThrowsAsync(async () => {
                await swapController.getExchangeQuote(
                    'Not an exchange type' as ExchangeType,
                    {
                        fromToken: {
                            address:
                                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            decimals: 18,
                            name: 'Ether',
                            symbol: 'ETH',
                        },
                        toToken: {
                            address:
                                '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                            decimals: 18,
                            name: 'Token',
                            symbol: 'TKN',
                        },
                        amount: '10000000000000000',
                    }
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Exchange type not supported.');
        });

        it('Should fail for bad exchange type on swap params', async function () {
            const error = await expectThrowsAsync(async () => {
                await swapController.getExchangeParameters(
                    'Not an exchange type' as ExchangeType,
                    {
                        fromToken: {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            decimals: 18,
                            address:
                                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            logoURI:
                                'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                            tags: ['native'],
                        },
                        toToken: {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            decimals: 18,
                            address:
                                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            logoURI:
                                'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                            tags: ['native'],
                        },
                        amount: '10000000000000000',
                        fromAddress: accounts.goerli[0].address,
                        slippage: 0.5,
                    }
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Exchange type not supported.');
        });

        it('Should fail for bad exchange type on execute exchange', async function () {
            const error = await expectThrowsAsync(async () => {
                await swapController.executeExchange(
                    'Not an exchange type' as ExchangeType,
                    {
                        fromToken: {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            decimals: 18,
                            address:
                                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            logoURI:
                                'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                            tags: ['native'],
                        },
                        toToken: {
                            symbol: 'BLANK',
                            name: 'GoBlank Token',
                            decimals: 18,
                            address:
                                '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                            logoURI:
                                'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                            tags: ['tokens'],
                        },
                        toTokenAmount: '200000000000000000000',
                        fromTokenAmount: '10000000000000000',
                        protocols: [
                            [
                                [
                                    {
                                        name: 'UNISWAP_V2',
                                        part: 100,
                                        fromTokenAddress:
                                            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                        toTokenAddress:
                                            '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                                    },
                                ],
                            ],
                        ],
                        tx: {
                            from: accounts.goerli[0].address,
                            to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                            data: '0x2e95b6c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000baa32066e89877da40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340d8a07e9fe071106bf29536b93e8c9a26527af787cfee7c08',
                            value: '10000000000000000',
                            gas: 200000,
                            gasPrice: '20000000000',
                        },
                        blockWalletFee: BigNumber.from('50000000000000'),
                    }
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Exchange type not supported.');
        });
    });

    describe('1Inch Swap', function () {
        it('Should fail to check asset allowance', async function () {
            sinon.stub(tokenOperationsController, 'allowance').returns(
                new Promise<BigNumber>((_, reject) => {
                    // 1 BLANK
                    reject('Error');
                })
            );

            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                })
            );

            const error = await expectThrowsAsync(async () => {
                await swapController.checkSwapAllowance(
                    accounts.goerli[0].address,
                    BigNumber.from('500000000000000000'),
                    ExchangeType.SWAP_1INCH,
                    BLANK_TOKEN_ADDRESS
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Error checking asset allowance');
        });

        it('Should check asset allowance', async function () {
            sinon.stub(tokenOperationsController, 'allowance').returns(
                new Promise<BigNumber>((resolve) => {
                    // 1 BLANK
                    resolve(BigNumber.from('1000000000000000000'));
                })
            );

            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                })
            );

            let hasAllowance: boolean;

            hasAllowance = await swapController.checkSwapAllowance(
                accounts.goerli[0].address,
                BigNumber.from('500000000000000000'),
                ExchangeType.SWAP_1INCH,
                BLANK_TOKEN_ADDRESS
            );

            expect(hasAllowance).to.be.true;

            hasAllowance = await swapController.checkSwapAllowance(
                accounts.goerli[0].address,
                BigNumber.from('1500000000000000000'),
                ExchangeType.SWAP_1INCH,
                BLANK_TOKEN_ADDRESS
            );

            expect(hasAllowance).to.be.false;
        });

        it('Should fail to submit an approve transaction', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                })
            );
            sinon
                .stub(ApproveTransaction.prototype, 'do')
                .returns(Promise.resolve(false));

            let error: string | undefined;

            error = await expectThrowsAsync(async () => {
                await swapController.approveSwapExchange(
                    BigNumber.from('500000000000000000'),
                    BigNumber.from('1000000000000000000'),
                    ExchangeType.SWAP_1INCH,
                    {
                        gasLimit: BigNumber.from('100000'),
                        gasPrice: BigNumber.from('1000000000'),
                    },
                    BLANK_TOKEN_ADDRESS,
                    undefined
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal(
                'Specified allowance is less than the exchange amount'
            );

            error = await expectThrowsAsync(async () => {
                await swapController.approveSwapExchange(
                    BigNumber.from('1500000000000000000'),
                    BigNumber.from('1000000000000000000'),
                    ExchangeType.SWAP_1INCH,
                    {
                        gasLimit: BigNumber.from('100000'),
                        gasPrice: BigNumber.from('1000000000'),
                    },
                    BLANK_TOKEN_ADDRESS,
                    undefined
                );
            });

            expect(error).to.be.equal(
                'Error submitting approval transaction to setup asset allowance'
            );
        });

        it('Should submit an approve transaction', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                })
            );
            sinon
                .stub(ApproveTransaction.prototype, 'do')
                .returns(Promise.resolve(true));

            const result = await swapController.approveSwapExchange(
                BigNumber.from('1500000000000000000'),
                BigNumber.from('1000000000000000000'),
                ExchangeType.SWAP_1INCH,
                {
                    gasLimit: BigNumber.from('100000'),
                    gasPrice: BigNumber.from('1000000000'),
                },
                BLANK_TOKEN_ADDRESS,
                undefined
            );

            expect(result).not.to.be.undefined;
            expect(result).to.be.true;
        });

        it('Should fail to get a swap quote', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    statusCode: 400,
                    error: 'Bad Request',
                    description:
                        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEe is wrong address',
                    meta: [
                        {
                            type: 'token',
                            value: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEe',
                        },
                    ],
                    requestId: '1af3ab52-fde7-45bf-8f19-dac9b702f528',
                })
            );

            let error: string | undefined;

            error = await expectThrowsAsync(async () => {
                await swapController.getExchangeQuote(ExchangeType.SWAP_1INCH, {
                    fromToken: {
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        decimals: 18,
                        name: 'Ether',
                        symbol: 'ETH',
                    },
                    toToken: {
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        decimals: 18,
                        name: 'Token',
                        symbol: 'TKN',
                    },
                    amount: '10000000000000000',
                });
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Error getting 1Inch swap quote');
        });

        it('Should get a swap quote', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    fromToken: {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        decimals: 18,
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        logoURI:
                            'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                        tags: ['native'],
                    },
                    toToken: {
                        symbol: 'BLANK',
                        name: 'GoBlank Token',
                        decimals: 18,
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        logoURI:
                            'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                        tags: ['tokens'],
                    },
                    toTokenAmount: '200000000000000000000',
                    fromTokenAmount: '10000000000000000',
                    protocols: [
                        [
                            [
                                {
                                    name: 'UNISWAP_V2',
                                    part: 100,
                                    fromTokenAddress:
                                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                    toTokenAddress:
                                        '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                                },
                            ],
                        ],
                    ],
                    estimatedGas: 200000,
                })
            );

            const res = await swapController.getExchangeQuote(
                ExchangeType.SWAP_1INCH,
                {
                    fromToken: {
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        decimals: 18,
                        name: 'Ether',
                        symbol: 'ETH',
                    },
                    toToken: {
                        address: BLANK_TOKEN_ADDRESS,
                        decimals: 18,
                        name: 'Token',
                        symbol: 'TKN',
                    },
                    amount: '10000000000000000',
                }
            );

            expect(res).not.to.be.undefined;
            expect(res.fromToken.address).to.be.equal(
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            );
            expect(res.toToken.address).to.be.equal(
                '0x41a3dba3d677e573636ba691a70ff2d606c29666'
            );
            expect(res.fromTokenAmount).to.be.equal('10000000000000000');
            expect(res.toTokenAmount).to.be.equal('200000000000000000000');
            expect(BigNumber.isBigNumber(res.blockWalletFee)).to.be.true;
            expect(res.blockWalletFee!.toString()).to.be.equal(
                BigNumber.from(res.fromTokenAmount)
                    .mul(BASE_SWAP_FEE * 10)
                    .div(1000)
                    .toString()
            );
            expect(res.estimatedGas).to.be.equal(250000);
            expect(res.fromTokenAmount).to.be.equal('10000000000000000');
        });

        it('Should fail to get a swap transaction parameters', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    statusCode: 400,
                    error: 'Bad Request',
                    description:
                        '0xEeeeeEeeeEeEeeEeEeEeEEEeeeeEeeeeeeeEEeE is wrong address',
                    meta: [
                        {
                            type: 'token',
                            value: '0xEeeeeEeeeEeEeeEeEeEeEEEeeeeEeeeeeeeEEeE',
                        },
                    ],
                    requestId: '3f11d383-4aa9-41d3-aa6d-dfdbe9871aff',
                })
            );

            let error: string | undefined;

            error = await expectThrowsAsync(async () => {
                await swapController.getExchangeParameters(
                    ExchangeType.SWAP_1INCH,
                    {
                        fromToken: {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            decimals: 18,
                            address:
                                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            logoURI:
                                'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                            tags: ['native'],
                        },
                        toToken: {
                            symbol: 'BLANK',
                            name: 'GoBlank Token',
                            decimals: 18,
                            address:
                                '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                            logoURI:
                                'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                            tags: ['tokens'],
                        },
                        amount: '10000000000000000',
                        fromAddress: accounts.goerli[0].address,
                        slippage: 0.5,
                    }
                );
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Error getting 1Inch swap parameters');
        });

        it('Should get a swap transaction parameters', async function () {
            sinon.stub(httpClient, 'request').returns(
                mockHttpClientResponse({
                    fromToken: {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        decimals: 18,
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        logoURI:
                            'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                        tags: ['native'],
                    },
                    toToken: {
                        symbol: 'BLANK',
                        name: 'GoBlank Token',
                        decimals: 18,
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        logoURI:
                            'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                        tags: ['tokens'],
                    },
                    toTokenAmount: '200000000000000000000',
                    fromTokenAmount: '10000000000000000',
                    protocols: [
                        [
                            [
                                {
                                    name: 'UNISWAP_V2',
                                    part: 100,
                                    fromTokenAddress:
                                        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                    toTokenAddress:
                                        '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                                },
                            ],
                        ],
                    ],
                    tx: {
                        from: accounts.goerli[0].address,
                        to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                        data: '0x2e95b6c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000baa32066e89877da40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340d8a07e9fe071106bf29536b93e8c9a26527af787cfee7c08',
                        value: '10000000000000000',
                        gas: 200000,
                        gasPrice: '20000000000',
                    },
                })
            );

            sinon
                .stub(ContractSignatureParser.prototype, 'getMethodSignature')
                .returns(
                    Promise.resolve({
                        name: 'Swap',
                        args: [
                            {
                                name: 'caller',
                                type: 'address',
                                value: '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                            },
                            {
                                name: 'desc',
                                type: 'tuple',
                                value: [
                                    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                    '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                    '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                                    {
                                        type: 'BigNumber',
                                        hex: '0x2386f26fc10000',
                                    },
                                    {
                                        type: 'BigNumber',
                                        hex: '0x0b9b43e8fe7b3b9fa9',
                                    },
                                    {
                                        type: 'BigNumber',
                                        hex: '0x00',
                                    },
                                    '0x',
                                ],
                            },
                            {
                                name: 'data',
                                type: 'bytes',
                                value: '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f00000000000000000000000000000000000000000000000000002d79883d200000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000235978e783e00000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000d8a07e9fe071106bf29536b93e8c9a26527af78700000000000000000000000000000000000000000000000000235978e783e0000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000d8a07e9fe071106bf29536b93e8c9a26527af787000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000041a3dba3d677e573636ba691a70ff2d606c296660000000000000000002dc6c01111111254fb6c44bac0bed2854e76f90643097d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                            },
                        ],
                    })
                );

            const res = await swapController.getExchangeParameters(
                ExchangeType.SWAP_1INCH,
                {
                    fromToken: {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        decimals: 18,
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        logoURI:
                            'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                        tags: ['native'],
                    },
                    toToken: {
                        symbol: 'BLANK',
                        name: 'GoBlank Token',
                        decimals: 18,
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        logoURI:
                            'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                        tags: ['tokens'],
                    },
                    amount: '10000000000000000',
                    fromAddress: accounts.goerli[0].address,
                    slippage: 0.5,
                }
            );

            expect(res).not.to.be.undefined;
            expect(res.fromToken.address).to.be.equal(
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            );
            expect(res.toToken.address).to.be.equal(
                '0x41a3dba3d677e573636ba691a70ff2d606c29666'
            );
            expect(res.fromTokenAmount).to.be.equal('10000000000000000');
            expect(res.toTokenAmount).to.be.equal('200000000000000000000');
            expect(BigNumber.isBigNumber(res.blockWalletFee)).to.be.true;
            expect(res.blockWalletFee.toString()).to.be.equal(
                BigNumber.from(res.fromTokenAmount)
                    .mul(BASE_SWAP_FEE * 10)
                    .div(1000)
                    .toString()
            );
            expect(res.tx.gas).to.be.equal(250000);
            expect(res.fromTokenAmount).to.be.equal('10000000000000000');
            expect(res.methodSignature).not.to.be.undefined;
        });

        it('Should fail to submit a swap transaction', async function () {
            sinon.stub(transactionController, 'addTransaction').returns(
                new Promise((resolve) => {
                    resolve({
                        result: new Promise((resolve) => {
                            resolve(
                                '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                            );
                        }),
                        transactionMeta: {
                            approveTime: 1656527770143,
                            blocksDropCount: 0,
                            chainId: 137,
                            gasEstimationFailed: false,
                            id: '3ee2ce72-84d0-40be-9ae8-37d638894e7b',
                            loadingGasValues: false,
                            metaType: MetaType.REGULAR,
                            methodSignature: {
                                args: [
                                    {
                                        name: 'caller',
                                        type: 'address',
                                        value: '0x521709B3Cd7F07e29722Be0Ba28a8Ce0e806Dbc3',
                                    },
                                    {
                                        name: 'desc',
                                        type: 'tuple',
                                        value: [
                                            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                            '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
                                            '0x521709B3Cd7F07e29722Be0Ba28a8Ce0e806Dbc3',
                                            '0x413f3536eab14074e6b2a7813b22745E41368875',
                                            {
                                                type: 'BigNumber',
                                                hex: '0xe8d4a51000',
                                            },
                                            {
                                                type: 'BigNumber',
                                                hex: '0xa218f90735',
                                            },
                                            {
                                                type: 'BigNumber',
                                                hex: '0x00',
                                            },
                                            '0x',
                                        ],
                                    },
                                    {
                                        name: 'data',
                                        type: 'bytes',
                                        value: '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                                    },
                                ],
                                name: 'Swap',
                            },
                            origin: 'blank',
                            rawTransaction:
                                '0x02f908fd8189058520895d1cd1853902438500830648de941111111254fb6c44bac0bed2854e76f90643097d85e8d4a51000b908887c025200000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000413f3536eab14074e6b2a7813b22745e41368875000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000a218f9073500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08c080a02bd56f6609b4597a75b656f0e1a007b5d7e435d4ef55aa8897b3fc08507c31e4a033be7bb56f38e57ea4ebdecb3eacccd29daae2d6a0b89ff9f1ac146d870f6301',
                            status: TransactionStatus.CONFIRMED,
                            submittedTime: 1656527771238,
                            exchangeParams: {
                                exchangeType: ExchangeType.SWAP_1INCH,
                                blockWalletFee: BigNumber.from('0x012a05f200'),
                                fromToken: {
                                    address:
                                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                    decimals: 18,
                                    logoURI:
                                        'https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png',
                                    name: 'MATIC',
                                    symbol: 'MATIC',
                                    tags: ['native'],
                                },
                                fromTokenAmount: '1000000000000',
                                toToken: {
                                    address:
                                        '0x172370d5cd63279efa6d502dab29171933a610af',
                                    decimals: 18,
                                    logoURI:
                                        'https://tokens.1inch.io/0xd533a949740bb3306d119cc777fa900ba034cd52.png',
                                    name: 'CRV',
                                    symbol: 'CRV',
                                    tags: ['tokens'],
                                },
                                toTokenAmount: '699702186377',
                            },
                            time: 1656527769648,
                            transactionCategory: TransactionCategories.EXCHANGE,
                            transactionParams: {
                                chainId: 137,
                                data: '0x7c025200000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000413f3536eab14074e6b2a7813b22745e41368875000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000a218f9073500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08',
                                from: '0x413f3536eab14074e6b2a7813b22745e41368875',
                                gasLimit: BigNumber.from('0x0648de'),
                                hash: '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92',
                                maxFeePerGas: BigNumber.from('0x3902438500'),
                                maxPriorityFeePerGas:
                                    BigNumber.from('0x20895d1cd1'),
                                nonce: 5,
                                r: '0x2bd56f6609b4597a75b656f0e1a007b5d7e435d4ef55aa8897b3fc08507c31e4',
                                s: '0x33be7bb56f38e57ea4ebdecb3eacccd29daae2d6a0b89ff9f1ac146d870f6301',
                                to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                                type: 2,
                                v: 0,
                                value: BigNumber.from('0xe8d4a51000'),
                            },
                            transactionReceipt: {
                                blockHash:
                                    '0x88fc8eec1688b14fdb02d7ee88f8f4f0d3c304fdbc7aced63b31bbc2691645b2',
                                blockNumber: 30146188,
                                byzantium: true,
                                confirmations: 5,
                                contractAddress:
                                    '0x1111111254fb6c44bac0bed2854e76f90643097d',
                                cumulativeGasUsed: BigNumber.from('0x75033c'),
                                effectiveGasPrice:
                                    BigNumber.from('0x387bb41d82'),
                                from: '0x413f3536eab14074e6b2a7813b22745E41368875',
                                gasUsed: BigNumber.from('0x03212a'),
                                logs: [],
                                logsBloom:
                                    '0x00200000000000000000000080000000000000000000000000000000200000001000000000008000000000100000000000008000000000000000000000000000000080000000401000000028000000a000000400000000000001000080000a0000400000000000000080200000000020000000000000000080000012000000000000010000001000000000000000001000000001002000080080004000280000200000000000000000000000000000004040000000000020000000000000004001000002000000000801000008801000000000000000801000108000000000000000100020008000000000000000000000000000010000400000000000100800',
                                status: 1,
                                to: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
                                transactionHash:
                                    '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92',
                                transactionIndex: 43,
                                type: 2,
                            },
                            verifiedOnBlockchain: true,
                        },
                    });
                })
            );
            sinon
                .stub(transactionController, 'updateTransaction')
                .throws('Error');
            sinon.stub(transactionController, 'approveTransaction').returns(
                new Promise((resolve, reject) => {
                    resolve();
                })
            );

            const error = await expectThrowsAsync(async () => {
                await swapController.executeExchange(ExchangeType.SWAP_1INCH, {
                    fromToken: {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        decimals: 18,
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        logoURI:
                            'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                        tags: ['native'],
                    },
                    toToken: {
                        symbol: 'BLANK',
                        name: 'GoBlank Token',
                        decimals: 18,
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        logoURI:
                            'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                        tags: ['tokens'],
                    },
                    toTokenAmount: '200000000000000000000',
                    fromTokenAmount: '10000000000000000',
                    protocols: [
                        [
                            [
                                {
                                    name: 'UNISWAP_V2',
                                    part: 100,
                                    fromTokenAddress:
                                        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                    toTokenAddress:
                                        '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                                },
                            ],
                        ],
                    ],
                    tx: {
                        from: accounts.goerli[0].address,
                        to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                        data: '0x2e95b6c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000baa32066e89877da40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340d8a07e9fe071106bf29536b93e8c9a26527af787cfee7c08',
                        value: '10000000000000000',
                        gas: 200000,
                        gasPrice: '20000000000',
                    },
                    blockWalletFee: BigNumber.from('50000000000000'),
                });
            });

            expect(error).not.to.be.undefined;
            expect(error).to.be.equal('Error executing Swap');
        });

        it('Should submit a swap transaction', async function () {
            sinon.stub(transactionController, 'addTransaction').returns(
                new Promise((resolve) => {
                    resolve({
                        result: new Promise((resolve) => {
                            resolve(
                                '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                            );
                        }),
                        transactionMeta: {
                            approveTime: 1656527770143,
                            blocksDropCount: 0,
                            chainId: 137,
                            gasEstimationFailed: false,
                            id: '3ee2ce72-84d0-40be-9ae8-37d638894e7b',
                            loadingGasValues: false,
                            metaType: MetaType.REGULAR,
                            methodSignature: {
                                args: [
                                    {
                                        name: 'caller',
                                        type: 'address',
                                        value: '0x521709B3Cd7F07e29722Be0Ba28a8Ce0e806Dbc3',
                                    },
                                    {
                                        name: 'desc',
                                        type: 'tuple',
                                        value: [
                                            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                            '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
                                            '0x521709B3Cd7F07e29722Be0Ba28a8Ce0e806Dbc3',
                                            '0x413f3536eab14074e6b2a7813b22745E41368875',
                                            {
                                                type: 'BigNumber',
                                                hex: '0xe8d4a51000',
                                            },
                                            {
                                                type: 'BigNumber',
                                                hex: '0xa218f90735',
                                            },
                                            {
                                                type: 'BigNumber',
                                                hex: '0x00',
                                            },
                                            '0x',
                                        ],
                                    },
                                    {
                                        name: 'data',
                                        type: 'bytes',
                                        value: '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                                    },
                                ],
                                name: 'Swap',
                            },
                            origin: 'blank',
                            rawTransaction:
                                '0x02f908fd8189058520895d1cd1853902438500830648de941111111254fb6c44bac0bed2854e76f90643097d85e8d4a51000b908887c025200000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000413f3536eab14074e6b2a7813b22745e41368875000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000a218f9073500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08c080a02bd56f6609b4597a75b656f0e1a007b5d7e435d4ef55aa8897b3fc08507c31e4a033be7bb56f38e57ea4ebdecb3eacccd29daae2d6a0b89ff9f1ac146d870f6301',
                            status: TransactionStatus.CONFIRMED,
                            submittedTime: 1656527771238,
                            exchangeParams: {
                                exchangeType: ExchangeType.SWAP_1INCH,
                                blockWalletFee: BigNumber.from('0x012a05f200'),
                                fromToken: {
                                    address:
                                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                    decimals: 18,
                                    logoURI:
                                        'https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png',
                                    name: 'MATIC',
                                    symbol: 'MATIC',
                                    tags: ['native'],
                                },
                                fromTokenAmount: '1000000000000',
                                toToken: {
                                    address:
                                        '0x172370d5cd63279efa6d502dab29171933a610af',
                                    decimals: 18,
                                    logoURI:
                                        'https://tokens.1inch.io/0xd533a949740bb3306d119cc777fa900ba034cd52.png',
                                    name: 'CRV',
                                    symbol: 'CRV',
                                    tags: ['tokens'],
                                },
                                toTokenAmount: '699702186377',
                            },
                            time: 1656527769648,
                            transactionCategory: TransactionCategories.EXCHANGE,
                            transactionParams: {
                                chainId: 137,
                                data: '0x7c025200000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000413f3536eab14074e6b2a7813b22745e41368875000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000a218f9073500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000480000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000003110a855333bfb922aecb1b3542ba2fde28d204f000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a575217000000000000000000000000000000000000000000000000000000e7aa9f1e0000000000000000000000000000000000000000000000000000000000800000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000140ea3fae80a2732ebc4de0511ff84ef1a5752170000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000002dc6c0521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018414284aab00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000000000000100000000000000000000000000000001000000000000000000000000521709b3cd7f07e29722be0ba28a8ce0e806dbc3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000172370d5cd63279efa6d502dab29171933a610af0000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08',
                                from: '0x413f3536eab14074e6b2a7813b22745e41368875',
                                gasLimit: BigNumber.from('0x0648de'),
                                hash: '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92',
                                maxFeePerGas: BigNumber.from('0x3902438500'),
                                maxPriorityFeePerGas:
                                    BigNumber.from('0x20895d1cd1'),
                                nonce: 5,
                                r: '0x2bd56f6609b4597a75b656f0e1a007b5d7e435d4ef55aa8897b3fc08507c31e4',
                                s: '0x33be7bb56f38e57ea4ebdecb3eacccd29daae2d6a0b89ff9f1ac146d870f6301',
                                to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                                type: 2,
                                v: 0,
                                value: BigNumber.from('0xe8d4a51000'),
                            },
                            transactionReceipt: {
                                blockHash:
                                    '0x88fc8eec1688b14fdb02d7ee88f8f4f0d3c304fdbc7aced63b31bbc2691645b2',
                                blockNumber: 30146188,
                                byzantium: true,
                                confirmations: 5,
                                contractAddress:
                                    '0x1111111254fb6c44bac0bed2854e76f90643097d',
                                cumulativeGasUsed: BigNumber.from('0x75033c'),
                                effectiveGasPrice:
                                    BigNumber.from('0x387bb41d82'),
                                from: '0x413f3536eab14074e6b2a7813b22745E41368875',
                                gasUsed: BigNumber.from('0x03212a'),
                                logs: [],
                                logsBloom:
                                    '0x00200000000000000000000080000000000000000000000000000000200000001000000000008000000000100000000000008000000000000000000000000000000080000000401000000028000000a000000400000000000001000080000a0000400000000000000080200000000020000000000000000080000012000000000000010000001000000000000000001000000001002000080080004000280000200000000000000000000000000000004040000000000020000000000000004001000002000000000801000008801000000000000000801000108000000000000000100020008000000000000000000000000000010000400000000000100800',
                                status: 1,
                                to: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
                                transactionHash:
                                    '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92',
                                transactionIndex: 43,
                                type: 2,
                            },
                            verifiedOnBlockchain: true,
                        },
                    });
                })
            );
            sinon.stub(transactionController, 'updateTransaction').returns();
            sinon.stub(transactionController, 'approveTransaction').returns(
                new Promise((resolve) => {
                    resolve();
                })
            );

            const result = await swapController.executeExchange(
                ExchangeType.SWAP_1INCH,
                {
                    fromToken: {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        decimals: 18,
                        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        logoURI:
                            'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
                        tags: ['native'],
                    },
                    toToken: {
                        symbol: 'BLANK',
                        name: 'GoBlank Token',
                        decimals: 18,
                        address: '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                        logoURI:
                            'https://tokens.1inch.io/0xaec7e1f531bb09115103c53ba76829910ec48966.png',
                        tags: ['tokens'],
                    },
                    toTokenAmount: '200000000000000000000',
                    fromTokenAmount: '10000000000000000',
                    protocols: [
                        [
                            [
                                {
                                    name: 'UNISWAP_V2',
                                    part: 100,
                                    fromTokenAddress:
                                        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                    toTokenAddress:
                                        '0x41a3dba3d677e573636ba691a70ff2d606c29666',
                                },
                            ],
                        ],
                    ],
                    tx: {
                        from: accounts.goerli[0].address,
                        to: '0x1111111254fb6c44bac0bed2854e76f90643097d',
                        data: '0x2e95b6c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000baa32066e89877da40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340d8a07e9fe071106bf29536b93e8c9a26527af787cfee7c08',
                        value: '10000000000000000',
                        gas: 200000,
                        gasPrice: '20000000000',
                    },
                    blockWalletFee: BigNumber.from('50000000000000'),
                }
            );

            expect(result).not.to.be.undefined;
            expect(result).to.be.equal(
                '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
            );
        });
    });
});
