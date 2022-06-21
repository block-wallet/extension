import {
    amountParamNotPresentError,
    gasPriceParamNotPresentError,
    tokenAddressParamNotPresentError,
    spenderParamNotPresentError,
    transactionIdParamNotPresentError,
    transactionNotFound,
    gasMaxFeePerGasParamNotPresentError,
    TokenController,
} from '../../../../src/controllers/erc-20/TokenController';
import { expect } from 'chai';
import NetworkController from '../../../../src/controllers/NetworkController';
import { mockPreferencesController } from '../../../mocks/mock-preferences';
import sinon from 'sinon';
import {
    ApproveTransaction,
    ApproveTransactionPopulatedTransactionParams,
} from '@block-wallet/background/controllers/erc-20/transactions/ApproveTransaction';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { TransactionController } from '@block-wallet/background/controllers/transactions/TransactionController';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionCategories } from '@block-wallet/background/controllers/transactions/utils/types';
import { mockedPermissionsController } from '../../../mocks/mock-permissions';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../../../mocks/mock-network-instance';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';

describe('ApproveTransaction implementation', function () {
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
    let approveTransaction: ApproveTransaction;
    let networkController: NetworkController;
    let preferencesController: PreferencesController;
    let transactionController: TransactionController;
    let permissionsController: PermissionsController;
    let gasPricesController: GasPricesController;
    let blockUpdatesController: BlockUpdatesController;
    let tokenController: TokenController;

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

        approveTransaction = new ApproveTransaction({
            transactionController: transactionController,
            preferencesController: preferencesController,
            networkController: networkController,
        });
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('populateTransaction', function () {
        it('Should fail - tokenAddress not present', async () => {
            try {
                await approveTransaction.populateTransaction({
                    tokenAddress: '',
                    spender: '',
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(tokenAddressParamNotPresentError);
            }
        });
        it('Should fail - spender not present', async () => {
            try {
                await approveTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    spender: '',
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(spenderParamNotPresentError);
            }
        });
        it('Should fail - amount not present', async () => {
            try {
                await approveTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    spender: daiAddress,
                    amount: BigNumber.from(0),
                });
            } catch (e: any) {
                expect(e).equal(amountParamNotPresentError);
            }
        });
        it('Transaction should be populated ok', async () => {
            const populatedTransaction =
                await approveTransaction.populateTransaction({
                    tokenAddress: daiAddress,
                    spender: daiAddress,
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
                    await approveTransaction.calculateTransactionGasLimit({
                        tokenAddress: '',
                        spender: '',
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(tokenAddressParamNotPresentError);
                }
            });
            it('Should fail - to not present', async () => {
                try {
                    await approveTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        spender: '',
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(spenderParamNotPresentError);
                }
            });
            it('Should fail - amount not present', async () => {
                try {
                    await approveTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        spender: daiAddress,
                        amount: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(amountParamNotPresentError);
                }
            });
            it('Should calculate gas limit', async () => {
                const { gasLimit } =
                    await approveTransaction.calculateTransactionGasLimit({
                        tokenAddress: daiAddress,
                        spender: daiAddress,
                        amount: BigNumber.from(1000),
                    });

                expect(gasLimit).to.be.not.null;
                expect(gasLimit).to.be.not.undefined;
                expect(gasLimit.toNumber() > 0).to.be.true;
            });
        });

        describe('addAsNewTransaction', function () {
            it('Should fail - tokenAddress not present', async () => {
                try {
                    await approveTransaction.addAsNewTransaction(
                        {
                            tokenAddress: '',
                            spender: '',
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
            it('Should fail - spender not present', async () => {
                try {
                    await approveTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            spender: '',
                            amount: BigNumber.from(0),
                        },
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(spenderParamNotPresentError);
                }
            });
            it('Should fail - amount not present', async () => {
                try {
                    await approveTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            spender: daiAddress,
                        } as ApproveTransactionPopulatedTransactionParams,
                        {
                            gasPrice: BigNumber.from(0),
                            gasLimit: BigNumber.from(0),
                        }
                    );
                } catch (e: any) {
                    expect(e).equal(amountParamNotPresentError);
                }
            });
            it('Should fail - gas price not present', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(false)));

                try {
                    await approveTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            spender: daiAddress,
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
                    await approveTransaction.addAsNewTransaction(
                        {
                            tokenAddress: daiAddress,
                            spender: daiAddress,
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

                const meta = await approveTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        spender: daiAddress,
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
            it('Should add an unnaproval transaction - EIP-1559', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(true)));

                const meta = await approveTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        spender: daiAddress,
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
                    await approveTransaction.updateTransactionGas('', {
                        gasPrice: BigNumber.from(0),
                        gasLimit: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(transactionIdParamNotPresentError);
                }
            });
            it('Should fail - transactionId invalid', async () => {
                try {
                    await approveTransaction.updateTransactionGas('not valid', {
                        gasPrice: BigNumber.from(0),
                        gasLimit: BigNumber.from(0),
                    });
                } catch (e: any) {
                    expect(e).equal(transactionNotFound);
                }
            });
            it('Should update the gas configuration for an unnaproval transaction', async () => {
                sinon
                    .stub(networkController, 'getEIP1559Compatibility')
                    .callsFake(() => new Promise((resolve) => resolve(false)));

                const meta = await approveTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        spender: daiAddress,
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

                await approveTransaction.updateTransactionGas(meta.id, {
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

                const meta = await approveTransaction.addAsNewTransaction(
                    {
                        tokenAddress: daiAddress,
                        spender: daiAddress,
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

                await approveTransaction.updateTransactionGas(meta.id, {
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
                expect(meta.transactionParams.maxFeePerGas?.eq(2000000)).to.be
                    .true;
                expect(meta.transactionParams.maxPriorityFeePerGas?.eq(200000))
                    .to.be.true;
                expect(meta.transactionParams.gasLimit?.eq(200000)).to.be.true;
            });
        });

        describe('approveTransaction', function () {
            it('Should fail - transactionId not present', async () => {
                try {
                    await approveTransaction.approveTransaction('');
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
                await approveTransaction.approveTransaction(
                    'a mock transaction'
                );
            });
        });

        describe('getTransactionResult', function () {
            it('Should fail - transactionId not present', async () => {
                try {
                    await approveTransaction.getTransactionResult('');
                } catch (e: any) {
                    expect(e).equal(transactionIdParamNotPresentError);
                }
            });
            it('Should get the transaction result', async () => {
                sinon
                    .stub(
                        TransactionController.prototype,
                        'waitForTransactionResult'
                    )
                    .returns(
                        new Promise((resolve) => {
                            resolve('0x123af');
                        })
                    );
                const result = await approveTransaction.getTransactionResult(
                    'a mock transaction'
                );

                expect(result).to.be.not.null;
                expect(result).to.be.not.undefined;
                expect(result).to.be.true;
            });
        });
    });

    describe('Transaction data', function () {
        const transferData =
            '0xa9059cbb000000000000000000000000e7327602980619ebe59e90becfb868d48603c4f500000000000000000000000000000000000000000000006194049f30f7200000';
        const allowanceData =
            '0x095ea7b3000000000000000000000000a70b7d3fe1cb67a1f67fb691a5bcc4bc4f0af9ad0000000000000000000000000000000000000000000000000000000000000001';

        it('Should parse transaction data', function () {
            let parsedData =
                ApproveTransaction.parseTransactionData(transferData);

            expect(parsedData).to.be.not.undefined;

            parsedData = ApproveTransaction.parseTransactionData('0x01');

            expect(parsedData).to.be.undefined;
        });

        it('Should check preset categories', function () {
            let transactionCategory =
                ApproveTransaction.checkPresetCategories(transferData);

            expect(transactionCategory).to.be.equal(
                TransactionCategories.TOKEN_METHOD_TRANSFER
            );

            transactionCategory =
                ApproveTransaction.checkPresetCategories(allowanceData);

            expect(transactionCategory).to.be.equal(
                TransactionCategories.TOKEN_METHOD_APPROVE
            );
        });

        it('Should get data arguments', function () {
            let callArguments = approveTransaction.decodeInputData(
                transferData,
                TransactionCategories.TOKEN_METHOD_TRANSFER
            );

            expect(callArguments._to).to.be.not.undefined;
            expect(callArguments._value).to.be.not.undefined;
            expect(callArguments._spender).to.be.undefined;

            callArguments = approveTransaction.decodeInputData(
                allowanceData,
                TransactionCategories.TOKEN_METHOD_APPROVE
            );

            expect(callArguments._to).to.be.undefined;
            expect(callArguments._value).to.be.not.undefined;
            expect(callArguments._spender).to.be.not.undefined;
        });
    });

    describe('Token Approval', function () {
        const testApproval = {
            contract: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // Uni goerli token
            spender: '0xa70B7d3fe1Cb67a1f67fB691A5Bcc4BC4f0AF9Ad',
            allowance: '0x01',
            data: '0x095ea7b3000000000000000000000000a70b7d3fe1cb67a1f67fb691a5bcc4bc4f0af9ad0000000000000000000000000000000000000000000000000000000000000001',
        };

        it('Should get approval arguments', function () {
            const approvalArguments = approveTransaction.getDataArguments(
                testApproval.data
            );

            expect(approvalArguments._spender).to.be.equal(
                testApproval.spender
            );
            expect(approvalArguments._value._hex).to.be.equal(
                testApproval.allowance
            );
        });

        it('Should get custom approval data', function () {
            const newAllowance = '0x016345785d8a0000';
            const correctUpdatedAllowance =
                '0x095ea7b3000000000000000000000000a70b7d3fe1cb67a1f67fb691a5bcc4bc4f0af9ad000000000000000000000000000000000000000000000000016345785d8a0000';

            const newApprovalData =
                approveTransaction.getDataForCustomAllowance(
                    testApproval.data,
                    newAllowance
                );

            expect(newApprovalData).to.be.equal(correctUpdatedAllowance);

            const approvalArguments =
                approveTransaction.getDataArguments(newApprovalData);

            expect(approvalArguments._value._hex).to.be.equal(newAllowance);
        });

        it('Should not get custom approval data', function () {
            const badData = testApproval.data + '1';
            const badAllowance = testApproval.allowance + 'h';
            const badAllowance2 =
                testApproval.allowance +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

            expect(
                approveTransaction.getDataForCustomAllowance.bind(
                    approveTransaction,
                    badData,
                    testApproval.allowance
                )
            ).to.throw('Invalid data');

            expect(
                approveTransaction.getDataForCustomAllowance.bind(
                    approveTransaction,
                    testApproval.data,
                    badAllowance
                )
            ).to.throw('Invalid new allowance');

            expect(
                approveTransaction.getDataForCustomAllowance.bind(
                    approveTransaction,
                    testApproval.data,
                    badAllowance2
                )
            ).to.throw('Invalid new allowance');
        });
    });
});
