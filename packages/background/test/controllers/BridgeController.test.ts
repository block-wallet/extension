import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BridgeController, {
    BridgeAllowanceCheck,
    GetBridgeQuoteResponse,
    GetBridgeQuoteNotFoundResponse,
} from '@block-wallet/background/controllers/BridgeController';
import {
    TokenController,
    TokenControllerProps,
} from '@block-wallet/background/controllers/erc-20/TokenController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
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
import { BigNumber } from '@ethersproject/bignumber';
import { getChainListItem } from '@block-wallet/background/utils/chainlist';
import {
    BRIDGE_REFERRER_ADDRESS,
    LiFiErrorResponse,
} from '@block-wallet/background/utils/types/lifi';
import MOCKS from '../mocks/mock-bridge-operations';
import TokenAllowanceController from '@block-wallet/background/controllers/erc-20/transactions/TokenAllowanceController';
import { sleep } from '@block-wallet/background/utils/sleep';
import MockProvider from 'test/mocks/mock-provider';
import { TransactionStatus } from '@block-wallet/background/controllers/transactions/utils/types';
import { mockKeyringController } from 'test/mocks/mock-keyring-controller';
import { AccountTrackerController } from '@block-wallet/background/controllers/AccountTrackerController';
import { TransactionWatcherController } from '@block-wallet/background/controllers/TransactionWatcherController';

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
        logo: net.iconUrls?.length
            ? net.iconUrls[0]
            : getChainListItem(net.chainId)?.logo || '',
        name: net.desc,
        test: net.test,
    })
);

const GOERLI_CHAIN_ID = INITIAL_NETWORKS.GOERLI.chainId;

const SUPPORTED_GOERLI_TOKENS = Object.values(
    NETWORK_TOKENS_LIST[GOERLI_CHAIN_ID]
);

const mockPromiseResponse = <T>(r: T): Promise<T> =>
    new Promise((resolve) => resolve(r));

describe('Bridge Controller', () => {
    const quoteSandbox = sinon.createSandbox();
    const methodSignatureSandox = sinon.createSandbox();
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
    let tokenAllowanceController: TokenAllowanceController;
    let accountTrackerController: AccountTrackerController;
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

        tokenAllowanceController = new TokenAllowanceController(
            networkController,
            preferencesController,
            tokenOperationsController,
            transactionController
        );

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

        accountTrackerController = new AccountTrackerController(
            mockKeyringController,
            networkController,
            tokenController,
            tokenOperationsController,
            preferencesController,
            blockUpdatesController,
            new TransactionWatcherController(
                networkController,
                preferencesController,
                blockUpdatesController,
                tokenController,
                transactionController,
                { transactions: [], tokenAllowanceEvents: {} }
            ),
            transactionController
        );

        bridgeController = new BridgeController(
            networkController,
            transactionController,
            tokenController,
            tokenAllowanceController,
            accountTrackerController
        );
    });

    beforeEach(() => {
        methodSignatureSandox
            .stub(ContractSignatureParser.prototype, 'getMethodSignature')
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

    afterEach(function () {
        sandbox.restore();
        quoteSandbox.restore();
        methodSignatureSandox.restore();
    });

    describe('Li.Fi Aggregator', () => {
        describe('Available chains', () => {
            before(() => {
                networkController.setNetwork('goerli');
            });
            it('Should initialize the available chains correctly', () => {
                expect(
                    bridgeController.UIStore.getState().availableBridgeChains
                ).deep.equal(SUPPORTED_CHAINS);
            });
            it('Should update the available chains memory state correctly', async () => {
                const newChains = [
                    {
                        id: 909202920,
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
            before(() => {
                networkController.setNetwork('goerli');
            });
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
            before(() => {
                networkController.setNetwork('goerli');
            });
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
        describe('Quotes and Allowance', () => {
            before(() => {
                networkController.setNetwork('goerli');
            });
            beforeEach(() => {
                quoteSandbox.restore();
                //mock query ok
                quoteSandbox
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
                        referrer: BRIDGE_REFERRER_ADDRESS,
                    })
                    .returns(
                        mockPromiseResponse({
                            fromAmount: '10000000000000000',
                            fromChainId: GOERLI_CHAIN_ID,
                            toChainId: 1,
                            feeCosts: [],
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
                            slippage: 0.5,
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
                            tool: 'custom_tool',
                            estimatedDurationInSeconds: 200,
                        })
                    );
            });
            describe('Quotes without allowance check', () => {
                before(() => {
                    networkController.setNetwork('goerli');
                });
                it('Should return QuoteNotFound error if there is no quote', async () => {
                    quoteSandbox.restore();
                    const errorMessage =
                        'No available quotes for the requested transfer';
                    const errors: LiFiErrorResponse = {
                        message:
                            'No available quotes for the requested transfer',
                        code: 1002,
                        errors: {
                            filteredOut: [
                                {
                                    overallPath: '324:ETH-cbridge-42161:ETH',
                                    reason: 'Transferred amount (1000000000000000) out of acceptable range (min: 5000000000000001, max: 90000000000000000000)',
                                },
                            ],
                            failed: [
                                {
                                    overallPath:
                                        '324:ETH~324:ETH-324:ETH-across-42161:ETH',
                                    subpaths: {
                                        '324:ETH~324:ETH': [
                                            {
                                                errorType: 'NOT_FOUND',
                                                code: '123',
                                                action: {
                                                    fromChainId: 123,
                                                    toChainId: 123,
                                                    fromToken: {
                                                        address:
                                                            '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                                        decimals: 18,
                                                        chainId: 1,
                                                        name: 'eth',
                                                        symbol: 'GETH',
                                                        coinKey: 'coin',
                                                        priceUSD: 1,
                                                        logoURI: 'logo.png',
                                                    },
                                                    toToken: {
                                                        address:
                                                            '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                                        decimals: 18,
                                                        chainId: 1,
                                                        name: 'eth',
                                                        symbol: 'GETH',
                                                        coinKey: 'coin',
                                                        priceUSD: 2,
                                                        logoURI: 'logo.png',
                                                    },
                                                    fromAmount: 'asd',
                                                    slippage: 123,
                                                    toAddress:
                                                        '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
                                                },
                                                tool: 'tool',
                                                message: 'message',
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    };
                    quoteSandbox
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
                            referrer: BRIDGE_REFERRER_ADDRESS,
                        })
                        .throwsException(
                            new QuoteNotFoundError(
                                'No available quotes for the requested transfer',
                                errors
                            )
                        );

                    const quoteResponse = (await bridgeController.getQuote(
                        BridgeImplementation.LIFI_BRIDGE,
                        {
                            toChainId: 1,
                            fromTokenAddress: 'token_a_g',
                            toTokenAddress: 'random_token',
                            slippage: 0.01,
                            fromAddress:
                                '0x220bdA5c8994804Ac96ebe4DF184d25e5c2196D4',
                            fromAmount: '10000',
                            referrer: BRIDGE_REFERRER_ADDRESS,
                        }
                    )) as GetBridgeQuoteNotFoundResponse;
                    expect(quoteResponse).not.to.be.undefined;
                    expect(quoteResponse.message).to.equal(errorMessage);
                });
                it('Should return a valid quote without checking allowance', async () => {
                    sandbox.restore();
                    const quoteResponse = (await bridgeController.getQuote(
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
                    )) as GetBridgeQuoteResponse;
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.NOT_CHECKED
                    );
                    const { params: quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
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
                before(() => {
                    networkController.setNetwork('goerli');
                });
                it('Should fail to check asset allowance', async () => {
                    sandbox.restore();
                    sandbox
                        .stub(tokenOperationsController, 'allowance')
                        .returns(
                            new Promise<BigNumber>((_, reject) => {
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
                    sandbox.restore();
                    sandbox
                        .stub(tokenOperationsController, 'allowance')
                        .returns(
                            new Promise<BigNumber>((resolve, reject) => {
                                // 1 BLANK
                                resolve(BigNumber.from('20'));
                            })
                        );
                    const quoteResponse = (await bridgeController.getQuote(
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
                    )) as GetBridgeQuoteResponse;
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.INSUFFICIENT_ALLOWANCE
                    );
                    const { params: quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
                    expect(quote.fromAmount).to.be.equal('10000000000000000');
                    expect(quote.toAmount).to.be.equal('10000000000000000');
                    expect(quote.tool).to.be.equal('custom_tool');
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
                    sandbox.restore();
                    sandbox
                        .stub(tokenOperationsController, 'allowance')
                        .returns(
                            new Promise<BigNumber>((resolve, reject) => {
                                // 1 BLANK
                                resolve(BigNumber.from('10000000000000001'));
                            })
                        );
                    const quoteResponse = (await bridgeController.getQuote(
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
                    )) as GetBridgeQuoteResponse;
                    expect(quoteResponse.allowance).to.equal(
                        BridgeAllowanceCheck.ENOUGH_ALLOWANCE
                    );
                    const { params: quote } = quoteResponse.bridgeParams;
                    expect(quote).not.to.be.undefined;
                    expect(quote.fromAmount).to.be.equal('10000000000000000');
                    expect(quote.toAmount).to.be.equal('10000000000000000');
                    expect(quote.tool).to.be.equal('custom_tool');
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
        describe('Execute bridge', () => {
            const transactionControllerSandbox = sinon.createSandbox();
            const mainnetNetworkProviderSandox = sinon.createSandbox();
            const tokenControllerSandbox = sinon.createSandbox();
            const accountControllerSandbox = sinon.createSandbox();

            let mockMainnetProvider: ReturnType<typeof MockProvider>;
            const lifiSandbox = sinon.createSandbox();
            const sendTx = MOCKS.mockBridgeTransactionAfterAdd();
            const receivingTxByHash = MOCKS.mockGetReceivingTxByHash();
            let tokenControllerStubAttepmtAddToken: sinon.SinonSpy;

            beforeEach(async () => {
                networkController.setNetwork('polygon');
                //await for the provider to be initialized
                //tried with the networkController.waitUntilNetworkLoaded
                //but it is not working since the proivider is already "ready" for the old network.
                await sleep(100);
                accountControllerSandbox
                    .stub(accountTrackerController, 'updateAccounts')
                    .returns(Promise.resolve());
                tokenControllerStubAttepmtAddToken = tokenControllerSandbox.spy(
                    tokenController,
                    'attemptAddToken'
                );
                transactionControllerSandbox
                    .stub(transactionController, 'addTransaction')
                    .returns(
                        new Promise((resolve) => {
                            resolve({
                                result: new Promise((resolve) => {
                                    resolve(
                                        '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                                    );
                                }),
                                transactionMeta: sendTx,
                            });
                        })
                    );

                transactionControllerSandbox
                    .stub(transactionController, 'updateTransaction')
                    .returns();
                transactionControllerSandbox
                    .stub(transactionController, 'approveTransaction')
                    .returns(
                        new Promise((resolve) => {
                            resolve();
                        })
                    );
                transactionControllerSandbox
                    .stub(transactionController, 'getTransaction')
                    .withArgs(sendTx.id)
                    .returns(sendTx);
            });

            afterEach(() => {
                mainnetNetworkProviderSandox.restore();
                lifiSandbox.restore();
                tokenControllerSandbox.restore();
                transactionControllerSandbox.restore();
                accountControllerSandbox.restore();
            });

            it('Should not invoke add token if sending transaction has failed', async () => {
                const sendTxWithoutHash = {
                    ...sendTx,
                    transactionParams: {
                        ...sendTx.transactionParams,
                        hash: undefined,
                    },
                };
                transactionControllerSandbox.restore();
                transactionControllerSandbox
                    .stub(transactionController, 'addTransaction')
                    .returns(
                        new Promise((resolve) => {
                            resolve({
                                result: new Promise((resolve) => {
                                    resolve(
                                        '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                                    );
                                }),
                                transactionMeta: sendTxWithoutHash,
                            });
                        })
                    );

                transactionControllerSandbox
                    .stub(transactionController, 'approveTransaction')
                    .returns(
                        new Promise((resolve) => {
                            resolve();
                        })
                    );
                transactionControllerSandbox
                    .stub(transactionController, 'getTransaction')
                    .withArgs(sendTx.id)
                    .returns(sendTxWithoutHash);

                await bridgeController.executeBridge(
                    BridgeImplementation.LIFI_BRIDGE,
                    MOCKS.mockNewBridgeTransactionCallParameters()
                );

                expect(tokenControllerStubAttepmtAddToken.callCount).to.equal(
                    0
                );
            });

            it('Should submit a successful bridge transaction and wait for final state in an unknonw chain', async () => {
                mockMainnetProvider = MockProvider(
                    'mainnet',
                    mainnetNetworkProviderSandox
                );
                lifiSandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getStatus')
                    .returns(
                        Promise.resolve(
                            MOCKS.mockBridgeSuccessfulOperation(sendTx)
                        )
                    );
                mainnetNetworkProviderSandox
                    .stub(networkController, 'getProviderForChainId')
                    .withArgs(1)
                    .returns(undefined);

                const result = await bridgeController.executeBridge(
                    BridgeImplementation.LIFI_BRIDGE,
                    MOCKS.mockNewBridgeTransactionCallParameters()
                );

                //match sending tx parameters
                expect(result).not.to.be.undefined;
                expect(
                    tokenControllerStubAttepmtAddToken.callCount
                ).to.be.equal(1);
                expect(result).to.be.equal(
                    '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                );

                //wait for the full operation to be completed
                await sleep(300);

                const pendingIncomingTransactions =
                    bridgeController.store.getState()
                        .perndingBridgeReceivingTransactions[1][
                        '0x4A3CD1E36091a66cf6dea0A77dAd564fFC8547a1'
                    ];

                expect(pendingIncomingTransactions).not.to.be.undefined;
                expect(pendingIncomingTransactions).to.have.lengthOf(1);

                const firstPendingTx = pendingIncomingTransactions[0];

                expect(firstPendingTx.hash).to.equal(receivingTxByHash.hash);
                expect(firstPendingTx.toToken).not.to.be.undefined;
                expect(firstPendingTx.sendingTransactionId).to.equal(sendTx.id);
            });

            it('Should submit a successful bridge transaction and wait for final state in a known chain', async () => {
                mockMainnetProvider = MockProvider(
                    'mainnet',
                    mainnetNetworkProviderSandox
                );

                lifiSandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getStatus')
                    .returns(
                        Promise.resolve(
                            MOCKS.mockBridgeSuccessfulOperation(sendTx)
                        )
                    );

                mainnetNetworkProviderSandox
                    .stub(networkController, 'getProviderForChainId')
                    .withArgs(1)
                    .returns(mockMainnetProvider);

                //We need to do this to avoid ContractSignatureParser fail when creating a new instance.
                //As this class needs a provider to be injected, we set null to avoid replicating all prvoider methods.
                mainnetNetworkProviderSandox
                    .stub(networkController, 'getProviderFromName')
                    .withArgs('mainnet')
                    .returns(null as any);

                mockMainnetProvider.getTransaction.callsFake(
                    (transactionHash: string | Promise<string>) => {
                        expect(transactionHash).to.equal(
                            receivingTxByHash.hash
                        );
                        return Promise.resolve(receivingTxByHash) as any;
                    }
                );

                mockMainnetProvider.getBlock.callsFake((blockNumber) => {
                    expect(blockNumber).to.equal(receivingTxByHash.blockNumber);
                    return Promise.resolve({
                        hash: '0xa86600048ec06e339e3690f76caf1c1f404b83d410205a95b85ca842082c8c23',
                        parentHash:
                            '0xa86600048ec06e339e3690f76caf1c1f404b83d410205a95b85ca842082c8c22',
                        number: 24539324,
                        transactions: [],
                        timestamp: 1665404450000,
                        nonce: '20',
                        difficulty: 1,
                        _difficulty: BigNumber.from(10),
                        gasLimit: BigNumber.from(210000),
                        gasUsed: BigNumber.from(210000),
                        miner: '1',
                        extraData: '',
                    });
                });

                tokenControllerSandbox
                    .stub(tokenController, 'getToken')
                    .withArgs(
                        sendTx.bridgeParams?.toToken.address!,
                        sinon.match.string,
                        1
                    )
                    .callsFake(() => {
                        return Promise.resolve(
                            sendTx.bridgeParams?.toToken as IToken
                        );
                    });

                //mock
                mockMainnetProvider.getTransactionReceipt.callsFake(() => {
                    return Promise.resolve(MOCKS.mockGetReceivingTxReceipt());
                });

                const result = await bridgeController.executeBridge(
                    BridgeImplementation.LIFI_BRIDGE,
                    MOCKS.mockNewBridgeTransactionCallParameters()
                );

                //match sending tx parameters
                expect(result).not.to.be.undefined;
                //
                expect(tokenControllerStubAttepmtAddToken.called).to.be.true;
                expect(result).to.be.equal(
                    '0xee26207273811c16adfa74c3401361add6b1296102e57c7502431965dbc9af92'
                );

                //wait for the full operation to be completed
                await sleep(300);

                const bridgingIconmingTXs =
                    bridgeController.store.getState()
                        .bridgeReceivingTransactions[1][
                        '0x4A3CD1E36091a66cf6dea0A77dAd564fFC8547a1'
                    ];

                expect(bridgingIconmingTXs).not.to.be.undefined;
                expect(Object.keys(bridgingIconmingTXs)).to.have.lengthOf(1);

                const incomingBridgingTx =
                    bridgingIconmingTXs[receivingTxByHash.hash];

                expect(incomingBridgingTx).not.to.be.undefined;

                //block timestamp
                expect(incomingBridgingTx.confirmationTime).to.be.equal(
                    1665404450000000
                );

                expect(incomingBridgingTx.chainId).to.be.equal(1);
                expect(incomingBridgingTx.status).to.be.equal(
                    TransactionStatus.CONFIRMED
                );
                expect(incomingBridgingTx.bridgeParams).not.to.be.undefined;
                expect(incomingBridgingTx.bridgeParams?.role).to.be.equal(
                    'RECEIVING'
                );
                expect(
                    incomingBridgingTx.bridgeParams?.fromChainId
                ).to.be.equal(137);
            });
        });
    });
});
