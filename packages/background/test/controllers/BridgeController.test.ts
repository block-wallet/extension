import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BridgeController from '@block-wallet/background/controllers/BridgeController';
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
} from '@block-wallet/background/utils/bridgeApi';
import { IChain } from '@block-wallet/background/utils/types/chain';
import { expect } from 'chai';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';
import NETWORK_TOKENS_LIST from '@block-wallet/background/controllers/erc-20/TokenList';
import { IToken } from '@block-wallet/background/controllers/erc-20/Token';

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
        logoURI: '',
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
    let getChainsStub: SinonStub | null = null;
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
        getChainsStub = sandbox
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
                        logoURI: '',
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
        describe.only('Avaialable Routes', () => {
            afterEach(() => {
                sandbox.restore();
            });
            it('Should return empty routes for the specified parameters', async () => {
                sandbox
                    .stub(BridgeAPI.LIFI_BRIDGE, 'getRoutes')
                    .withArgs({
                        fromChainId: GOERLI_CHAIN_ID,
                        fromTokenAddress: 'token_a',
                        allowedExchanges: [],
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
                        allowedExchanges: [],
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
    });
});
