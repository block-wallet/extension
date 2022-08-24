import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BridgeController, {
    BridgeAllowanceCheck,
} from '@block-wallet/background/controllers/BridgeController';
import {
    TokenController,
    TokenControllerProps,
} from '@block-wallet/background/controllers/erc-20/TokenController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import NetworkController from '@block-wallet/background/controllers/NetworkController';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';
import { mockedPermissionsController } from 'test/mocks/mock-permissions';
import { mockPreferencesController } from 'test/mocks/mock-preferences';
import sinon, { SinonStub } from 'sinon';
import BridgeAPI, {
    BridgeImplementation,
    IBridgeRoute,
    QuoteNotFoundError,
} from '@block-wallet/background/utils/bridgeApi';
import { IChain } from '@block-wallet/background/utils/types/chain';
import { expect } from 'chai';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';
import NETWORK_TOKENS_LIST from '@block-wallet/background/controllers/erc-20/TokenList';
import { IToken } from '@block-wallet/background/controllers/erc-20/Token';
import { ContractSignatureParser } from '@block-wallet/background/controllers/transactions/ContractSignatureParser';
import { expectThrowsAsync } from 'test/utils/expectThrowsAsync.test';
import { BigNumber } from 'ethers';

const TOKEN_A_GOERLI: IToken = {
    address: 'token_a_g',
    decimals: 18,
    logo: 'logo_1',
    name: 'TOKEN A GOERLI',
    symbol: 'TAG',
    type: '',
};

const TOKEN_A_MAINNET = {
    address: 'token_a_m',
    decimals: 18,
    logo: 'logo_2',
    name: 'TOKEN A MAINNET',
    symbol: 'TAM',
    type: '',
};

const SUPPORTED_CHAINS: IChain[] = Object.values(INITIAL_NETWORKS).map(
    (net) => ({
        id: net.chainId,
        logo: '',
        name: net.name,
        test: net.test,
    })
);

const GOERLI_CHAIN_ID = INITIAL_NETWORKS.GOERLI.chainId;

const SUPPORTED_GOERLI_TOKENS = Object.values(
    NETWORK_TOKENS_LIST[GOERLI_CHAIN_ID]
);

const mockPromiseResponse = <T>(r: T): Promise<T> =>
    new Promise((resolve) => resolve(r));

describe.only('Bridge Controller', () => {
    const sandbox = sinon.createSandbox();
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
    let bridgeController: BridgeController;

    before(() => {
        //mock supported chains
        sandbox
            .stub(BridgeAPI.LIFI_BRIDGE, 'getSupportedChains')
            .returns(mockPromiseResponse(SUPPORTED_CHAINS));

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
            {
                transactions: [],
                txSignTimeout: 0,
            },
            async (ethTx: TypedTransaction) => {
                const privateKey = Buffer.from(accounts.goerli[0].key, 'hex');
                return Promise.resolve(ethTx.sign(privateKey));
            },
            { txHistoryLimit: 40 }
        );

        bridgeController = new BridgeController(
            networkController,
            preferencesController,
            tokenOperationsController,
            transactionController,
            tokenController
        );
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Li.Fi Aggregator', () => {
        describe('Available chains', () => {
            it('Should initialize the available chains correctly', () => {
                expect(
                    bridgeController.UIStore.getState().availableBridgeChains
                ).deep.equal(SUPPORTED_CHAINS);
            });
            it('Should update the available chains memory state correctly', async () => {
                const newChains = [
                    {
                        id: 2000,
                        logo: '',
                        name: 'chain_2000',
                        test: false,
                    },
                ];

                expect(
                    bridgeController.UIStore.getState().availableBridgeChains
                ).deep.equal(SUPPORTED_CHAINS);

                //mock new supported chains
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getSupportedChains')
                    .returns(mockPromiseResponse(newChains));

                await bridgeController.getAvailableChains(
                    BridgeImplementation.LIFI_BRIDGE
                );

                expect(
                    bridgeController.UIStore.getState().availableBridgeChains
                ).deep.equal(newChains);

                sandbox.restore();

                //restore mock supported chains
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getSupportedChains')
                    .returns(mockPromiseResponse(SUPPORTED_CHAINS));

                await bridgeController.getAvailableChains(
                    BridgeImplementation.LIFI_BRIDGE
                );

                expect(
                    bridgeController.UIStore.getState().availableBridgeChains
                ).deep.equal(SUPPORTED_CHAINS);
            });
        });
        describe('Get tokens', () => {
            let supportedTokenStub: SinonStub | null = null;
            beforeEach(() => {
                supportedTokenStub = sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getSupportedTokensForChain')
                    .withArgs(GOERLI_CHAIN_ID)
                    .returns(mockPromiseResponse(SUPPORTED_GOERLI_TOKENS));
            });

            afterEach(() => {
                sandbox.restore();
            });

            it('Should return supported goerli tokens', async () => {
                const supportedTokens = await bridgeController.getTokens(
                    BridgeImplementation.LIFI_BRIDGE
                );
                expect(supportedTokenStub!.alwaysCalledWith(GOERLI_CHAIN_ID)).to
                    .be.true;
                expect(supportedTokens).deep.equal(SUPPORTED_GOERLI_TOKENS);
            });
            it('Should return empty tokens', async () => {
                sandbox.restore();
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getSupportedTokensForChain')
                    .withArgs(GOERLI_CHAIN_ID)
                    .returns(mockPromiseResponse([]));
                const supportedTokens = await bridgeController.getTokens(
                    BridgeImplementation.LIFI_BRIDGE
                );
                expect(supportedTokens).to.be.empty;
            });
        });
        describe('Avaialable Routes', () => {
            afterEach(() => {
                sandbox.restore();
            });
            it('Should return empty routes for the specified parameters', async () => {
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getRoutes')
                    .withArgs({
                        fromChainId: GOERLI_CHAIN_ID,
                        fromTokenAddress: 'token_a',
                    })
                    .returns(mockPromiseResponse([]));
                const { routes } = await bridgeController.getAvailableRoutes(
                    BridgeImplementation.LIFI_BRIDGE,
                    {
                        fromTokenAddress: 'token_a',
                    }
                );
                expect(routes).to.be.empty;
            });
            it('Should not return empty routes for the specified parameters', async () => {
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getRoutes')
                    .withArgs({
                        fromChainId: GOERLI_CHAIN_ID,
                        fromTokenAddress: TOKEN_A_GOERLI.address,
                    })
                    .returns(
                        mockPromiseResponse<IBridgeRoute[]>([
                            {
                                fromTokens: [TOKEN_A_GOERLI],
                                toTokens: [TOKEN_A_MAINNET],
                                fromChainId: GOERLI_CHAIN_ID,
                                toChainId: 1,
                            },
                        ])
                    );
                const { routes } = await bridgeController.getAvailableRoutes(
                    BridgeImplementation.LIFI_BRIDGE,
                    {
                        fromTokenAddress: 'token_a_g',
                    }
                );
                expect(routes).to.be.have.lengthOf(1);
                expect(routes[0].fromChainId).to.be.equal(GOERLI_CHAIN_ID);
                expect(routes[0].toChainId).to.be.equal(1);
                expect(routes[0].fromTokens).to.be.have.lengthOf(1);
                expect(routes[0].toTokens).to.be.have.lengthOf(1);
                expect(routes[0].fromTokens[0].address).to.be.equal(
                    'token_a_g'
                );
                expect(routes[0].toTokens[0].address).to.be.equal('token_a_m');
            });
        });
        describe.only('Quotes and Allowance', () => {
            before(() => {
                //mock errored query
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getQuote')
                    .withArgs({
                        fromChainId: GOERLI_CHAIN_ID,
                        toChainId: 1,
                        fromTokenAddress: 'token_a_g',
                        toTokenAddress: 'random_token',
                        slippage: 0.01,
                        fromAddress:
                            '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                        fromAmount: '10000',
                    })
                    .throwsException(new QuoteNotFoundError('Quote not found'));

                //mock query ok
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getQuote')
                    .withArgs({
                        fromChainId: GOERLI_CHAIN_ID,
                        toChainId: 1,
                        fromTokenAddress:
                            '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                        toTokenAddress:
                            '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                        slippage: 0.01,
                        fromAddress:
                            '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                        fromAmount: '10000000000000000',
                    })
                    .returns(
                        mockPromiseResponse({
                            fromAmount: '10000000000000000',
                            fromChainId: GOERLI_CHAIN_ID,
                            toChainId: 1,
                            fromToken: {
                                address:
                                    '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                decimals: 18,
                                logo: 'logo1',
                                name: 'eth',
                                symbol: 'GETH',
                                type: '',
                            },
                            toAmount: '10000000000000000',
                            spender: 'spender_1_2_3',
                            toToken: {
                                address:
                                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                                decimals: 18,
                                logo: 'logo2',
                                name: 'eth',
                                symbol: 'ETH',
                                type: '',
                            },
                            transactionRequest: {
                                chainId: GOERLI_CHAIN_ID,
                                data: '123',
                                from: '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                                to: '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                                gasLimit: '200',
                                gasPrice: '200',
                                value: '1',
                            },
                        })
                    );

                sandbox
                    .stub(
                        ContractSignatureParser.prototype,
                        'getMethodSignature'
                    )
                    .returns(
                        Promise.resolve({
                            name: 'Bridge',
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
            });
            describe('Quotes without allowance check', () => {
                it('Should return QuoteNotFound error if there is no quote', async () => {
                    const err = await expectThrowsAsync(async () => {
                        await bridgeController.getQuote(
                            BridgeImplementation.LIFI_BRIDGE,
                            {
                                toChainId: 1,
                                fromTokenAddress: 'token_a_g',
                                toTokenAddress: 'random_token',
                                slippage: 0.01,
                                fromAddress:
                                    '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                                fromAmount: '10000',
                            }
                        );
                    });
                    expect(err).not.to.be.undefined;
                    expect(err).to.equal('Quote not found');
                });
                it('Should return a valid quote without checking allowance', async () => {
                    const quoteResponse = await bridgeController.getQuote(
                        BridgeImplementation.LIFI_BRIDGE,
                        {
                            toChainId: 1,
                            fromTokenAddress:
                                '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                            toTokenAddress:
                                '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                            slippage: 0.01,
                            fromAddress:
                                '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                            fromAmount: '10000000000000000',
                        }
                    );
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.NOT_CHECKED
                    );
                    const { quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
                    expect(quote.blockWalletFee.toNumber()).to.be.equal(0);
                    expect(quote.fromAmount).to.be.equal('10000000000000000');
                    expect(quote.toAmount).to.be.equal('10000000000000000');
                    expect(quote.transactionRequest.from).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quote.transactionRequest.to).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quoteResponse.bridgeParams.methodSignature).not.to.be
                        .undefined;
                });
            });
            describe('Check Allowance', () => {
                it('Should fail to check asset allowance', async () => {
                    sinon.stub(tokenOperationsController, 'allowance').returns(
                        new Promise<BigNumber>((resolve, reject) => {
                            // 1 BLANK
                            reject('Error');
                        })
                    );
                    const err = await expectThrowsAsync(async () => {
                        await bridgeController.getQuote(
                            BridgeImplementation.LIFI_BRIDGE,
                            {
                                toChainId: 1,
                                fromTokenAddress:
                                    '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                toTokenAddress:
                                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                                slippage: 0.01,
                                fromAddress:
                                    '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                                fromAmount: '10000000000000000',
                            },
                            true
                        );
                    });
                    expect(err).not.to.be.undefined;
                    expect(err).to.equal('Error checking asset allowance.');
                });
                it('Should return a insufficient allowance', async () => {
                    sinon.restore();
                    sinon.stub(tokenOperationsController, 'allowance').returns(
                        new Promise<BigNumber>((resolve, reject) => {
                            // 1 BLANK
                            resolve(BigNumber.from('20'));
                        })
                    );
                    const quoteResponse = await bridgeController.getQuote(
                        BridgeImplementation.LIFI_BRIDGE,
                        {
                            toChainId: 1,
                            fromTokenAddress:
                                '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                            toTokenAddress:
                                '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                            slippage: 0.01,
                            fromAddress:
                                '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                            fromAmount: '10000000000000000',
                        },
                        true
                    );
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.INSUFFICIENT_ALLOWANCE
                    );
                    const { quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
                    expect(quote.blockWalletFee.toNumber()).to.be.equal(0);
                    expect(quote.fromAmount).to.be.equal('10000000000000000');
                    expect(quote.toAmount).to.be.equal('10000000000000000');
                    expect(quote.transactionRequest.from).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quote.transactionRequest.to).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quoteResponse.bridgeParams.methodSignature).not.to.be
                        .undefined;
                });
                it('Should return enough allowance', async () => {
                    sinon.restore();
                    sinon.stub(tokenOperationsController, 'allowance').returns(
                        new Promise<BigNumber>((resolve, reject) => {
                            // 1 BLANK
                            resolve(BigNumber.from('10000000000000001'));
                        })
                    );
                    const quoteResponse = await bridgeController.getQuote(
                        BridgeImplementation.LIFI_BRIDGE,
                        {
                            toChainId: 1,
                            fromTokenAddress:
                                '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                            toTokenAddress:
                                '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
                            slippage: 0.01,
                            fromAddress:
                                '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                            fromAmount: '10000000000000000',
                        },
                        true
                    );
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.ENOUGH_ALLOWANCE
                    );
                    const { quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
                    expect(quote.blockWalletFee.toNumber()).to.be.equal(0);
                    expect(quote.fromAmount).to.be.equal('10000000000000000');
                    expect(quote.toAmount).to.be.equal('10000000000000000');
                    expect(quote.transactionRequest.from).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quote.transactionRequest.to).to.be.equal(
                        '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4'
                    );
                    expect(quoteResponse.bridgeParams.methodSignature).not.to.be
                        .undefined;
                });
            });
        });
        describe('Execute bridge', () => {});
    });
});
