import {
    amountParamNotPresentError,
    gasMaxFeePerGasParamNotPresentError,
    gasPriceParamNotPresentError,
    tokenAddressParamNotPresentError,
    TokenController,
    toParamNotPresentError,
    transactionIdParamNotPresentError,
    transactionNotFound,
} from '../../../../src/controllers/erc-20/TokenController';
import { expect } from 'chai';
import NetworkController from '../../../../src/controllers/NetworkController';
import { mockPreferencesController } from '../../../mocks/mock-preferences';
import sinon from 'sinon';
import { TransferTransaction } from '@block-wallet/background/controllers/erc-20/transactions/TransferTransaction';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionMeta } from '@block-wallet/background/controllers/transactions/utils/types';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { mockedPermissionsController } from '../../../mocks/mock-permissions';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../../../mocks/mock-network-instance';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { mockKeyringController } from 'test/mocks/mock-keyring-controller';

describe('TransferTransaction implementation', function () {
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
    let transferTransaction: TransferTransaction;
    let networkController: NetworkController;
    let preferencesController: PreferencesController;
    let transactionController: TransactionController;
    let gasPricesController: GasPricesController;
    let blockUpdatesController: BlockUpdatesController;
    let tokenController: TokenController;
    let permissionsController: PermissionsController;
    beforeEach(() => {
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
        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );

        tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
                cachedPopulatedTokens: {} as any,
            },
            {
                networkController,
                preferencesController: preferencesController,
                tokenOperationsController: new TokenOperationsController({
                    networkController: networkController,
                }),
            }
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

        transferTransaction = new TransferTransaction({
            transactionController,
            preferencesController,
            tokenController: new TokenController(initialState.TokenController, {
                networkController,
                preferencesController,
                tokenOperationsController: new TokenOperationsController({
                    networkController,
                }),
            }),
            networkController,
        });
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('populateTransaction', function () {
        it('Should fail - tokenAddress not present', async () => {
            try {
                await transferTransaction.populateTransaction({
                    tokenAddress: '',
                    to: '',
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(tokenAddressParamNotPresentError);
            }
        });
        it('Should fail - to not present', async () => {
            try {
                await transferTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    to: '',
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(toParamNotPresentError);
            }
        });
        it('Should fail - amount not present', async () => {
            try {
                await transferTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    to: accounts.goerli[1].address,
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(amountParamNotPresentError);
            }
        });
        it('Transaction should be populated ok', async () => {
            const populatedTransaction =
                await transferTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    to: accounts.goerli[1].address,
                    amount: BigNumber.from(1000),
                });

            expect(populatedTransaction).to.be.not.null;
            expect(populatedTransaction).to.be.not.undefined;
            expect(populatedTransaction.data).to.be.not.null;
            expect(populatedTransaction.data).to.be.not.undefined;
        });

        describe('calculateTransactionGasLimit', function () {
            it('Should fail - tokenAddress not present', async () => {
                try {
                    await transferTransaction.calculateTransactionGasLimit({
                        tokenAddress: '',
                        to: '',
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
            it('Should fail - to not present', async () => {
                try {
                    await transferTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        to: '',
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(toParamNotPresentError);
                }
            });
            it('Should fail - amount not present', async () => {
                try {
                    await transferTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(amountParamNotPresentError);
                }
            });
            it('Should calculate gas limit', async () => {
                const { gasLimit } =
                    await transferTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(1000),
                    });

                expect(gasLimit).to.be.not.null;
                expect(gasLimit).to.be.not.undefined;
                expect(gasLimit.toNumber() > 0).to.be.true;
            }).timeout(60000);
        });

        describe('addAsNewTransaction', function () {
            it('Should fail - tokenAddress not present', async () => {
                try {
                    await transferTransaction.addAsNewTransaction(
                        {
                            tokenAddress: '',
                            to: '',
                            amount: BigNumber.from(0),
                        },
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
            it('Should fail - to not present', async () => {
                try {
                    await transferTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            to: '',
                            amount: BigNumber.from(0),
                        },
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(toParamNotPresentError);
                }
            });
            it('Should fail - amount not present', async () => {
                try {
                    await transferTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            to: accounts.goerli[1].address,
                            amount: BigNumber.from(0),
                        },
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(amountParamNotPresentError);
                }
            });
            it('Should fail - gas not present', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(false)));

                try {
                    await transferTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            to: accounts.goerli[1].address,
                            amount: BigNumber.from(100),
                        },
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(gasPriceParamNotPresentError);
                }
            });
            it('Should fail - maxFeePerGas not present', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(true)));

                try {
                    await transferTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            to: accounts.goerli[1].address,
                            amount: BigNumber.from(100),
                        },
                        {
                            maxFeePerGas: BigNumber.from(0),
                            maxPriorityFeePerGas: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(gasMaxFeePerGasParamNotPresentError);
                }
            });
            it('Should add an unnaproval transaction', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(false)));

                const meta = await transferTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(1000),
                    },
                    {
                        gasPrice: BigNumber.from(100000),
                        gasLimit: BigNumber.from(100000),
                    }
                );

                expect(meta).to.be.not.null;
                expect(meta).to.be.not.undefined;
                expect(meta.id).to.be.not.null;
                expect(meta.id).to.be.not.undefined;
            });
            it('Should add an unnaproval transaction - EIP1559', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(true)));

                const meta = await transferTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(1000),
                    },
                    {
                        maxFeePerGas: BigNumber.from(1000000),
                        maxPriorityFeePerGas: BigNumber.from(100000),
                        gasLimit: BigNumber.from(100000),
                    }
                );

                expect(meta).to.be.not.null;
                expect(meta).to.be.not.undefined;
                expect(meta.id).to.be.not.null;
                expect(meta.id).to.be.not.undefined;
            });
        });

        describe('updateTransactionGas', function () {
            it('Should fail - transactionId not present', async () => {
                try {
                    await transferTransaction.updateTransactionGas('', {
                        gasPrice: BigNumber.from(0),
                        gasLimit: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(transactionIdParamNotPresentError);
                }
            });
            it('Should fail - transactionId invalid', async () => {
                try {
                    await transferTransaction.updateTransactionGas(
                        'not valid',
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(transactionNotFound);
                }
            });
            it('Should update the gas configuration for an unnaproval transaction', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(false)));

                const meta = await transferTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(1000),
                    },
                    {
                        gasPrice: BigNumber.from(100000),
                        gasLimit: BigNumber.from(100000),
                    }
                );

                expect(meta).to.be.not.null;
                expect(meta).to.be.not.undefined;
                expect(meta.id).to.be.not.null;
                expect(meta.id).to.be.not.undefined;
                expect(meta.transactionParams.gasPrice?.eq(100000)).to.be.true;
                expect(meta.transactionParams.gasLimit?.eq(100000)).to.be.true;

                await transferTransaction.updateTransactionGas(meta.id, {
                    gasPrice: BigNumber.from(200000),
                    gasLimit: BigNumber.from(200000),
                });

                const updatedMeta = transactionController.getTransaction(
                    meta.id
                );

                expect(updatedMeta).to.be.not.null;
                expect(updatedMeta).to.be.not.undefined;
                expect(updatedMeta!.id).to.be.not.null;
                expect(updatedMeta!.id).to.be.not.undefined;
                expect(updatedMeta!.transactionParams.gasPrice?.eq(200000)).to
                    .be.true;
                expect(updatedMeta!.transactionParams.gasLimit?.eq(200000)).to
                    .be.true;
            });
            it('Should update the gas configuration for an unnaproval transaction - EIP-1559', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(true)));

                const meta = await transferTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        to: accounts.goerli[1].address,
                        amount: BigNumber.from(1000),
                    },
                    {
                        maxFeePerGas: BigNumber.from(1000000),
                        maxPriorityFeePerGas: BigNumber.from(100000),
                        gasLimit: BigNumber.from(100000),
                    }
                );

                expect(meta).to.be.not.null;
                expect(meta).to.be.not.undefined;
                expect(meta.id).to.be.not.null;
                expect(meta.id).to.be.not.undefined;
                expect(meta.transactionParams.maxFeePerGas?.eq(1000000)).to.be
                    .true;
                expect(meta.transactionParams.maxPriorityFeePerGas?.eq(100000))
                    .to.be.true;
                expect(meta.transactionParams.gasLimit?.eq(100000)).to.be.true;

                await transferTransaction.updateTransactionGas(meta.id, {
                    maxFeePerGas: BigNumber.from(2000000),
                    maxPriorityFeePerGas: BigNumber.from(200000),
                    gasLimit: BigNumber.from(200000),
                });

                const updatedMeta = transactionController.getTransaction(
                    meta.id
                );

                expect(updatedMeta).to.be.not.null;
                expect(updatedMeta).to.be.not.undefined;
                expect(updatedMeta!.id).to.be.not.null;
                expect(updatedMeta!.id).to.be.not.undefined;
                expect(updatedMeta!.transactionParams.maxFeePerGas?.eq(2000000))
                    .to.be.true;
                expect(
                    updatedMeta!.transactionParams.maxPriorityFeePerGas?.eq(
                        200000
                    )
                ).to.be.true;
                expect(updatedMeta!.transactionParams.gasLimit?.eq(200000)).to
                    .be.true;
            });
        });

        describe('approveTransaction', function () {
            it('Should fail - transactionId not present', async () => {
                try {
                    await transferTransaction.approveTransaction('');
                } catch (e: any) {
                    expect(e).equal(transactionIdParamNotPresentError);
                }
            });
            it('Should approve the transaction', async () => {
                sinon.stub(transactionController, 'approveTransaction').returns(
                    new Promise<void>((resolve) => {
                        resolve();
                    })
                );
                await transferTransaction.approveTransaction(
                    'a mock transaction'
                );
            });
        });

        describe('getTransactionResult', function () {
            it('Should fail - transactionId not present', async () => {
                try {
                    await transferTransaction.getTransactionResult('');
                } catch (e: any) {
                    expect(e).equal(transactionIdParamNotPresentError);
                }
            });
            it('Should get the transaction result', async () => {
                sinon
                    .stub(TransactionController.prototype, 'getTransaction')
                    .returns({
                        transactionParams: { hash: '0x123aff' },
                    } as TransactionMeta);
                const result = await transferTransaction.getTransactionResult(
                    'a mock transaction'
                );

                expect(result).to.be.not.null;
                expect(result).to.be.not.undefined;
                expect(result).to.be.equal('0x123aff');
            });
        });
    });
});
