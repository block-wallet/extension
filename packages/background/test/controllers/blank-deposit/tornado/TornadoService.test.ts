import { expect } from 'chai';
import { BigNumber, ethers, providers, utils } from 'ethers';
import sinon from 'sinon';
import { babyJub, pedersenHash } from 'circomlib';

import { TornadoEvents } from '../../../../src/controllers/blank-deposit/tornado/config/ITornadoContract';
import { TornadoNotesService } from '../../../../src/controllers/blank-deposit/tornado/TornadoNotesService';
import { TornadoService } from '../../../../src/controllers/blank-deposit/tornado/TornadoService';
import {
    AvailableNetworks,
    CurrencyAmountPair,
    DepositStatus,
    KnownCurrencies,
} from '../../../../src/controllers/blank-deposit/types';
import NetworkController from '../../../../src/controllers/NetworkController';
import { PreferencesController } from '../../../../src/controllers/PreferencesController';
import {
    TransactionMeta,
    TransactionStatus,
} from '../../../../src/controllers/transactions/utils/types';
import { mockApiResponse } from '../../../mocks/mockApiResponse';
import mockEncryptor from '../../../mocks/mock-encryptor';
import { TornadoRelayerMock } from './mocks/TornadoRelayer.mock';
import { PendingWithdrawalStatus } from '../../../../src/controllers/blank-deposit/BlankDepositController';
import { mockPreferencesController } from '../../../mocks/mock-preferences';
import mockIndexedDB from './mocks/mockIndexedDB';

import {
    DepositEventsMock,
    WithdrawalEventsMock,
} from './mocks/EventsMock.mock';
import { TornadoEventsDB } from '../../../../src/controllers/blank-deposit/tornado/stores/TornadoEventsDB';
import { IDBPDatabase } from 'idb';
import { IBlankDeposit } from '../../../../src/controllers/blank-deposit/BlankDeposit';
import { TokenController } from '../../../../src/controllers/erc-20/TokenController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import { ApproveTransaction } from '@block-wallet/background/controllers/erc-20/transactions/ApproveTransaction';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import {
    GasPriceLevels,
    GasPricesController,
} from '@block-wallet/background/controllers/GasPricesController';
import { mockedPermissionsController } from '../../../mocks/mock-permissions';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../../../mocks/mock-network-instance';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import { TornadoEventsService } from '@block-wallet/background/controllers/blank-deposit/tornado/TornadoEventsService';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import {
    Deposit,
    Withdrawal,
} from '@block-wallet/background/controllers/blank-deposit/tornado/stores/ITornadoEventsDB';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';

describe('TornadoService', () => {
    // Re-mock IndexedDb on each test
    if (typeof process === 'object') {
        mockIndexedDB();
    }

    const testPass = 'test_pass';
    const mnemonic =
        'reject hood palace sad female review depth camp clown peace social real behave rib ability cereal grab illness settle process gate lizard uniform glimpse';

    const accounts = {
        goerli: [
            {
                key: '',
                address: '',
            },
            {
                key: '',
                address: '',
            },
        ],
    };

    let networkController: NetworkController;
    let transactionController: TransactionController;
    let preferencesController: PreferencesController;
    let tokenController: TokenController;
    let tornadoEventsDB: TornadoEventsDB;
    let tornadoService: TornadoService;
    let tokenOperationsController: TokenOperationsController;
    let permissionsController: PermissionsController;
    let gasPricesController: GasPricesController;
    let blockUpdatesController: BlockUpdatesController;
    let tornadoEventsService: TornadoEventsService;
    let mockedContract: {
        filters: { Deposit: () => string; Withdrawal: () => void };
        queryFilter: (filter: TornadoEvents, ...args: any) => any;
    };

    beforeEach(async () => {
        preferencesController = mockPreferencesController;
        networkController = getNetworkControllerInstance();

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );

        permissionsController = mockedPermissionsController;
        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );

        mockedContract = {
            filters: {
                Deposit: () => {
                    return 'Deposit';
                },
                Withdrawal: () => {
                    'Withdrawal';
                },
            },
            queryFilter: (filter: TornadoEvents, ...args: any) => {
                return filter === TornadoEvents.DEPOSIT
                    ? DepositEventsMock.events
                    : WithdrawalEventsMock.events;
            },
        };

        tornadoEventsDB = new TornadoEventsDB('test-db');
        await tornadoEventsDB.createStoreInstances();

        // Clear dbs on each run
        clearDbs(tornadoEventsDB);

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
                preferencesController,
                networkController,
                tokenOperationsController,
            }
        );

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

        tornadoEventsService = new TornadoEventsService({
            endpoint: 'http://localhost:8080',
            version: 'v1',
            blockUpdatesController,
        });

        tornadoService = new TornadoService({
            networkController,
            preferencesController,
            tokenOperationsController,
            tornadoEventsDB,
            transactionController:
                transactionController as unknown as TransactionController,
            gasPricesController,
            tokenController,
            encryptor: mockEncryptor,
            initialState: {
                pendingWithdrawals: {
                    mainnet: { pending: [] },
                    goerli: { pending: [] },
                    polygon: { pending: [] },
                    arbitrum: { pending: [] },
                    avalanchec: { pending: [] },
                    bsc: { pending: [] },
                    optimism: { pending: [] },
                    xdai: { pending: [] },
                },
                vaultState: { vault: '' },
            },
            tornadoEventsService,
        });
        await (tornadoService as any).initDepositsIndexedDb();

        tornadoService['_notesService']['workerRunner'] = {
            run: async ({ name, data }: { name: string; data: string }) => {
                if (name === 'pedersenHash') {
                    return babyJub.unpackPoint(
                        pedersenHash.hash(Buffer.from(data, 'hex'))
                    )[0];
                }
            },
        } as any;

        await tornadoService.initializeVault(testPass);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should calculate the fees and total values correctly for 1 ETH', async () => {
        await tornadoService.unlock(testPass, mnemonic);
        const { total, fee } = tornadoService.calculateFeeAndTotal(
            { amount: '1', currency: KnownCurrencies.ETH },
            0.3,
            {
                average: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
                slow: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
            },
            {
                dai: '283482591704018',
                cdai: '6066623185041',
                usdc: '282800357455943',
                usdt: '283794295053285',
                wbtc: '16207614089077625466',
            }
        );

        expect(total.toString()).to.be.equal(utils.parseEther('1').toString());
        expect(fee.toString()).to.be.equal('59017500000000000');
    }).timeout(60000);

    it('Should calculate the fees and total values correctly for 100 DAI', async () => {
        await tornadoService.unlock(testPass, mnemonic);
        const { total, fee } = tornadoService.calculateFeeAndTotal(
            { amount: '100', currency: KnownCurrencies.DAI },
            0.3,
            {
                average: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
                slow: {
                    gasPrice: BigNumber.from('97000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                },
            },
            {
                dai: '283482591704018',
                cdai: '6066623185041',
                usdc: '282800357455943',
                usdt: '283794295053285',
                wbtc: '16207614089077625466',
            }
        );

        expect(total.toString()).to.be.equal(
            utils.parseUnits('100', 18).toString()
        );
        expect(fee.toString()).to.be.equal('197904726495824626006');
    }).timeout(60000);

    it('Should drop the unsubmitted pending withdrawals and transition them to FAILED', async () => {
        await tornadoService.unlock(testPass, mnemonic);
        const deposits: IBlankDeposit[] = [
            {
                id: '1',
                depositIndex: 1,
                note: '0abb21233921',
                nullifierHex: '0x1',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.CONFIRMED,
                timestamp: new Date().getTime(),
                spent: false,
                depositAddress: '0xa',
            },
            {
                id: '2',
                depositIndex: 2,
                note: '0cdd35333935',
                nullifierHex: '0x2',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.CONFIRMED,
                timestamp: new Date().getTime(),
                spent: false,
                depositAddress: '0xb',
            },
            {
                id: '3',
                depositIndex: 3,
                note: '0bff55555955',
                nullifierHex: '0x3',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.CONFIRMED,
                timestamp: new Date().getTime(),
                spent: false,
                depositAddress: '0xc',
            },
        ];

        deposits.forEach(
            async (d) =>
                await tornadoService['addPendingWithdrawal'](d, '', 18, '')
        );

        let pendingWithdrawals =
            tornadoService['_pendingWithdrawalsStore'].store.getState().goerli
                .pending;

        pendingWithdrawals.forEach((p) =>
            expect(p.status).to.be.equal(PendingWithdrawalStatus.UNSUBMITTED)
        );

        // Drop all UNSUBMITTED
        await tornadoService['dropUnsubmittedWithdrawals']();

        pendingWithdrawals =
            tornadoService['_pendingWithdrawalsStore'].store.getState().goerli
                .pending;

        pendingWithdrawals.forEach((p) =>
            expect(p.status).to.be.equal(PendingWithdrawalStatus.FAILED)
        );
    }).timeout(60000);

    it('Should drop the failed deposit', async () => {
        await tornadoService.unlock(testPass, mnemonic);
        const deposits: IBlankDeposit[] = [
            {
                id: '1',
                depositIndex: 1,
                note: '0abb21233921',
                nullifierHex: '0x1',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.PENDING,
                timestamp: new Date().getTime(),
                spent: false,
                depositAddress: '0xa',
            },
            {
                id: '2',
                depositIndex: 2,
                note: '0cdd35333935',
                nullifierHex: '0x2',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.FAILED,
                timestamp: new Date().getTime(),
                spent: false,
                depositAddress: '0xb',
            },
        ];

        await tornadoService['_blankDepositVault']['addDeposits'](deposits);
        let vaultDeposits = await tornadoService.getDeposits();
        expect(vaultDeposits.length).to.be.equal(2);

        await tornadoService['_blankDepositVault']['dropFailedDeposit']('2');
        vaultDeposits = await tornadoService.getDeposits();

        expect(vaultDeposits.length).to.be.equal(1);
        expect(vaultDeposits[0].id).to.be.equal('1');
    }).timeout(60000);

    it('Should fetch the tornado Deposit events correctly and store them in the events store', async () => {
        sinon.stub(tornadoEventsService, 'getDeposits').returns(
            new Promise<Deposit[]>((resolve) => {
                resolve([
                    {
                        blockNumber: 1,
                        commitment: 'c',
                        leafIndex: 1,
                        timestamp: '1',
                        transactionHash: 't',
                    },
                    {
                        blockNumber: 2,
                        commitment: 'c',
                        leafIndex: 2,
                        timestamp: '1',
                        transactionHash: 't',
                    },
                ]);
            })
        );

        let storedDeposits = await (
            tornadoService as any
        )._tornadoEventsDb.getAllEvents(TornadoEvents.DEPOSIT, 'goerli', {
            currency: KnownCurrencies.ETH,
            amount: '1',
        } as CurrencyAmountPair);

        expect(storedDeposits.length).to.be.equal(0);

        // Query deposits once
        await (tornadoService as any).updateTornadoEvents(
            TornadoEvents.DEPOSIT,
            {
                currency: KnownCurrencies.ETH,
                amount: '1',
            } as CurrencyAmountPair,
            mockedContract
        );

        storedDeposits = await (
            tornadoService as any
        )._tornadoEventsDb.getAllEvents(TornadoEvents.DEPOSIT, 'goerli', {
            currency: KnownCurrencies.ETH,
            amount: '1',
        } as CurrencyAmountPair);

        expect(storedDeposits.length).to.be.equal(2);

        const lastQueriedBlock = await (
            tornadoService as any
        )._tornadoEventsDb.getLastQueriedBlock(
            TornadoEvents.DEPOSIT,
            'goerli',
            {
                currency: KnownCurrencies.ETH,
                amount: '1',
            } as CurrencyAmountPair
        );
        expect(lastQueriedBlock).to.be.equal(2);
    }).timeout(60000);

    it('Should fetch the tornado Withdrawal events correctly and store them in the events store', async () => {
        sinon.stub(tornadoEventsService, 'getWithdrawals').returns(
            new Promise<Withdrawal[]>((resolve) => {
                resolve([
                    {
                        blockNumber: 1,
                        fee: ethers.constants.Zero,
                        nullifierHex: 'n1',
                        to: 't1',
                        transactionHash: 'h1',
                    },
                    {
                        blockNumber: 2,
                        fee: ethers.constants.Zero,
                        nullifierHex: 'n2',
                        to: 't2',
                        transactionHash: 'h2',
                    },
                    {
                        blockNumber: 3,
                        fee: ethers.constants.Zero,
                        nullifierHex: 'n3',
                        to: 't3',
                        transactionHash: 'h3',
                    },
                ]);
            })
        );

        let storedWithdrawalsEvents = await (
            tornadoService as any
        )._tornadoEventsDb.getAllEvents(TornadoEvents.WITHDRAWAL, 'goerli', {
            currency: KnownCurrencies.ETH,
            amount: '1',
        } as CurrencyAmountPair);

        expect(storedWithdrawalsEvents.length).to.be.equal(0);

        // Query withdrawals events once
        await (tornadoService as any).updateTornadoEvents(
            TornadoEvents.WITHDRAWAL,
            {
                currency: KnownCurrencies.ETH,
                amount: '1',
            } as CurrencyAmountPair,
            mockedContract
        );

        storedWithdrawalsEvents = await (
            tornadoService as any
        )._tornadoEventsDb.getAllEvents(TornadoEvents.WITHDRAWAL, 'goerli', {
            currency: KnownCurrencies.ETH,
            amount: '1',
        } as CurrencyAmountPair);

        expect(storedWithdrawalsEvents.length).to.be.equal(3);

        const lastQueriedBlock = await (
            tornadoService as any
        )._tornadoEventsDb.getLastQueriedBlock(
            TornadoEvents.WITHDRAWAL,
            'goerli',
            {
                currency: KnownCurrencies.ETH,
                amount: '1',
            } as CurrencyAmountPair
        );
        expect(lastQueriedBlock).to.be.equal(3);
    }).timeout(60000);

    it('Should initialize the vault correctly', async () => {
        await tornadoService.unlock(testPass, mnemonic);
        const deposits = await tornadoService.getDeposits();
        expect(deposits.length).to.be.equals(0);
    }).timeout(60000);

    it('Should throw trying to get deposits because vault not unlocked', async () => {
        let err;
        try {
            await tornadoService.getDeposits();
        } catch (error) {
            err = error;
        }
        expect(err).to.be.an('error').with.property('message', 'Vault locked');
    }).timeout(60000);

    it('Should add and wait for confirmation a deposit for 100 DAI correctly', async () => {
        sinon.stub(transactionController, 'waitForTransactionResult').returns(
            new Promise((resolve) => {
                resolve('0x1822912');
            })
        );

        sinon
            .stub(transactionController, 'approveTransaction')
            .callsFake(() => new Promise((resolve) => resolve()));

        sinon
            .stub(networkController, 'getEIP1559Compatibility')
            .callsFake(() => new Promise((resolve) => resolve(false)));

        sinon.stub(TornadoNotesService.prototype, 'getNextFreeDeposit').returns(
            new Promise((resolve) => {
                resolve({
                    nextDeposit: {
                        deposit: {
                            commitmentHex:
                                '0x18e19b6277a82d73bfcd2588102fbf2e20738c4253e3d6afbcae6ddd39a5e6f8',
                            preImage: Buffer.from(
                                '0000123982190139081928398132',
                                'hex'
                            ),
                        } as any,
                        pair: {
                            amount: '100',
                            currency: KnownCurrencies.DAI,
                        },
                    },
                });
            })
        );

        sinon
            .stub(TokenOperationsController.prototype, 'allowance')
            .returns(Promise.resolve(BigNumber.from('100000000000000000000')));

        sinon
            .stub(ApproveTransaction.prototype, 'do')
            .returns(Promise.resolve(true));

        await tornadoService.unlock(testPass, mnemonic);
        await tornadoService.deposit(
            {
                currency: KnownCurrencies.DAI,
                amount: '100',
            },
            {
                gasPrice: BigNumber.from('1000000000'),
            }
        );

        let deposits = await tornadoService.getDeposits();

        expect(deposits.length).to.be.equals(1);

        const meta = transactionController.store.getState().transactions[0];
        expect(meta).to.not.be.undefined;

        sinon.stub(networkController, 'getProvider').returns({
            network: {
                chainId: 5,
                name: 'goerli',
            },
        } as any);
        await tornadoService['processPendingDeposit'](meta!);

        deposits = await tornadoService.getDeposits();

        expect(deposits[0].pair.currency).to.be.equals(KnownCurrencies.DAI);
        expect(deposits[0].pair.amount).to.be.equals('100');
        expect(deposits[0].note).to.be.equals('0000123982190139081928398132');
        expect(deposits[0].spent).to.be.equals(false);
        expect(deposits[0].status).to.be.equals(DepositStatus.CONFIRMED);
    }).timeout(60000);

    it('Should fail to make a deposit for not having allowance', async () => {
        sinon.stub(transactionController, 'waitForTransactionResult').returns(
            new Promise((resolve) => {
                resolve('0x1822912');
            })
        );

        sinon
            .stub(transactionController, 'approveTransaction')
            .callsFake(() => new Promise((resolve) => resolve()));

        sinon
            .stub(networkController, 'getEIP1559Compatibility')
            .callsFake(() => new Promise((resolve) => resolve(false)));

        sinon.stub(TornadoNotesService.prototype, 'getNextFreeDeposit').returns(
            new Promise((resolve) => {
                resolve({
                    nextDeposit: {
                        deposit: {
                            commitmentHex:
                                '0x18e19b6277a82d73bfcd2588102fbf2e20738c4253e3d6afbcae6ddd39a5e6f8',
                            preImage: Buffer.from(
                                '0000123982190139081928398132',
                                'hex'
                            ),
                        } as any,
                        pair: {
                            amount: '100',
                            currency: KnownCurrencies.DAI,
                        },
                    },
                });
            })
        );

        sinon
            .stub(TokenOperationsController.prototype, 'allowance')
            .returns(Promise.resolve(BigNumber.from('0')));

        sinon
            .stub(ApproveTransaction.prototype, 'do')
            .returns(Promise.resolve(true));

        await tornadoService.unlock(testPass, mnemonic);

        const checkDepositError = async (): Promise<string | null> => {
            try {
                await tornadoService.deposit(
                    {
                        currency: KnownCurrencies.DAI,
                        amount: '100',
                    },
                    {
                        gasPrice: BigNumber.from('1000000000'),
                    }
                );

                return null;
            } catch (error) {
                return error.message || error;
            }
        };

        const depositError = await checkDepositError();

        expect(depositError).not.to.be.null;
        expect(depositError).to.be.equal(
            'Not enough allowance to process this deposit'
        );
    }).timeout(5000);

    it('Should add and wait for confirmation a deposit for 1 eth correctly', async () => {
        sinon.stub(transactionController, 'waitForTransactionResult').returns(
            new Promise((resolve) => {
                resolve('0x1822912');
            })
        );

        sinon
            .stub(transactionController, 'approveTransaction')
            .callsFake(() => new Promise((resolve) => resolve()));

        sinon
            .stub(networkController, 'getEIP1559Compatibility')
            .callsFake(() => new Promise((resolve) => resolve(false)));

        sinon.stub(TornadoNotesService.prototype, 'getNextFreeDeposit').returns(
            new Promise((resolve) => {
                resolve({
                    nextDeposit: {
                        deposit: {
                            commitmentHex:
                                '0x18e19b6277a82d73bfcd2588102fbf2e20738c4253e3d6afbcae6ddd39a5e6f8',
                            preImage: Buffer.from(
                                '0000123982190139081928398132',
                                'hex'
                            ),
                        } as any,
                        pair: {
                            amount: '1',
                            currency: KnownCurrencies.ETH,
                        },
                    },
                });
            })
        );

        await tornadoService.unlock(testPass, mnemonic);
        await tornadoService.deposit(
            {
                currency: KnownCurrencies.ETH,
                amount: '1',
            },
            {
                gasPrice: BigNumber.from('1000000000'),
            }
        );

        let deposits = await tornadoService.getDeposits();

        expect(deposits.length).to.be.equals(1);

        const meta = transactionController.store.getState().transactions[0];
        expect(meta).to.not.be.undefined;

        sinon.stub(networkController, 'getProvider').returns({
            network: {
                chainId: 5,
                name: 'goerli',
            },
        } as any);
        await tornadoService['processPendingDeposit'](meta!);

        deposits = await tornadoService.getDeposits();

        expect(deposits.length).to.be.equals(1);
        expect(deposits[0].note).to.be.equals('0000123982190139081928398132');
        expect(deposits[0].spent).to.be.equals(false);
        expect(deposits[0].status).to.be.equals(DepositStatus.CONFIRMED);
    }).timeout(60000);

    it('Should update pending deposits to its correspondent status correctly', async () => {
        sinon
            .stub(ethers.providers.StaticJsonRpcProvider.prototype, 'network')
            .returns({
                chainId: 5,
            });

        await tornadoService.unlock(testPass, mnemonic);
        const deposits: IBlankDeposit[] = [
            {
                id: '1',
                depositIndex: 1,
                note: '0abb21233921',
                nullifierHex: '0x1',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.PENDING,
                timestamp: 1621286532764,
                spent: false,
                depositAddress: '0xa',
            },
            {
                id: '2',
                depositIndex: 2,
                note: '0cdd35333935',
                nullifierHex: '0x2',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.PENDING,
                timestamp: 1621286545673,
                spent: false,
                depositAddress: '0xb',
            },
        ];

        await tornadoService['_blankDepositVault']['addDeposits'](deposits);

        sinon
            .stub(transactionController, 'getBlankDepositTransactions')
            .returns([
                {
                    id: '1',
                    blankDepositId: '1',
                    status: TransactionStatus.CONFIRMED,
                    chainId: 5,
                } as TransactionMeta,
                {
                    id: '2',
                    blankDepositId: '2',
                    status: TransactionStatus.FAILED,
                    chainId: 5,
                } as TransactionMeta,
            ]);

        sinon.stub(transactionController, 'waitForTransactionResult');

        await tornadoService['checkCurrentNetworkPendingDeposits']();

        const updatedDeposits = (await tornadoService.getDeposits()).sort(
            (a, b) => a.timestamp - b.timestamp
        );
        expect(updatedDeposits.length).to.be.equal(2);
        expect(updatedDeposits[0].status).to.be.equal(DepositStatus.CONFIRMED);
        expect(updatedDeposits[1].status).to.be.equal(DepositStatus.FAILED);
    }).timeout(60000);

    it('Should process submitted but non confirmed deposits correctly', async () => {
        sinon
            .stub(ethers.providers.StaticJsonRpcProvider.prototype, 'network')
            .get(() => ({
                chainId: 5,
            }));

        await tornadoService.unlock(testPass, mnemonic);
        const deposits: IBlankDeposit[] = [
            {
                id: '1',
                depositIndex: 1,
                note: '0abb21233921',
                nullifierHex: '0x1',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.PENDING,
                timestamp: 1621286532764,
                spent: false,
                depositAddress: '0xa',
                chainId: 5,
            },
            {
                id: '2',
                depositIndex: 2,
                note: '0cdd35333935',
                nullifierHex: '0x2',
                pair: { amount: '1', currency: KnownCurrencies.ETH },
                status: DepositStatus.PENDING,
                timestamp: 1621286545673,
                spent: false,
                depositAddress: '0xb',
                chainId: 5,
            },
        ];

        await tornadoService['_blankDepositVault']['addDeposits'](deposits);

        const metas = [
            {
                id: '1',
                blankDepositId: '1',
                status: TransactionStatus.SUBMITTED,
                chainId: 5,
            } as TransactionMeta,
            {
                id: '2',
                blankDepositId: '2',
                status: TransactionStatus.SUBMITTED,
                chainId: 5,
            } as TransactionMeta,
        ];

        sinon
            .stub(transactionController, 'waitForTransactionResult')
            .onFirstCall()
            .returns(
                new Promise((resolve) => {
                    resolve('0x1822912');
                })
            )
            .onSecondCall()
            .throws();

        for (const meta of metas) {
            await tornadoService['processPendingDeposit'](meta);
        }

        const updatedDeposits = (await tornadoService.getDeposits()).sort(
            (a, b) => a.timestamp - b.timestamp
        );
        expect(updatedDeposits.length).to.be.equal(2);
        expect(updatedDeposits[0].status).to.be.equal(DepositStatus.CONFIRMED);
        expect(updatedDeposits[1].status).to.be.equal(DepositStatus.FAILED);
    }).timeout(60000);

    it('Should withdraw 1 eth correctly', async () => {
        sinon
            .stub(NetworkController.prototype, 'waitForTransaction')
            .returns(new Promise((resolve) => resolve({} as any)));

        sinon.stub(gasPricesController, 'getGasPricesLevels').returns({
            slow: { gasPrice: BigNumber.from('1000000000') },
            average: { gasPrice: BigNumber.from('2000000000') },
            fast: { gasPrice: BigNumber.from('97000000000') },
        } as GasPriceLevels);

        sinon.stub(tornadoService as any, 'getRelayerStatus').returns(
            new Promise((resolve) =>
                resolve({
                    ...TornadoRelayerMock.json(),
                    relayerUrl: 'goerli-relayer.network',
                    networkName: 'goerli',
                    health: {
                        status: true,
                        error: '',
                    },
                })
            )
        );

        sinon
            .stub(TornadoNotesService.prototype, 'generateProof')
            .returns(
                new Promise((resolve) => resolve({ proof: '', args: [''] }))
            );

        global.fetch = sinon
            .stub()
            .returns(
                new Promise((resolve) =>
                    resolve(mockApiResponse({ id: '129308213' }))
                )
            );

        sinon
            .stub(tornadoService as any, 'checkPendingWithdrawal')
            .returns(Promise.resolve());

        sinon
            .stub(TornadoService.prototype as any, 'getStatusFromRelayerJob')
            .returns(
                Promise.resolve({
                    txHash: '0x289189',
                    status: PendingWithdrawalStatus.CONFIRMED,
                })
            );

        await tornadoService.unlock(testPass, mnemonic);

        const deposit: IBlankDeposit = {
            id: '12345678',
            note: Buffer.alloc(62, 'f').toString('hex'),
            nullifierHex:
                '0x21315e4bfbfe7cff7a31e14546b96abdfacf2281cb938beddce4f89fc132ba60',
            pair: { amount: '1', currency: KnownCurrencies.ETH },
            timestamp: new Date().getTime(),
            spent: false,
            depositIndex: 0,
            status: DepositStatus.CONFIRMED,
            chainId: 5,
        };

        await (tornadoService as any)['_blankDepositVault'].addDeposits([
            deposit,
        ]);

        let unspentCount = await tornadoService.getUnspentDepositCount({
            currency: KnownCurrencies.ETH,
            amount: '1',
        });

        expect(unspentCount).to.be.equal(1);

        await tornadoService.withdraw(
            deposit,
            preferencesController.getSelectedAddress()
        );

        let pendingWithdrawals =
            tornadoService['_pendingWithdrawalsStore'].store.getState()[
                AvailableNetworks.GOERLI
            ];

        expect(pendingWithdrawals.pending[0].depositId).to.be.equal('12345678');
        expect(pendingWithdrawals.pending[0].status).to.be.equal(
            PendingWithdrawalStatus.UNSUBMITTED
        );

        const parsedDeposit = await tornadoService[
            '_notesService'
        ].parseDeposit(deposit.note);
        await tornadoService['processWithdrawal'](
            deposit,
            parsedDeposit,
            'goerli-relayer.network',
            preferencesController.getSelectedAddress(),
            '0x7542Be8193A34b984903A92e36e8c6F5a4A63c17',
            BigNumber.from('53925000000000000'),
            pendingWithdrawals.pending[0]
        );

        pendingWithdrawals =
            tornadoService['_pendingWithdrawalsStore'].store.getState()[
                AvailableNetworks.GOERLI
            ];

        expect(pendingWithdrawals.pending[0].depositId).to.be.equal('12345678');
        expect(pendingWithdrawals.pending[0].jobId).to.be.equal('129308213');
        expect(pendingWithdrawals.pending[0].status).to.be.equal(
            PendingWithdrawalStatus.PENDING
        );
    }).timeout(60000);

    it('Should update the state of a pending deposit withdrawal and transition it to spent', async () => {
        sinon
            .stub(TornadoService.prototype as any, 'getStatusFromRelayerJob')
            .returns(
                Promise.resolve({
                    txHash: '0x289189',
                    status: PendingWithdrawalStatus.CONFIRMED,
                })
            );
        sinon
            .stub(
                transactionController['_contractSignatureParser'],
                'fetchABIFromEtherscan'
            )
            .returns(Promise.resolve(undefined));
        sinon
            .stub(transactionController['_contractSignatureParser'], 'lookup')
            .returns(Promise.resolve(['multicall(uint256,bytes[])']));
        sinon
            .stub(
                ethers.providers.StaticJsonRpcProvider.prototype,
                'getTransaction'
            )
            .returns(
                Promise.resolve({
                    blockNumber: 1,
                    timestamp: new Date().getTime() / 1000,
                } as any)
            );
        sinon
            .stub(
                ethers.providers.StaticJsonRpcProvider.prototype,
                'waitForTransaction'
            )
            .returns(Promise.resolve({} as any));

        // Unlock vault
        await tornadoService.unlock(testPass, mnemonic);

        const deposit: IBlankDeposit = {
            id: '12345678',
            note: Buffer.alloc(62, 'f').toString('hex'),
            nullifierHex:
                '0x21315e4bfbfe7cff7a31e14546b96abdfacf2281cb938beddce4f89fc132ba60',
            pair: { amount: '1', currency: KnownCurrencies.ETH },
            timestamp: new Date().getTime(),
            spent: false,
            depositIndex: 0,
            status: DepositStatus.CONFIRMED,
            chainId: 5,
        };

        // Add deposit
        await (tornadoService as any)['_blankDepositVault'].addDeposits([
            deposit,
        ]);

        let unspentCount = await tornadoService.getUnspentDepositCount({
            currency: KnownCurrencies.ETH,
            amount: '1',
        });

        expect(unspentCount).to.be.equal(1);

        // Add to pending withdrawal
        let pending = await tornadoService['addPendingWithdrawal'](
            deposit,
            '0xabc',
            18,
            'goerli.blockwallet.io'
        );
        pending.chainId = 5;

        expect(pending.status).to.be.equal(PendingWithdrawalStatus.UNSUBMITTED);

        await tornadoService['updatePendingWithdrawal'](pending.pendingId, {
            status: PendingWithdrawalStatus.PENDING,
            chainId: 5,
        });

        let pendingWithdrawals =
            tornadoService['_pendingWithdrawalsStore'].store.getState()[
                AvailableNetworks.GOERLI
            ];

        pending = pendingWithdrawals.pending[0];
        pending.chainId = 5;

        // Check for it
        await tornadoService['checkPendingWithdrawal'](pending);

        pendingWithdrawals = (
            tornadoService as any
        )._pendingWithdrawalsStore.store.getState()[AvailableNetworks.GOERLI];

        expect(pendingWithdrawals.pending[0].status).to.be.equals(
            PendingWithdrawalStatus.CONFIRMED
        );

        unspentCount = await tornadoService.getUnspentDepositCount({
            currency: KnownCurrencies.ETH,
            amount: '1',
        });

        expect(unspentCount).to.be.equal(0);
    }).timeout(60000);

    it('Should update spent notes state', async () => {
        sinon
            .stub(tornadoService['_notesService'], 'updateTornadoEvents')
            .callsFake(
                async (
                    type: TornadoEvents,
                    currencyAmountPair: CurrencyAmountPair
                ) => {
                    const events =
                        type === TornadoEvents.DEPOSIT
                            ? {
                                  type,
                                  events: DepositEventsMock.events.map((e) => ({
                                      blockNumber: e.blockNumber,
                                      transactionHash: e.transactionHash,
                                      ...e.args,
                                  })),
                              }
                            : {
                                  type,
                                  events: WithdrawalEventsMock.events.map(
                                      (e) => ({
                                          blockNumber: e.blockNumber,
                                          transactionHash: e.transactionHash,
                                          nullifierHex: e.args.nullifierHash,
                                          fee: e.args
                                              .fee as unknown as BigNumber,
                                          to: e.args.to,
                                      })
                                  ),
                              };

                    await tornadoEventsDB.updateEvents(
                        AvailableNetworks.GOERLI,
                        currencyAmountPair,
                        events
                    );
                }
            );

        await tornadoService.unlock(testPass, mnemonic);

        const deposit: IBlankDeposit = {
            id: '12345678',
            note: Buffer.alloc(62, 'f').toString('hex'),
            nullifierHex: '0xd3751fe9080000',
            pair: { amount: '1', currency: KnownCurrencies.ETH },
            timestamp: new Date().getTime(),
            spent: false,
            depositIndex: 0,
            status: DepositStatus.CONFIRMED,
        };

        // Add deposit
        await (tornadoService as any)['_blankDepositVault'].addDeposits([
            deposit,
        ]);

        let unspentCount = await tornadoService.getUnspentDepositCount({
            currency: KnownCurrencies.ETH,
            amount: '1',
        });

        expect(unspentCount).to.be.equal(1);

        await tornadoService.updateNotesSpentState();

        unspentCount = await tornadoService.getUnspentDepositCount({
            currency: KnownCurrencies.ETH,
            amount: '1',
        });

        expect(unspentCount).to.be.equal(0);
    }).timeout(60000);

    it('Should return compliance information correctly', async () => {
        sinon
            .stub(
                ethers.providers.StaticJsonRpcProvider.prototype,
                'getTransactionReceipt'
            )
            .returns(
                Promise.resolve({
                    from: '0xe50002223413413',
                } as any)
            );

        sinon
            .stub(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock')
            .returns(
                Promise.resolve({
                    timestamp: 1439799168,
                } as any)
            );

        // Add both events here for testing simplification sake
        sinon
            .stub(tornadoService as any, 'updateTornadoEvents')
            .callsFake(
                async (
                    type: TornadoEvents,
                    currencyAmountPair: CurrencyAmountPair
                ) => {
                    const events =
                        type === TornadoEvents.DEPOSIT
                            ? {
                                  type,
                                  events: [
                                      {
                                          args: {
                                              leafIndex: 1,
                                              commitment:
                                                  '0x1810d7e4144666802fa7f2d2b87ba945e0b641f94149f42110294186659b244f',
                                              timestamp:
                                                  BigNumber.from(
                                                      '0x60363746'
                                                  ).toString(),
                                          },
                                          transactionHash: '0x222828182188921',
                                          blockNumber: 29219,
                                      },
                                  ].map((e) => ({
                                      blockNumber: e.blockNumber,
                                      transactionHash: e.transactionHash,
                                      ...e.args,
                                  })),
                              }
                            : {
                                  type,
                                  events: [
                                      {
                                          args: {
                                              nullifierHash:
                                                  '0x21315e4bfbfe7cff7a31e14546b96abdfacf2281cb938beddce4f89fc132ba60',
                                              to: '0xf98765337659907',
                                              fee: utils
                                                  .parseEther('0.07')
                                                  .toHexString() as unknown as BigNumber,
                                          },
                                          blockNumber: 29219,
                                          transactionHash: '0x333827262177432',
                                      },
                                  ].map((e) => ({
                                      blockNumber: e.blockNumber,
                                      transactionHash: e.transactionHash,
                                      nullifierHex: e.args.nullifierHash,
                                      to: e.args.to,
                                      fee: e.args.fee,
                                  })),
                              };

                    await tornadoEventsDB.updateEvents(
                        AvailableNetworks.GOERLI,
                        currencyAmountPair,
                        events
                    );
                }
            );

        await tornadoService.unlock(testPass, mnemonic);
        const deposit: IBlankDeposit = {
            id: '12345678',
            note: Buffer.alloc(62, 'f').toString('hex'),
            nullifierHex:
                '0x21315e4bfbfe7cff7a31e14546b96abdfacf2281cb938beddce4f89fc132ba60',
            pair: { amount: '1', currency: KnownCurrencies.ETH },
            timestamp: new Date().getTime(),
            spent: true,
            depositIndex: 0,
            status: DepositStatus.PENDING,
        };

        const compliance = await tornadoService.getComplianceInformation(
            deposit
        );
        expect(compliance).to.be.deep.equal({
            deposit: {
                pair: deposit.pair,
                spent: true,
                timestamp: new Date(1614165830 * 1000),
                commitment:
                    '0x1810d7e4144666802fa7f2d2b87ba945e0b641f94149f42110294186659b244f',
                transactionHash: '0x222828182188921',
                from: '0xe50002223413413',
            },
            withdrawal: {
                pair: deposit.pair,
                to: '0xf98765337659907',
                transactionHash: '0x333827262177432',
                timestamp: new Date(1439799168 * 1000),
                fee: '0.07',
                feeBN: BigNumber.from('0xf8b0a10e470000'),
                nullifier:
                    '0x21315e4bfbfe7cff7a31e14546b96abdfacf2281cb938beddce4f89fc132ba60',
            },
        });
    }).timeout(60000);
});

function clearDbs(tornadoEventsDB: TornadoEventsDB) {
    const db = (tornadoEventsDB as any).db as IDBPDatabase;
    for (const storeName of db.objectStoreNames) {
        db.clear(storeName);
    }
}
