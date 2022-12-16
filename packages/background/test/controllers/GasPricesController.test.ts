import initialState from '@block-wallet/background/utils/constants/initialState';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import {
    FeeDataResponse,
    GasPriceData,
    GasPriceLevels,
    GasPricesController,
} from '../../src/controllers/GasPricesController';
import NetworkController from '../../src/controllers/NetworkController';
import sinon from 'sinon';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import { Network } from '@block-wallet/background/utils/constants/networks';
import { it } from 'mocha';
import { Block } from '@ethersproject/abstract-provider';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import httpClient, { RequestError } from './../../src/utils/http';

// TODO(REC): FIX US!
describe('GasPrices Controller', () => {
    let gasPricesController: GasPricesController;
    let networkController: NetworkController;
    let blockUpdatesController: BlockUpdatesController;
    beforeEach(() => {
        networkController = getNetworkControllerInstance();
        blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );

        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('Updating gas prices', async () => {
        it('Should update the gas prices due to expiration policy', async () => {
            sinon
                .stub(networkController, 'getEIP1559Compatibility')
                .returns(new Promise((resolve) => resolve(true)));

            sinon.stub(gasPricesController as any, '_fetchFeeData').returns(
                Promise.resolve({
                    slow: {
                        maxFeePerGas: BigNumber.from('101'),
                        maxPriorityFeePerGas: BigNumber.from('102'),
                    },
                    average: {
                        maxFeePerGas: BigNumber.from('103'),
                        maxPriorityFeePerGas: BigNumber.from('104'),
                    },
                    fast: {
                        maxFeePerGas: BigNumber.from('105'),
                        maxPriorityFeePerGas: BigNumber.from('106'),
                    },
                })
            );

            (gasPricesController as any).expiration = 1616620739553;

            await gasPricesController.updateGasPrices(1, 5);

            const { gasPricesLevels: gasPrices } =
                gasPricesController.store.getState().gasPriceData[5];

            expect(gasPrices.slow.maxFeePerGas!.toString()).to.be.equal('101');
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '102'
            );
            expect(gasPrices.average.maxFeePerGas!.toString()).to.be.equal(
                '103'
            );
            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('104');
            expect(gasPrices.fast.maxFeePerGas!.toString()).to.be.equal('105');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '106'
            );
        });

        it('Should not update the legacy gas prices due to policy', async () => {
            sinon
                .stub(networkController, 'getEIP1559Compatibility')
                .returns(new Promise((resolve) => resolve(false)));

            gasPricesController.store.setState({
                gasPriceData: {
                    5: {
                        blockGasLimit: BigNumber.from(0),
                        gasPricesLevels: {
                            average: {
                                gasPrice: BigNumber.from('181000000000'),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                            fast: {
                                gasPrice: BigNumber.from('165000000000'),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                            slow: {
                                gasPrice: BigNumber.from('125000000000'),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                        },
                    },
                },
            });

            // Check for average change < 5%
            const _fetchFeeDataStub = sinon.stub(
                gasPricesController as any,
                '_fetchFeeData'
            );
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: { gasPrice: BigNumber.from('181000000000') },
                    fast: { gasPrice: BigNumber.from('165000000000') },
                    slow: { gasPrice: BigNumber.from('125000000000') },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            let { gasPricesLevels: gasPrices } =
                gasPricesController.store.getState().gasPriceData[5];

            expect(gasPrices.average.gasPrice!.toString()).to.be.equal(
                '181000000000'
            );
            expect(gasPrices.fast.gasPrice!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.gasPrice!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for fast change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: { gasPrice: BigNumber.from('181000000000') },
                    fast: { gasPrice: BigNumber.from('165000000000') },
                    slow: { gasPrice: BigNumber.from('125000000000') },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(gasPrices.average.gasPrice!.toString()).to.be.equal(
                '181000000000'
            );
            expect(gasPrices.fast.gasPrice!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.gasPrice!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for slow change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: { gasPrice: BigNumber.from('181000000000') },
                    fast: { gasPrice: BigNumber.from('165000000000') },
                    slow: { gasPrice: BigNumber.from('125000000001') },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(gasPrices.average.gasPrice!.toString()).to.be.equal(
                '181000000000'
            );
            expect(gasPrices.fast.gasPrice!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.gasPrice!.toString()).to.be.equal(
                '125000000000'
            );
        });

        it('Should update the EIP1559 gas prices due to price variation policy', async () => {
            sinon
                .stub(networkController, 'getEIP1559Compatibility')
                .returns(new Promise((resolve) => resolve(true)));

            gasPricesController.store.setState({
                gasPriceData: {
                    5: {
                        blockGasLimit: BigNumber.from(0),
                        gasPricesLevels: {
                            average: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('181000000000'),
                                maxFeePerGas: BigNumber.from('181000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                            fast: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('165000000000'),
                                maxFeePerGas: BigNumber.from('165000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                            slow: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('125000000000'),
                                maxFeePerGas: BigNumber.from('125000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                        },
                    },
                },
            });

            // Check for average change
            const _fetchFeeDataStub = sinon.stub(
                gasPricesController as any,
                '_fetchFeeData'
            );
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('201000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('165000000000'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('125000000000'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);

            let gos =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            let { gasPricesLevels: gasPrices } =
                gasPricesController.store.getState().gasPriceData[5];

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('201000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for fast change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('201000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('185000000000'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('125000000000'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('201000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '185000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for slow change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('201000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('185000000000'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('145000000000'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);

            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('201000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '185000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '145000000000'
            );
        });

        it('Should not update the EIP1559 gas prices due to policy', async () => {
            sinon
                .stub(networkController, 'getEIP1559Compatibility')
                .returns(new Promise((resolve) => resolve(true)));

            gasPricesController.store.setState({
                gasPriceData: {
                    5: {
                        blockGasLimit: BigNumber.from(0),
                        gasPricesLevels: {
                            average: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('181000000000'),
                                maxFeePerGas: BigNumber.from('181000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                            fast: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('165000000000'),
                                maxFeePerGas: BigNumber.from('165000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                            slow: {
                                maxPriorityFeePerGas:
                                    BigNumber.from('125000000000'),
                                maxFeePerGas: BigNumber.from('125000000000'),
                                gasPrice: null,
                                lastBaseFeePerGas: null,
                            },
                        },
                    },
                },
            });

            // Check for average change < 5%
            const _fetchFeeDataStub = sinon.stub(
                gasPricesController as any,
                '_fetchFeeData'
            );
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('181000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('165000000000'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('125000000000'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            let { gasPricesLevels: gasPrices } =
                gasPricesController.store.getState().gasPriceData[5];

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('181000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for fast change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('181000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('165000000001'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('125000000000'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('181000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '125000000000'
            );

            // Check for slow change
            _fetchFeeDataStub.returns(
                Promise.resolve({
                    average: {
                        maxPriorityFeePerGas: BigNumber.from('181000000000'),
                    },
                    fast: {
                        maxPriorityFeePerGas: BigNumber.from('165000000000'),
                    },
                    slow: {
                        maxPriorityFeePerGas: BigNumber.from('125000000001'),
                    },
                })
            );

            await (gasPricesController as any).updateGasPrices(1, 5);
            gasPrices =
                gasPricesController.store.getState().gasPriceData[5]
                    .gasPricesLevels;

            expect(
                gasPrices.average.maxPriorityFeePerGas!.toString()
            ).to.be.equal('181000000000');
            expect(gasPrices.fast.maxPriorityFeePerGas!.toString()).to.be.equal(
                '165000000000'
            );
            expect(gasPrices.slow.maxPriorityFeePerGas!.toString()).to.be.equal(
                '125000000000'
            );
        });
    });

    describe('Ensuring minimum gas prices', async () => {
        describe('EIP 1559', async () => {
            it('Non gas lower cap', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    chainId: 5,
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                            maxPriorityFeePerGas: BigNumber.from(11),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(20),
                            maxPriorityFeePerGas: BigNumber.from(21),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(30),
                            maxPriorityFeePerGas: BigNumber.from(31),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal(newGasPriceData);
            });

            it('Lower cap too low', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        baseFee: BigNumber.from(1),
                        maxPriorityFeePerGas: BigNumber.from(1),
                    },
                } as Network);

                const gasPriceData = {
                    baseFee: BigNumber.from(5),
                    estimatedBaseFee: BigNumber.from(5),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                            maxPriorityFeePerGas: BigNumber.from(11),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(20),
                            maxPriorityFeePerGas: BigNumber.from(21),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(30),
                            maxPriorityFeePerGas: BigNumber.from(31),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal(newGasPriceData);
            });

            it('Should ensure the lower gas price', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        baseFee: BigNumber.from(5),
                        maxPriorityFeePerGas: BigNumber.from(12),
                    },
                } as Network);

                const gasPriceData = {
                    baseFee: BigNumber.from(1),
                    estimatedBaseFee: BigNumber.from(1),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(15),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    baseFee: BigNumber.from(5),
                    estimatedBaseFee: BigNumber.from(5),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(12),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(15),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(20),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 2', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        baseFee: BigNumber.from(5),
                        maxPriorityFeePerGas: BigNumber.from(21),
                    },
                } as Network);

                const gasPriceData = {
                    baseFee: BigNumber.from(1),
                    estimatedBaseFee: BigNumber.from(1),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(15),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    baseFee: BigNumber.from(5),
                    estimatedBaseFee: BigNumber.from(5),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(21),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(21).mul(125).div(100),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(21)
                                .mul(125)
                                .div(100)
                                .mul(125)
                                .div(100),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 3', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        baseFee: BigNumber.from(5),
                        maxPriorityFeePerGas: BigNumber.from(14),
                    },
                } as Network);

                const gasPriceData = {
                    baseFee: BigNumber.from(1),
                    estimatedBaseFee: BigNumber.from(1),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(12),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(50),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    baseFee: BigNumber.from(5),
                    estimatedBaseFee: BigNumber.from(5),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(14),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(14).mul(125).div(100),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(50),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 4', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        baseFee: BigNumber.from(5),
                        maxPriorityFeePerGas: BigNumber.from(31),
                    },
                } as Network);

                const gasPriceData = {
                    baseFee: BigNumber.from(1),
                    estimatedBaseFee: BigNumber.from(1),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(30),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(600),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(601),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    baseFee: BigNumber.from(5),
                    estimatedBaseFee: BigNumber.from(5),
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(31),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(600),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(601),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price & prevent duplicate prices', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        maxPriorityFeePerGas: BigNumber.from(100),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(10),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(15),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            maxFeePerGas: BigNumber.from(100),
                        },
                        average: {
                            maxFeePerGas: BigNumber.from(125),
                        },
                        fast: {
                            maxFeePerGas: BigNumber.from(125).mul(125).div(100),
                        },
                    },
                } as GasPriceData);
            });
        });

        describe('Legacy', async () => {
            it('Non gas lower cap', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    chainId: 5,
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal(newGasPriceData);
            });

            it('Lower cap too low', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(1),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal(newGasPriceData);
            });

            it('Should ensure the lower gas price', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(12),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(12),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 2', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(21),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(21),
                        },
                        average: {
                            gasPrice: BigNumber.from(21).mul(125).div(100),
                        },
                        fast: {
                            gasPrice: BigNumber.from(21)
                                .mul(125)
                                .div(100)
                                .mul(125)
                                .div(100),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 3', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(14),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(12),
                        },
                        fast: {
                            gasPrice: BigNumber.from(50),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(14),
                        },
                        average: {
                            gasPrice: BigNumber.from(14).mul(125).div(100),
                        },
                        fast: {
                            gasPrice: BigNumber.from(50),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price 4', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(31),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(30),
                        },
                        average: {
                            gasPrice: BigNumber.from(600),
                        },
                        fast: {
                            gasPrice: BigNumber.from(601),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(31),
                        },
                        average: {
                            gasPrice: BigNumber.from(600),
                        },
                        fast: {
                            gasPrice: BigNumber.from(601),
                        },
                    },
                } as GasPriceData);
            });

            it('Should ensure the lower gas price & prevent duplicate prices', async () => {
                sinon.stub(networkController, 'getNetworkFromChainId').returns({
                    gasLowerCap: {
                        gasPrice: BigNumber.from(100),
                    },
                } as Network);

                const gasPriceData = {
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(10),
                        },
                        average: {
                            gasPrice: BigNumber.from(15),
                        },
                        fast: {
                            gasPrice: BigNumber.from(20),
                        },
                    },
                } as GasPriceData;

                const newGasPriceData = (gasPricesController as any)[
                    '_ensureLowerPrices'
                ](5, gasPriceData);

                expect(newGasPriceData).not.equal(undefined);
                expect(gasPriceData).deep.equal({
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(100),
                        },
                        average: {
                            gasPrice: BigNumber.from(125),
                        },
                        fast: {
                            gasPrice: BigNumber.from(125).mul(125).div(100),
                        },
                    },
                } as GasPriceData);
            });
        });
    });

    describe('Fetching fee data', async () => {
        it('No EIP1559 network, supported by the service', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise<FeeDataResponse>((resolve) => {
                    resolve({
                        blockNumber: '22332861',
                        blockGasLimit: '1234567',
                        gasPricesLevels: {
                            slow: {
                                gasPrice: '25500000000',
                            },
                            average: {
                                gasPrice: '30000000000',
                            },
                            fast: {
                                gasPrice: '37500000000',
                            },
                        },
                    });
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(false, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: BigNumber.from('25500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                average: {
                    gasPrice: BigNumber.from('30000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('37500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: true,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: undefined,
                estimatedBaseFee: undefined,
            } as GasPriceData);
        });

        it('EIP1559 network, supported by the service', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve) => {
                    resolve({
                        blockNumber: '13775611',
                        blockGasLimit: '1234567',
                        baseFee: '51022938614',
                        estimatedBaseFee: '51022949725',
                        gasPricesLevels: {
                            slow: {
                                maxFeePerGas: '45920644752',
                                maxPriorityFeePerGas: '500000000',
                            },
                            average: {
                                maxFeePerGas: '57125232475',
                                maxPriorityFeePerGas: '1000000000',
                            },
                            fast: {
                                maxFeePerGas: '67829820198',
                                maxPriorityFeePerGas: '1500000000',
                            },
                        },
                    });
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(true, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('45920644752'),
                    maxPriorityFeePerGas: BigNumber.from('500000000'),
                    lastBaseFeePerGas: BigNumber.from('51022938614'),
                },
                average: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('57125232475'),
                    maxPriorityFeePerGas: BigNumber.from('1000000000'),
                    lastBaseFeePerGas: BigNumber.from('51022938614'),
                },
                fast: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('67829820198'),
                    maxPriorityFeePerGas: BigNumber.from('1500000000'),
                    lastBaseFeePerGas: BigNumber.from('51022938614'),
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: true,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: BigNumber.from('51022938614'),
                estimatedBaseFee: BigNumber.from('51022949725'),
            } as GasPriceData);
        });

        it('No EIP1559 network, no supported by the service, fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('400', 400, {}));
                })
            );

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getGasPrice'
            );
            providerStub.returns(
                new Promise<BigNumber>((resolve) =>
                    resolve(BigNumber.from('30000000000'))
                )
            );
            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(false, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: BigNumber.from('25500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                average: {
                    gasPrice: BigNumber.from('30000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('37500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: undefined,
                estimatedBaseFee: undefined,
            } as GasPriceData);
        });

        it('EIP1559 network, no supported by the service, fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('400', 400, {}));
                })
            );

            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        baseFeePerGas: BigNumber.from('100000'),
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );
            providerStub.onFirstCall().returns(
                new Promise<any>((resolve) => {
                    resolve({
                        baseFeePerGas: [BigNumber.from('110000')],
                        reward: [
                            [
                                BigNumber.from('20000'),
                                BigNumber.from('23000'),
                                BigNumber.from('26000'),
                            ],
                        ],
                    });
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(true, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('130000'),
                    maxPriorityFeePerGas: BigNumber.from('20000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                average: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('133000'),
                    maxPriorityFeePerGas: BigNumber.from('23000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                fast: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('136000'),
                    maxPriorityFeePerGas: BigNumber.from('26000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: BigNumber.from('100000'),
                estimatedBaseFee: BigNumber.from('110000'),
            } as GasPriceData);
        });

        it('No EIP1559 network. no supported by the service (cached), fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(false);

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getGasPrice'
            );
            providerStub.returns(
                new Promise<BigNumber>((resolve) =>
                    resolve(BigNumber.from('30000000000'))
                )
            );
            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(false, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: BigNumber.from('25500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                average: {
                    gasPrice: BigNumber.from('30000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('37500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: undefined,
                estimatedBaseFee: undefined,
            } as GasPriceData);
        });

        it('EIP1559 network, no supported by the service (cached), fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(false);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('400', 400, {}));
                })
            );

            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        baseFeePerGas: BigNumber.from('100000'),
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );
            providerStub.onFirstCall().returns(
                new Promise<any>((resolve) => {
                    resolve({
                        baseFeePerGas: [BigNumber.from('110000')],
                        reward: [
                            [
                                BigNumber.from('20000'),
                                BigNumber.from('23000'),
                                BigNumber.from('26000'),
                            ],
                        ],
                    });
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(true, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('130000'),
                    maxPriorityFeePerGas: BigNumber.from('20000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                average: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('133000'),
                    maxPriorityFeePerGas: BigNumber.from('23000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                fast: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('136000'),
                    maxPriorityFeePerGas: BigNumber.from('26000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: BigNumber.from('100000'),
                estimatedBaseFee: BigNumber.from('110000'),
            } as GasPriceData);
        });

        it('No EIP1559 network, supported by the service but the service fails, fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('500', 500, {}));
                })
            );

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getGasPrice'
            );
            providerStub.returns(
                new Promise<BigNumber>((resolve) =>
                    resolve(BigNumber.from('30000000000'))
                )
            );
            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(false, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: BigNumber.from('25500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                average: {
                    gasPrice: BigNumber.from('30000000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
                fast: {
                    gasPrice: BigNumber.from('37500000000'),
                    maxFeePerGas: null,
                    maxPriorityFeePerGas: null,
                    lastBaseFeePerGas: null,
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: undefined,
                estimatedBaseFee: undefined,
            } as GasPriceData);
        });

        it('EIP1559 network, supported by the service but the service fails, fetching the chain', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('500', 500, {}));
                })
            );

            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((resolve) => {
                    resolve({
                        baseFeePerGas: BigNumber.from('100000'),
                        gasLimit: BigNumber.from('1234567'),
                    } as Block);
                })
            );

            const providerStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );
            providerStub.onFirstCall().returns(
                new Promise<any>((resolve) => {
                    resolve({
                        baseFeePerGas: [BigNumber.from('110000')],
                        reward: [
                            [
                                BigNumber.from('20000'),
                                BigNumber.from('23000'),
                                BigNumber.from('26000'),
                            ],
                        ],
                    });
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(true, {}, 1, 5);

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('130000'),
                    maxPriorityFeePerGas: BigNumber.from('20000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                average: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('133000'),
                    maxPriorityFeePerGas: BigNumber.from('23000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
                fast: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('136000'),
                    maxPriorityFeePerGas: BigNumber.from('26000'),
                    lastBaseFeePerGas: BigNumber.from('100000'),
                },
            } as GasPriceLevels);

            const state = gasPricesController.store.getState();

            expect(state).not.equal(undefined);
            expect(state.gasPriceData).not.equal(undefined);
            expect(5 in state.gasPriceData).equal(true);
            expect(state.gasPriceData[5]).deep.equal({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
                blockGasLimit: BigNumber.from('1234567'),
                baseFee: BigNumber.from('100000'),
                estimatedBaseFee: BigNumber.from('110000'),
            } as GasPriceData);
        });

        it('General error, returning default falue', async () => {
            sinon
                .stub(gasPricesController as any, '_shouldRequestChainService')
                .returns(true);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('400', 400, {}));
                })
            );

            sinon.stub(networkController, 'getLatestBlock').returns(
                new Promise<Block>((_, reject) => {
                    reject(Error('mocked error'));
                })
            );

            const gasPricesLevels: GasPriceLevels = await (
                gasPricesController as any
            )._fetchFeeData(
                true,
                {
                    slow: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from('119000'),
                        maxPriorityFeePerGas: BigNumber.from('20000'),
                    },
                    average: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from('144000'),
                        maxPriorityFeePerGas: BigNumber.from('23000'),
                    },
                    fast: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from('169000'),
                        maxPriorityFeePerGas: BigNumber.from('26000'),
                    },
                } as GasPriceLevels,
                5
            );

            expect(gasPricesLevels).not.equal(undefined);
            expect(gasPricesLevels).deep.equal({
                slow: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('119000'),
                    maxPriorityFeePerGas: BigNumber.from('20000'),
                },
                average: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('144000'),
                    maxPriorityFeePerGas: BigNumber.from('23000'),
                },
                fast: {
                    gasPrice: null,
                    maxFeePerGas: BigNumber.from('169000'),
                    maxPriorityFeePerGas: BigNumber.from('26000'),
                },
            } as GasPriceLevels);
        });
    });

    describe('Chaching chain fee service support', async () => {
        it('There is not previous object, should query the service', async () => {
            sinon.stub(gasPricesController, 'getState').returns({
                chainSupportedByFeeService: undefined,
            } as GasPriceData);

            expect(
                (gasPricesController as any)._shouldRequestChainService(1, 5)
            ).equal(true);
        });
        it('Chain supported, should query the service', async () => {
            sinon.stub(gasPricesController, 'getState').returns({
                chainSupportedByFeeService: {
                    lastBlockChecked: 0,
                    supported: true,
                },
            } as GasPriceData);

            expect(
                (gasPricesController as any)._shouldRequestChainService(1, 5)
            ).equal(true);
        });
        it('Current block beyond the block count treshold, should query the service', async () => {
            sinon.stub(gasPricesController, 'getState').returns({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: true,
                },
            } as GasPriceData);

            expect(
                (gasPricesController as any)._shouldRequestChainService(
                    1000000,
                    5
                )
            ).equal(true);
        });
        it('Current block is not beyond the block count treshold, should not query the service', async () => {
            sinon.stub(gasPricesController, 'getState').returns({
                chainSupportedByFeeService: {
                    lastBlockChecked: 1,
                    supported: false,
                },
            } as GasPriceData);

            expect(
                (gasPricesController as any)._shouldRequestChainService(2, 5)
            ).equal(false);
        });
    });
});
