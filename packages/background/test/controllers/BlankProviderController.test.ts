import AppStateController from '@block-wallet/background/controllers/AppStateController';
import BlankProviderController, {
    BlankProviderEvents,
} from '@block-wallet/background/controllers/BlankProviderController';
import KeyringControllerDerivated from '@block-wallet/background/controllers/KeyringControllerDerivated';
import NetworkController from '../../src/controllers/NetworkController';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import sinon from 'sinon';
import { AccountTrackerController } from '../../src/controllers/AccountTrackerController';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Contract } from '@ethersproject/contracts';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import {
    JSONRPCMethod,
    SubscriptionType,
    Block,
    DappReq,
    DappRequest,
    DappRequestParams,
} from '@block-wallet/background/utils/types/ethereum';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { TokenController } from '../../src/controllers/erc-20/TokenController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
import { TypedTransaction } from '@ethereumjs/tx';
import { expect } from 'chai';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import { hexValue } from '@ethersproject/bytes';
import { mockKeyringController } from '../mocks/mock-keyring-controller';
import { mockPreferencesController } from '../mocks/mock-preferences';
import { mockedPermissionsController } from '../mocks/mock-permissions';
import { blockResponseMock } from '../mocks/mock-block-response';
import { logsResponseMock } from '../mocks/mock-logs-response';
import { providerInstances } from '@block-wallet/background/infrastructure/connection';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { ExternalEventSubscription } from '@block-wallet/background/utils/types/communication';
import * as random from '@block-wallet/background/utils/randomBytes';
import { TransactionWatcherController } from '@block-wallet/background/controllers/TransactionWatcherController';
import * as ManifestUtils from '@block-wallet/background/utils/manifest';


const UNI_ORIGIN = 'https://app.uniswap.org';
const TX_HASH =
    '0x3979f7ae255171ae6c6fd1c625219b45e2da7e52e6401028c29f0f27581af601';
const TEXT_FOR_HASH = 'HASH ME';
describe('Blank Provider Controller', function () {




    const defaultIdleTimeout = 500000;
    const portId = '7e24f69d-c740-4eb3-9c6e-4d47df491005';
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

    providerInstances[portId] = {
        port: chrome.runtime.connect() as any,
        tabId: 420,
        windowId: 404,
        origin: UNI_ORIGIN,
        siteMetadata: {
            iconURL: 'https://app.uniswap.org/favicon.png',
            name: 'Uniswap',
        },
    };

    const signatureReq = {
        type: DappReq.SIGNING,
        params: {
            method: 'eth_signTypedData',
            params: {
                address: '0x413f3536eab14074e6b2a7813b22745E41368875',
                data: [
                    {
                        type: 'string',
                        name: 'Message',
                        value: 'Sup',
                    },
                    {
                        type: 'uint32',
                        name: 'A number',
                        value: '420',
                    },
                ],
            },
        },
        origin: UNI_ORIGIN,
        siteMetadata: {
            iconURL: 'https://app.uniswap.org/favicon.png',
            name: 'Uniswap',
        },
        time: 1643931146296,
        originId: portId,
    };

    const assetReq = {
        type: DappReq.ASSET,
        params: {
            params: {
                address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
                symbol: 'SUSHI',
                decimals: 18,
                image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6758.png',
            },
            activeAccount: '0x413f3536eab14074e6b2a7813b22745E41368875',
            isUpdate: false,
        },
        origin: UNI_ORIGIN,
        siteMetadata: {
            iconURL: 'https://app.uniswap.org/favicon.png',
            name: 'Uniswap',
        },
        time: 1643931147309,
        originId: portId,
    };

    const switchNetworkReq = {
        type: DappReq.SWITCH_NETWORK,
        params: {
            chainId: 42161,
        },
        origin: UNI_ORIGIN,
        siteMetadata: {
            iconURL: 'https://app.uniswap.org/favicon.png',
            name: 'Uniswap',
        },
        time: 1643932328836,
        originId: portId,
    };

    let accountTrackerController: AccountTrackerController;
    let appStateController: AppStateController;
    let blankProviderController: BlankProviderController;
    let gasPricesController: GasPricesController;
    let networkController: NetworkController;
    let permissionsController: PermissionsController;
    let preferencesController: PreferencesController;
    let tokenController: TokenController;
    let tokenOperationsController: TokenOperationsController;
    let transactionController: TransactionController;
    let blockUpdatesController: BlockUpdatesController;
    let transactionWatcherController: TransactionWatcherController;

    beforeEach(function () {
        sinon.stub(ManifestUtils, 'isManifestV3').returns(false)

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
        permissionsController = mockedPermissionsController;

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
                preferencesController: preferencesController,
                tokenOperationsController,
            }
        );

        appStateController = new AppStateController(
            {
                idleTimeout: defaultIdleTimeout,
                isAppUnlocked: true,
                lastActiveTime: new Date().getTime(),
                lockedByTimeout: false,
            },
            mockKeyringController,
            transactionController
        );

        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );

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

        transactionWatcherController = new TransactionWatcherController(
            networkController,
            preferencesController,
            blockUpdatesController,
            tokenController,
            transactionController,
            {
                transactions: {},
                tokenAllowanceEvents: {},
            }
        );

        accountTrackerController = new AccountTrackerController(
            mockKeyringController,
            networkController,
            tokenController,
            tokenOperationsController,
            preferencesController,
            blockUpdatesController,
            transactionWatcherController,
            transactionController
        );

        blankProviderController = new BlankProviderController(
            networkController,
            transactionController,
            mockedPermissionsController,
            appStateController,
            new KeyringControllerDerivated({}),
            tokenController,
            blockUpdatesController,
            gasPricesController
        );

        accountTrackerController.addPrimaryAccount(
            Wallet.createRandom().address
        );
    });



    this.afterEach(function () {
        sinon.restore();
    });

    it('Should init properly', () => {
        const { dappRequests } = blankProviderController.store.getState();
        expect(dappRequests).to.be.empty;
    });

    describe('Provider requests', () => {
        before(async () => {
            // Stub ethers methods
            sinon.stub(Contract, 'prototype').returns({
                balances: (
                    addresses: string[],
                    _ethBalance: string[]
                ): BigNumber[] => addresses.map(() => BigNumber.from('999')),
            } as any);
        });

        afterEach(function () {
            sinon.restore();
        });

        it('Should cancel all requests', async function () {
            blankProviderController.store.updateState({
                dappRequests: {
                    1: signatureReq as DappRequest<keyof DappRequestParams>,
                    2: assetReq,
                    3: switchNetworkReq,
                },
            });

            for (let i = 1; i < 4; i++) {
                blankProviderController['_requestHandlers'][`${i}`] = {
                    reject: (error: Error) => { },
                    resolve: (data: any) => { },
                };
            }

            let dappRequests =
                blankProviderController.store.getState().dappRequests;

            expect(dappRequests).to.be.not.empty;

            blankProviderController.cancelPendingDAppRequests();

            dappRequests =
                blankProviderController.store.getState().dappRequests;

            expect(dappRequests).to.be.empty;
        });

        it('Should get balance', async function () {
            sinon
                .stub(JsonRpcProvider.prototype, 'send')
                .returns(Promise.resolve('0x00'));
            const accountsController =
                accountTrackerController.store.getState().accounts;
            const targetAddress = Object.keys(accountsController)[0];
            const balance = BigNumber.from(0);
            const balanceWeb3 = await blankProviderController.handle(portId, {
                params: [targetAddress],
                method: JSONRPCMethod.eth_getBalance,
            });

            expect(balanceWeb3).to.be.equal(balance._hex);
        });

        it('Should fetch latest block number', async function () {
            blockUpdatesController.store.setState({
                blockData: { 5: { blockNumber: 5873086 } },
            });

            const web3latestBlockNr = parseInt(
                (await blankProviderController.handle(portId, {
                    method: JSONRPCMethod.eth_blockNumber,
                    params: [],
                })) as string
            );

            expect(web3latestBlockNr).to.be.equal(5873086);
        });

        it('Should fetch transaction count', async function () {
            sinon
                .stub(JsonRpcProvider.prototype, 'send')
                .returns(Promise.resolve(0));
            const accountsController =
                accountTrackerController.store.getState().accounts;
            const targetAddress = Object.keys(accountsController)[0];
            const transactionCountWeb3 = await blankProviderController.handle(
                portId,
                {
                    method: JSONRPCMethod.eth_getTransactionCount,
                    params: [targetAddress],
                }
            );

            expect(transactionCountWeb3).to.be.equal(0);
        });

        it('Should get transaction by hash', async function () {
            sinon.stub(JsonRpcProvider.prototype, 'send').returns(
                Promise.resolve({
                    blockHash:
                        '0x4262f108d324574999aac9e5d9500118732e252b600d71c44079dd25ad2e7ee1',
                    blockNumber: '0xd2d61b',
                    from: '0xd911f68222acff6f6036d98e2909f85f781d3a47',
                    gas: '0x2aea6',
                    gasPrice: '0x25fda44264',
                    maxFeePerGas: '0x2721e01771',
                    maxPriorityFeePerGas: '0x64f29720',
                    hash: '0x3979f7ae255171ae6c6fd1c625219b45e2da7e52e6401028c29f0f27581af601',
                    input: '0x7ff36ab500000000000000000000000000000000000000000000001990c704258d5b3bd90000000000000000000000000000000000000000000000000000000000000080000000000000000000000000d911f68222acff6f6036d98e2909f85f781d3a470000000000000000000000000000000000000000000000000000000061bb75890000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000041a3dba3d677e573636ba691a70ff2d606c29666',
                    nonce: '0x1',
                    to: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                    transactionIndex: '0x69',
                    value: '0x13fbe85edc90000',
                    type: '0x2',
                    accessList: [],
                    chainId: '0x1',
                    v: '0x0',
                    r: '0xc2fe0bda3cf75fe3ba24468ff1eeb7ba9e7cd6990a240ac9b6763f44100fd78',
                    s: '0x10f7879ba1451691e924280c3881066fa047e37aef50bcc15dfd8082ca099026',
                })
            );

            const web3Trx: any = await blankProviderController.handle(portId, {
                method: JSONRPCMethod.eth_getTransactionByHash,
                params: [TX_HASH],
            });

            expect(web3Trx.hash).to.be.equal(TX_HASH);
        });
    }).timeout(10000);

    describe('Wallet requests', () => {
        afterEach(function () {
            sinon.restore();
        });
        it('Should get accounts', async function () {
            const accounts = Object.keys(
                accountTrackerController.store.getState().accounts
            );

            sinon.stub(appStateController.UIStore, 'getState').returns({
                isAppUnlocked: true,
                lastActiveTime: new Date().getTime(),
                lockedByTimeout: false,
            });
            sinon.stub(appStateController.store, 'getState').returns({
                isAppUnlocked: true,
                lastActiveTime: new Date().getTime(),
                lockedByTimeout: false,
                idleTimeout: defaultIdleTimeout,
            });

            sinon.stub(permissionsController.store, 'getState').returns({
                permissions: {
                    'https://app.uniswap.org': {
                        accounts: accounts,
                        activeAccount: accounts[0],
                        data: { name: '', iconURL: '' },
                        origin: '',
                    },
                },
                permissionRequests: {},
            });

            const accountsWeb3 = await blankProviderController.handle(portId, {
                params: [],
                method: JSONRPCMethod.eth_accounts,
            });

            expect(accountsWeb3).to.deep.equal(
                permissionsController.store.getState().permissions[
                    'https://app.uniswap.org'
                ].accounts
            );
        });

        it('Should get chain id', async function () {
            const chainId = await blankProviderController.handle(portId, {
                params: [],
                method: JSONRPCMethod.eth_chainId,
            });

            const network = networkController.network;

            expect(chainId).to.be.equal(hexValue(network.chainId));
        });
    }).timeout(10000);

    describe('Utils', () => {
        afterEach(function () {
            sinon.restore();
        });
        it('Should hash sha3', async function () {
            const utilHash = keccak256(toUtf8Bytes(TEXT_FOR_HASH));

            const web3Hash = await blankProviderController.handle(portId, {
                method: JSONRPCMethod.web3_sha3,
                params: [TEXT_FOR_HASH],
            });

            expect(utilHash).to.be.equal(web3Hash);
        });
    });

    describe('Subscriptions', () => {
        afterEach(function () {
            sinon.restore();
        });
        it('Should notify a newHeads subscription about a new block correctly', async () => {
            sinon
                .stub(random, 'randomBytes')
                .returns(
                    Buffer.from('0x35501e05053203b4604e352baca93570', 'hex')
                );
            sinon.stub(NetworkController.prototype, 'getProvider').returns({
                send: (): Promise<Block> =>
                    new Promise((resolve) => resolve(blockResponseMock)),
                getBlock: (_blockNumber: number) =>
                    new Promise((resolve) =>
                        resolve({
                            gasLimit: BigNumber.from('88888'),
                        })
                    ),
            } as any);

            const callback = sinon.spy(
                (eventData: ExternalEventSubscription) => {
                    expect(eventData.portId).equal(1);
                    expect((eventData.payload as Block).hash).equal(
                        blockResponseMock.hash
                    );
                }
            );

            blankProviderController.on(
                BlankProviderEvents.SUBSCRIPTION_UPDATE,
                callback
            );

            const subId = await blankProviderController['_createSubscription'](
                [SubscriptionType.newHeads, undefined],
                '1'
            );
            await blankProviderController['_activeSubscriptions'][
                subId
            ].notification(1, 150000, 150001);
        });

        it('Should notify a logs subscription ', async () => {
            sinon
                .stub(random, 'randomBytes')
                .returns(
                    Buffer.from('0x35501e05053203b4604e352baca93570', 'hex')
                );
            sinon.stub(NetworkController.prototype, 'getProvider').returns({
                getLogs: (): Promise<typeof logsResponseMock> =>
                    new Promise((resolve) => resolve(logsResponseMock)),
            } as any);

            const callback = sinon.spy(
                (eventData: ExternalEventSubscription) => {
                    expect(eventData.portId).equal(1);
                    expect(
                        (eventData.payload as typeof logsResponseMock)
                            .transactionHash
                    ).equal(logsResponseMock.transactionHash);
                }
            );

            blankProviderController.on(
                BlankProviderEvents.SUBSCRIPTION_UPDATE,
                callback
            );

            const subId = await blankProviderController['_createSubscription'](
                [
                    SubscriptionType.logs,
                    {
                        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                        topics: ['0xf', '0xa', '0xb'],
                    },
                ],
                '1'
            );
            await blankProviderController['_activeSubscriptions'][
                subId
            ].notification(1, 150000, 150004);
        });
    });
});
