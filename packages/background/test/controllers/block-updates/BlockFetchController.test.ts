import { expect } from 'chai';
import { it } from 'mocha';
import NetworkController from '../../../src/controllers/NetworkController';
import BlockFetchController, {
    BlockFetchData,
    OffChainBlockFetchService,
} from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import sinon from 'sinon';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';
import { ethers } from 'ethers';
import httpClient, { RequestError } from './../../../src/utils/http';

const wait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('OffChainBlockFetchService', () => {
    let offChainBlockFetchService: OffChainBlockFetchService;

    beforeEach(() => {
        offChainBlockFetchService = new OffChainBlockFetchService();
    });
    afterEach(function () {
        sinon.restore();
        offChainBlockFetchService.unsetFetch();
    });

    describe('fetchBlockNumber', async () => {
        it('should return an error if the service is not available', async () => {
            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject('service not available');
                })
            );

            try {
                await offChainBlockFetchService.fetchBlockNumber(5);
            } catch (err) {
                expect(err.message).equal(
                    new Error('Error fetching block number for chain 5').message
                );
            }
        });
        it('should return an error if the service returns an invalid status code', async () => {
            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('400', 400, {}));
                })
            );

            try {
                await offChainBlockFetchService.fetchBlockNumber(5);
            } catch (err) {
                expect(err.message).equal(
                    new Error('Error fetching block number for chain 5').message
                );
            }
        });
        it('should return an error if the service returns an invalid payload', async () => {
            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({});
                })
            );

            try {
                await offChainBlockFetchService.fetchBlockNumber(5);
            } catch (err) {
                expect(err.message).equal(
                    new Error('Error fetching block number for chain 5').message
                );
            }
        });
        it('should return an error if the service returns an invalid block number', async () => {
            sinon
                .stub(httpClient, 'get')
                .onFirstCall()
                .returns(
                    new Promise((resolve, _) => {
                        resolve({
                            data: {},
                        });
                    })
                )
                .onSecondCall()
                .returns(
                    new Promise((resolve, _) => {
                        resolve({
                            blockNumber: 'not a number',
                        });
                    })
                );

            try {
                await offChainBlockFetchService.fetchBlockNumber(5);
            } catch (err) {
                expect(err.message).equal(
                    new Error('Error fetching block number for chain 5').message
                );
            }

            try {
                await offChainBlockFetchService.fetchBlockNumber(5);
            } catch (err) {
                expect(err.message).equal(
                    new Error('Error fetching block number for chain 5').message
                );
            }
        });
        it('should return a block number if the service returns ok', async () => {
            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({ bn: '50120221117' });
                })
            );

            const blockNumber =
                await offChainBlockFetchService.fetchBlockNumber(5);

            expect(blockNumber).equal(50120221117);
        });
    });
    describe('timer', async () => {
        it('should set and unset it', async () => {
            const mockBlockNumber = 11223344;
            let set = false;
            let errorCount = 0;

            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({ bn: mockBlockNumber.toString() });
                })
            );

            const detectErrorsInCallback = async () => {
                while (errorCount > -1) {
                    if (errorCount != 0) {
                        throw new Error('Unexpected error');
                    }
                    await wait(10);
                }
            };
            const errorsPromise = detectErrorsInCallback();

            const blockListener = (bn: number, error?: Error) => {
                try {
                    if (set) {
                        expect(bn).equal(mockBlockNumber);
                        expect(error).equal(undefined);
                    } else {
                        throw new Error('not expected callback call');
                    }
                } catch {
                    errorCount++;
                }
            };

            set = true;
            offChainBlockFetchService.setFetch(50, 5, 0, blockListener);

            let _recurrentFetch = (offChainBlockFetchService as any)[
                '_recurrentFetch'
            ];
            expect(_recurrentFetch).not.equal(undefined);
            expect(_recurrentFetch).not.equal(null);

            await wait(200);

            offChainBlockFetchService.unsetFetch();
            set = false;

            _recurrentFetch = (offChainBlockFetchService as any)[
                '_recurrentFetch'
            ];
            expect(_recurrentFetch).equal(null);

            await wait(200);
            errorCount = -1;

            await errorsPromise;
        });
    });
    describe('setFetch', async () => {
        it('should detect an error in the service', async () => {
            let loopActivated = true;
            const expectedError: Error = new Error(
                'Error fetching block number for chain 5'
            );
            let watchedError: Error = new Error('not set');
            let atLeastOneErrorDetected = false;

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('500', 500, {}));
                })
            );

            const detectErrorsInCallback = async () => {
                while (loopActivated) {
                    if (watchedError.message !== Error('not set').message) {
                        if (watchedError.message !== expectedError.message) {
                            throw watchedError;
                        } else {
                            atLeastOneErrorDetected = true;
                        }
                    }
                    await wait(10);
                }
            };
            const errorsPromise = detectErrorsInCallback();

            const blockListener = (bn: number, error?: Error) => {
                try {
                    if (bn !== -1) {
                        throw new Error('unexpected block number');
                    }
                    if (!error) {
                        throw new Error('error expected');
                    }
                    throw error;
                } catch (err) {
                    watchedError = err;
                }
            };

            offChainBlockFetchService.setFetch(50, 5, 0, blockListener);

            let _recurrentFetch = (offChainBlockFetchService as any)[
                '_recurrentFetch'
            ];
            expect(_recurrentFetch).not.equal(undefined);
            expect(_recurrentFetch).not.equal(null);

            await wait(200);
            loopActivated = false;

            await errorsPromise;
            expect(atLeastOneErrorDetected).equal(true);
        });
        it('should detect that the service is stuck', async () => {
            let loopActivated = true;
            const expectedError: Error = new Error(
                'off chain service stuck in the same block (50120221117) for chain 5'
            );
            let watchedError: Error = new Error('not set');
            let atLeastOneErrorDetected = false;

            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({ bn: '50120221117' });
                })
            );

            const detectErrorsInCallback = async () => {
                while (loopActivated) {
                    if (watchedError.message !== Error('not set').message) {
                        if (watchedError.message !== expectedError.message) {
                            throw watchedError;
                        } else {
                            atLeastOneErrorDetected = true;
                        }
                    }
                    await wait(10);
                }
            };
            const errorsPromise = detectErrorsInCallback();

            const blockListener = (bn: number, error?: Error) => {
                try {
                    if (bn !== 50120221117 && bn !== -1) {
                        throw new Error('unexpected block number');
                    }
                    if (error) {
                        throw error;
                    }
                } catch (err) {
                    watchedError = err;
                }
            };

            offChainBlockFetchService.setFetch(5, 5, 0, blockListener);

            let _recurrentFetch = (offChainBlockFetchService as any)[
                '_recurrentFetch'
            ];
            expect(_recurrentFetch).not.equal(undefined);
            expect(_recurrentFetch).not.equal(null);

            await wait(700);
            loopActivated = false;

            await errorsPromise;
            expect(atLeastOneErrorDetected).equal(true);
        });
        it('should call the block callback with new blocks number', async () => {
            let loopActivated = true;
            let watchedError: Error | null = null;
            let atLeastOneErrorDetected = false;

            const stubGet = sinon.stub(httpClient, 'get');
            for (let i = 0; i < 200; i++) {
                stubGet.onCall(i).returns(
                    new Promise((resolve, _) => {
                        resolve({ bn: i.toString() });
                    })
                );
            }

            const detectErrorsInCallback = async () => {
                while (loopActivated) {
                    if (watchedError != null) {
                        atLeastOneErrorDetected = true;
                        throw watchedError;
                    }
                    await wait(10);
                }
            };
            const errorsPromise = detectErrorsInCallback();

            const blockListener = (bn: number, error?: Error) => {
                try {
                    if (bn === -1) {
                        throw new Error('unexpected block number');
                    }
                    if (!error) {
                        throw error;
                    }
                } catch (err) {
                    watchedError = err;
                }
            };

            offChainBlockFetchService.setFetch(5, 5, 0, blockListener);

            let _recurrentFetch = (offChainBlockFetchService as any)[
                '_recurrentFetch'
            ];
            expect(_recurrentFetch).not.equal(undefined);
            expect(_recurrentFetch).not.equal(null);

            await wait(700);
            loopActivated = false;

            await errorsPromise;
            expect(atLeastOneErrorDetected).equal(false);
        });
    });
});

describe('BlockFetchController', () => {
    let networkController: NetworkController;
    let blockFetchController: BlockFetchController;

    beforeEach(() => {
        networkController = getNetworkControllerInstance();
        blockFetchController = new BlockFetchController(networkController, {
            blockFetchData: {},
        });
    });
    afterEach(function () {
        sinon.restore();
        blockFetchController.removeAllOnBlockListener();
    });

    describe('isOffChainServiceAvailable', async () => {
        it('should return true because of the state', async () => {
            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: true,
            } as Partial<BlockFetchData>);

            const isServiceAvailable = await (blockFetchController as any)[
                '_isOffChainServiceAvailable'
            ](5);
            expect(isServiceAvailable).equal(true);
        });
        it('should check if the service is available and then return true', async () => {
            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 10,
            } as Partial<BlockFetchData>);

            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({ bn: '20000' });
                })
            );

            const isServiceAvailable = await (blockFetchController as any)[
                '_isOffChainServiceAvailable'
            ](5);
            expect(isServiceAvailable).equal(true);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state).deep.equal({
                offChainSupport: true,
                currentBlockNumber: 20000,
                lastBlockOffChainChecked: 20000,
            });
        });
        it('should check if the service is available and then return false because it is stuck in an old block number', async () => {
            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 10,
            } as Partial<BlockFetchData>);

            sinon.stub(httpClient, 'get').returns(
                new Promise((resolve, _) => {
                    resolve({ blockNumber: '500' });
                })
            );

            const isServiceAvailable = await (blockFetchController as any)[
                '_isOffChainServiceAvailable'
            ](5);
            expect(isServiceAvailable).equal(false);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state).deep.equal({
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 10000,
            });
        });
        it('should check if the service is available and then return false because it is not', async () => {
            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 10,
            } as Partial<BlockFetchData>);

            sinon.stub(httpClient, 'get').returns(
                new Promise((_, reject) => {
                    reject(new RequestError('500', 500, {}));
                })
            );

            const isServiceAvailable = await (blockFetchController as any)[
                '_isOffChainServiceAvailable'
            ](5);
            expect(isServiceAvailable).equal(false);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state).deep.equal({
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 10000,
            });
        });
        it('should false because of the state', async () => {
            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 9999,
            } as Partial<BlockFetchData>);

            const isServiceAvailable = await (blockFetchController as any)[
                '_isOffChainServiceAvailable'
            ](5);
            expect(isServiceAvailable).equal(false);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state).deep.equal({
                offChainSupport: false,
                currentBlockNumber: 10000,
                lastBlockOffChainChecked: 9999,
            });
        });
    });
    describe('getBlockNumberCallback', async () => {
        it('it should switch from off chain to on chain', async () => {
            sinon
                .stub(httpClient, 'get')
                .onFirstCall()
                .returns(
                    new Promise((resolve, _) => {
                        resolve({ bn: '1234' });
                    })
                )
                .onSecondCall()
                .returns(
                    new Promise((_, reject) => {
                        reject(new RequestError('400', 400, {}));
                    })
                );

            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: true,
                currentBlockNumber: 1,
                lastBlockOffChainChecked: 1,
            } as Partial<BlockFetchData>);

            sinon.stub(networkController, 'getProvider').returns({
                pollingInterval: 0,
            } as ethers.providers.StaticJsonRpcProvider);

            sinon.stub(networkController, 'addOnBlockListener').returns();
            sinon.stub(networkController, 'removeAllOnBlockListener').returns();

            const blockListener = (bn: number) => {};

            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).equal(null);
            await blockFetchController.addNewOnBlockListener(
                5,
                blockListener,
                50
            );
            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).not.equal(null);

            await wait(200);

            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).equal(null);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state).deep.equal({
                offChainSupport: false,
                checkingOffChainSupport: false,
                currentBlockNumber: 1234,
                lastBlockOffChainChecked: 1234,
            });
        });
        it('it should switch from on chain to off chain', async () => {
            const stubGet = sinon.stub(httpClient, 'get');
            for (let i = 0; i < 500; i++) {
                stubGet.onCall(i).returns(
                    new Promise((resolve, _) => {
                        resolve({ bn: (i + 2000).toString() });
                    })
                );
            }

            (blockFetchController as any)['_updateState'](5, {
                offChainSupport: false,
                currentBlockNumber: 0,
                lastBlockOffChainChecked: 0,
            } as Partial<BlockFetchData>);

            sinon.stub(networkController, 'getProvider').returns({
                pollingInterval: 0,
            } as ethers.providers.StaticJsonRpcProvider);

            let blockListenerCallBack: (
                blockNumber: number,
                error?: Error
            ) => void | Promise<void> = () => {};

            (networkController as any)['addOnBlockListener'] = (
                blockListener: (blockNumber: number) => void | Promise<void>
            ) => {
                blockListenerCallBack = blockListener;
            };

            sinon.stub(networkController, 'removeAllOnBlockListener').returns();

            const blockListener = (bn: number) => {};

            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).equal(null);
            await blockFetchController.addNewOnBlockListener(
                5,
                blockListener,
                50
            );
            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).equal(null);

            await wait(200);

            blockListenerCallBack(300);

            await wait(200);

            expect(
                (blockFetchController as any)['_offChainBlockFetchService'][
                    '_recurrentFetch'
                ]
            ).not.equal(null);

            const state = (blockFetchController as any)['_getState'](5);
            expect(state['offChainSupport']).equal(true);
        });
    });
});
