import {
    TornadoEventsService,
    EventsFetchOptions,
} from '@block-wallet/background/controllers/blank-deposit/tornado/TornadoEventsService';
import sinon from 'sinon';
import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import { getNetworkControllerInstance } from '../../../mocks/mock-network-instance';
import NetworkController from '@block-wallet/background/controllers/NetworkController';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';

describe('TornadoEventsService', () => {
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
    let _tornadoEventsService: TornadoEventsService;
    let networkController: NetworkController;
    let blockUpdatesController: BlockUpdatesController;

    beforeEach(async () => {
        networkController = getNetworkControllerInstance();

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );

        _tornadoEventsService = new TornadoEventsService({
            endpoint: 'http://localhost:8080',
            version: 'v1',
            blockUpdatesController,
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getDeposits', async () => {
        it('Single page', async () => {
            // Mock
            sinon.stub(axios, 'get').returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    c: '04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                                    t: '1577309522',
                                    th: '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                                    bn: '9162622',
                                },
                                {
                                    li: '1',
                                    c: '1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                                    t: '1577587044',
                                    th: '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                                    bn: '9178765',
                                },
                                {
                                    li: '2',
                                    c: '17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                    t: '1577595362',
                                    th: '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                                    bn: '9179271',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const deposits = await _tornadoEventsService.getDeposits({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(deposits).not.equal(undefined);
            expect(deposits.length).equal(3);

            expect(deposits[0]).deep.equal({
                leafIndex: 0,
                commitment:
                    '0x04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                timestamp: '1577309522',
                transactionHash:
                    '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                blockNumber: 9162622,
            });

            expect(deposits[1]).deep.equal({
                leafIndex: 1,
                commitment:
                    '0x1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                timestamp: '1577587044',
                transactionHash:
                    '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                blockNumber: 9178765,
            });

            expect(deposits[2]).deep.equal({
                leafIndex: 2,
                commitment:
                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                timestamp: '1577595362',
                transactionHash:
                    '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                blockNumber: 9179271,
            });
        });

        it('Paginated', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onFirstCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    c: '04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                                    t: '1577309522',
                                    th: '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                                    bn: '9162622',
                                },
                                {
                                    li: '1',
                                    c: '1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                                    t: '1577587044',
                                    th: '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                                    bn: '9178765',
                                },
                            ],
                            last: 2,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onSecondCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '2',
                                    c: '17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                    t: '1577595362',
                                    th: '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                                    bn: '9179271',
                                },
                                {
                                    li: '3',
                                    c: '28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                                    t: '1577729969',
                                    th: '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                                    bn: '9187083',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onThirdCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '4',
                                    c: '242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                                    t: '1577730011',
                                    th: '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                                    bn: '9187084',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const deposits = await _tornadoEventsService.getDeposits({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(deposits).not.equal(undefined);
            expect(deposits.length).equal(5);

            expect(deposits[0]).deep.equal({
                leafIndex: 0,
                commitment:
                    '0x04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                timestamp: '1577309522',
                transactionHash:
                    '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                blockNumber: 9162622,
            });

            expect(deposits[1]).deep.equal({
                leafIndex: 1,
                commitment:
                    '0x1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                timestamp: '1577587044',
                transactionHash:
                    '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                blockNumber: 9178765,
            });

            expect(deposits[2]).deep.equal({
                leafIndex: 2,
                commitment:
                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                timestamp: '1577595362',
                transactionHash:
                    '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                blockNumber: 9179271,
            });

            expect(deposits[3]).deep.equal({
                leafIndex: 3,
                commitment:
                    '0x28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                timestamp: '1577729969',
                transactionHash:
                    '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                blockNumber: 9187083,
            });

            expect(deposits[4]).deep.equal({
                leafIndex: 4,
                commitment:
                    '0x242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                timestamp: '1577730011',
                transactionHash:
                    '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                blockNumber: 9187084,
            });
        });

        it('Last deposits', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onFirstCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '2',
                                    c: '17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                    t: '1577595362',
                                    th: '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                                    bn: '9179271',
                                },
                                {
                                    li: '3',
                                    c: '28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                                    t: '1577729969',
                                    th: '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                                    bn: '9187083',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onSecondCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '4',
                                    c: '242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                                    t: '1577730011',
                                    th: '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                                    bn: '9187084',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const deposits = await _tornadoEventsService.getDeposits({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 2,
            } as EventsFetchOptions);

            // Tests
            expect(deposits).not.equal(undefined);
            expect(deposits.length).equal(3);

            expect(deposits[0]).deep.equal({
                leafIndex: 2,
                commitment:
                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                timestamp: '1577595362',
                transactionHash:
                    '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                blockNumber: 9179271,
            });

            expect(deposits[1]).deep.equal({
                leafIndex: 3,
                commitment:
                    '0x28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                timestamp: '1577729969',
                transactionHash:
                    '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                blockNumber: 9187083,
            });

            expect(deposits[2]).deep.equal({
                leafIndex: 4,
                commitment:
                    '0x242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                timestamp: '1577730011',
                transactionHash:
                    '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                blockNumber: 9187084,
            });
        });

        it('Recoverable communication error', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onCall(0).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    c: '04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                                    t: '1577309522',
                                    th: '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                                    bn: '9162622',
                                },
                                {
                                    li: '1',
                                    c: '1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                                    t: '1577587044',
                                    th: '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                                    bn: '9178765',
                                },
                            ],
                            last: 2,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(1).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(2).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(3).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(4).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(5).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(6).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '2',
                                    c: '17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                    t: '1577595362',
                                    th: '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                                    bn: '9179271',
                                },
                                {
                                    li: '3',
                                    c: '28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                                    t: '1577729969',
                                    th: '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                                    bn: '9187083',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(7).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    li: '4',
                                    c: '242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                                    t: '1577730011',
                                    th: '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                                    bn: '9187084',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const deposits = await _tornadoEventsService.getDeposits({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(deposits).not.equal(undefined);
            expect(deposits.length).equal(5);

            expect(deposits[0]).deep.equal({
                leafIndex: 0,
                commitment:
                    '0x04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                timestamp: '1577309522',
                transactionHash:
                    '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                blockNumber: 9162622,
            });

            expect(deposits[1]).deep.equal({
                leafIndex: 1,
                commitment:
                    '0x1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                timestamp: '1577587044',
                transactionHash:
                    '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                blockNumber: 9178765,
            });

            expect(deposits[2]).deep.equal({
                leafIndex: 2,
                commitment:
                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                timestamp: '1577595362',
                transactionHash:
                    '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                blockNumber: 9179271,
            });

            expect(deposits[3]).deep.equal({
                leafIndex: 3,
                commitment:
                    '0x28ecd428d42b92a02e808f859b9d5a2b6f60fa036c8eca4f58e0064091922f2c',
                timestamp: '1577729969',
                transactionHash:
                    '0xdd8991623f091614ead9ace0fdc4f59f528dc3a35766ac2112a35928582f7c42',
                blockNumber: 9187083,
            });

            expect(deposits[4]).deep.equal({
                leafIndex: 4,
                commitment:
                    '0x242fa25314fb7d0acf3939641773e85fc29982196ecdf42de074fac4d705ec38',
                timestamp: '1577730011',
                transactionHash:
                    '0x84f27596016919203d69a0d3b4ae567d205aac8c06fecdfb68123b34bc483342',
                blockNumber: 9187084,
            });
        });

        it('Handling non-recoverable communication error', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');
            stubGet.onCall(0).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(1).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(2).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(3).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(4).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(5).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(6).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            deposits: [
                                {
                                    c: '04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                                    t: '1577309522',
                                    th: '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                                    bn: '9162622',
                                },
                                {
                                    li: '1',
                                    c: '1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                                    t: '1577587044',
                                    th: '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                                    bn: '9178765',
                                },
                                {
                                    li: '2',
                                    c: '17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                    t: '1577595362',
                                    th: '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                                    bn: '9179271',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            const contract = {} as Contract;
            (contract as any).queryFilter = () => {
                return new Promise<any[]>((resolve) => {
                    resolve([
                        {
                            transactionHash:
                                '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                            blockNumber: 9162622,
                            args: {
                                commitment:
                                    '0x04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                                leafIndex: 0,
                                timestamp: 1577309522,
                            },
                        },
                        {
                            transactionHash:
                                '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                            blockNumber: 9178765,
                            args: {
                                commitment:
                                    '0x1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                                leafIndex: 1,
                                timestamp: 1577587044,
                            },
                        },
                        {
                            transactionHash:
                                '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                            blockNumber: 9179271,
                            args: {
                                commitment:
                                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                                leafIndex: 2,
                                timestamp: 1577595362,
                            },
                        },
                    ]);
                });
            };
            (contract as any).filters = { Deposit: () => {} };

            // Fetch
            const deposits = await _tornadoEventsService.getDeposits({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
                chainOptions: { contract, fromBlock: 0 },
            } as EventsFetchOptions);

            // Tests
            expect(deposits).not.equal(undefined);
            expect(deposits.length).equal(3);

            expect(deposits[0]).deep.equal({
                leafIndex: 0,
                commitment:
                    '0x04b0b397af86289595530ea0a5d34e4edc64429a2cd207e51b146d4480a2b0dc',
                timestamp: '1577309522',
                transactionHash:
                    '0x6448bf9837b8ef7d9bff2ae929b12cfdfb4170454a2bd3f6ff573317885367f1',
                blockNumber: 9162622,
            });

            expect(deposits[1]).deep.equal({
                leafIndex: 1,
                commitment:
                    '0x1610cbf444c10d408fffbe2f2a732a5fde339f293a9ab42535004aec4f679e8b',
                timestamp: '1577587044',
                transactionHash:
                    '0xf52c7c1dbaf28ceaeffae6628cc081e325b97d6a7a4e7e786fd430a17e9b84b4',
                blockNumber: 9178765,
            });

            expect(deposits[2]).deep.equal({
                leafIndex: 2,
                commitment:
                    '0x17599b90669090004a0f45adc9b5053ef239090285b46499ffab590d42b684ab',
                timestamp: '1577595362',
                transactionHash:
                    '0x4dfbe390c414755ad2306d667f79c14500c9c0087524a5001788cf84c510e7b3',
                blockNumber: 9179271,
            });
        });
    });

    describe('getWithdrawals', async () => {
        it('Single Page', async () => {
            // Mock
            sinon.stub(axios, 'get').returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                                    t: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                                    f: '95500000000000000',
                                    th: '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                                    bn: '9569530',
                                },
                                {
                                    nh: '1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                                    t: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                                    f: '196500000000000000',
                                    th: '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                                    bn: '9571552',
                                },
                                {
                                    nh: '1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                                    bn: '9572565',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const withdrawals = await _tornadoEventsService.getWithdrawals({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(withdrawals).not.equal(undefined);
            expect(withdrawals.length).equal(3);

            expect(withdrawals[0]).deep.equal({
                nullifierHex:
                    '0x186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                to: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                fee: BigNumber.from('95500000000000000'),
                transactionHash:
                    '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                blockNumber: 9569530,
            });

            expect(withdrawals[1]).deep.equal({
                nullifierHex:
                    '0x1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                to: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                fee: BigNumber.from('196500000000000000'),
                transactionHash:
                    '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                blockNumber: 9571552,
            });

            expect(withdrawals[2]).deep.equal({
                nullifierHex:
                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                blockNumber: 9572565,
            });
        });

        it('Paginated', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onFirstCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                                    t: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                                    f: '95500000000000000',
                                    th: '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                                    bn: '9569530',
                                },
                                {
                                    nh: '1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                                    t: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                                    f: '196500000000000000',
                                    th: '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                                    bn: '9571552',
                                },
                            ],
                            last: 2,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onSecondCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                                    bn: '9572565',
                                },
                                {
                                    nh: '1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                                    bn: '9572574',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onThirdCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '100500000000000000',
                                    th: '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                                    bn: '9572579',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const withdrawals = await _tornadoEventsService.getWithdrawals({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(withdrawals).not.equal(undefined);
            expect(withdrawals.length).equal(5);

            expect(withdrawals[0]).deep.equal({
                nullifierHex:
                    '0x186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                to: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                fee: BigNumber.from('95500000000000000'),
                transactionHash:
                    '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                blockNumber: 9569530,
            });

            expect(withdrawals[1]).deep.equal({
                nullifierHex:
                    '0x1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                to: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                fee: BigNumber.from('196500000000000000'),
                transactionHash:
                    '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                blockNumber: 9571552,
            });

            expect(withdrawals[2]).deep.equal({
                nullifierHex:
                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                blockNumber: 9572565,
            });

            expect(withdrawals[3]).deep.equal({
                nullifierHex:
                    '0x1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                blockNumber: 9572574,
            });

            expect(withdrawals[4]).deep.equal({
                nullifierHex:
                    '0x16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('100500000000000000'),
                transactionHash:
                    '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                blockNumber: 9572579,
            });
        });

        it('Last withdrawals', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onFirstCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                                    bn: '9572565',
                                },
                                {
                                    nh: '1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                                    bn: '9572574',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onSecondCall().returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '100500000000000000',
                                    th: '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                                    bn: '9572579',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const withdrawals = await _tornadoEventsService.getWithdrawals({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 2,
            } as EventsFetchOptions);

            // Tests
            expect(withdrawals).not.equal(undefined);
            expect(withdrawals.length).equal(3);

            expect(withdrawals[0]).deep.equal({
                nullifierHex:
                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                blockNumber: 9572565,
            });

            expect(withdrawals[1]).deep.equal({
                nullifierHex:
                    '0x1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                blockNumber: 9572574,
            });

            expect(withdrawals[2]).deep.equal({
                nullifierHex:
                    '0x16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('100500000000000000'),
                transactionHash:
                    '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                blockNumber: 9572579,
            });
        });

        it('Recoverable communication error', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');

            stubGet.onCall(0).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                                    t: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                                    f: '95500000000000000',
                                    th: '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                                    bn: '9569530',
                                },
                                {
                                    nh: '1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                                    t: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                                    f: '196500000000000000',
                                    th: '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                                    bn: '9571552',
                                },
                            ],
                            last: 2,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(1).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(2).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(3).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(4).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(5).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(6).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                                    bn: '9572565',
                                },
                                {
                                    nh: '1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                                    bn: '9572574',
                                },
                            ],
                            last: 4,
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(7).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '100500000000000000',
                                    th: '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                                    bn: '9572579',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            // Fetch
            const withdrawals = await _tornadoEventsService.getWithdrawals({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
            } as EventsFetchOptions);

            // Tests
            expect(withdrawals).not.equal(undefined);
            expect(withdrawals.length).equal(5);

            expect(withdrawals[0]).deep.equal({
                nullifierHex:
                    '0x186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                to: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                fee: BigNumber.from('95500000000000000'),
                transactionHash:
                    '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                blockNumber: 9569530,
            });

            expect(withdrawals[1]).deep.equal({
                nullifierHex:
                    '0x1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                to: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                fee: BigNumber.from('196500000000000000'),
                transactionHash:
                    '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                blockNumber: 9571552,
            });

            expect(withdrawals[2]).deep.equal({
                nullifierHex:
                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                blockNumber: 9572565,
            });

            expect(withdrawals[3]).deep.equal({
                nullifierHex:
                    '0x1cc3eaf41602324093b387fdf84c7dead56304fffcd006bbf1213593d38af430',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xcba750d326008a701de75ea304394e9518957a2f175cb5755b86f2da70a15a7b',
                blockNumber: 9572574,
            });

            expect(withdrawals[4]).deep.equal({
                nullifierHex:
                    '0x16f4e7a7f349d0910961ada205174bd5ca942c5aa25d0aac2dca9946373a887a',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('100500000000000000'),
                transactionHash:
                    '0xba747acefef81ef5be4fa62a0495da8b9d4d0e094c802d2a99f352f9a2f7a3b8',
                blockNumber: 9572579,
            });
        });

        it('Handling non-recoverable communication error', async () => {
            // Mock
            const stubGet = sinon.stub(axios, 'get');
            stubGet.onCall(0).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(1).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(2).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(3).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(4).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(5).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            error: 'Internal Error',
                        },
                        status: 500,
                        statusText: '500',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );
            stubGet.onCall(6).returns(
                new Promise<AxiosResponse>((resolve) => {
                    resolve({
                        data: {
                            withdrawals: [
                                {
                                    nh: '186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                                    t: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                                    f: '95500000000000000',
                                    th: '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                                    bn: '9569530',
                                },
                                {
                                    nh: '1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                                    t: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                                    f: '196500000000000000',
                                    th: '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                                    bn: '9571552',
                                },
                                {
                                    nh: '1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                    t: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                    f: '210500000000000000',
                                    th: '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                                    bn: '9572565',
                                },
                            ],
                        },
                        status: 200,
                        statusText: '200',
                        headers: {},
                        config: {},
                        request: {},
                    });
                })
            );

            const contract = {} as Contract;
            (contract as any).queryFilter = () => {
                return new Promise<any[]>((resolve) => {
                    resolve([
                        {
                            transactionHash:
                                '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                            blockNumber: 9569530,
                            args: {
                                to: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                                nullifierHash:
                                    '0x186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                                fee: BigNumber.from('95500000000000000'),
                            },
                        },
                        {
                            transactionHash:
                                '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                            blockNumber: 9571552,
                            args: {
                                to: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                                nullifierHash:
                                    '0x1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                                fee: BigNumber.from('196500000000000000'),
                            },
                        },
                        {
                            transactionHash:
                                '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                            blockNumber: 9572565,
                            args: {
                                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                                nullifierHash:
                                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                                fee: BigNumber.from('210500000000000000'),
                            },
                        },
                    ]);
                });
            };
            (contract as any).filters = { Withdrawal: () => {} };

            // Fetch
            const withdrawals = await _tornadoEventsService.getWithdrawals({
                chainId: 5,
                pair: { currency: 'eth', amount: '100' },
                from: 0,
                chainOptions: {
                    fromBlock: 0,
                    contract,
                },
            } as EventsFetchOptions);

            // Tests
            expect(withdrawals).not.equal(undefined);
            expect(withdrawals.length).equal(3);

            expect(withdrawals[0]).deep.equal({
                nullifierHex:
                    '0x186e9abb198e5971f651ee4d6332509891c84532542f09fb9ae1f7d6dbff7f7a',
                to: '0x571774214A7F9203fe34e4BCC58b64e239d65D76',
                fee: BigNumber.from('95500000000000000'),
                transactionHash:
                    '0x50dcf98b9a73f45b02121ef78f61890e4eb74473bca3e821704f1684ed2a6aed',
                blockNumber: 9569530,
            });

            expect(withdrawals[1]).deep.equal({
                nullifierHex:
                    '0x1b516fbb222a5cb6a971bb37bda8e2f429f05b2322762a54119a1f63ff2768c9',
                to: '0x753Cb2CfB62D4D7C5E12C67E7bFc9B5e134Def47',
                fee: BigNumber.from('196500000000000000'),
                transactionHash:
                    '0x27194efe788a2da39e06d68707edb2128b55a938262ef443dc50b0639ea9dbb8',
                blockNumber: 9571552,
            });

            expect(withdrawals[2]).deep.equal({
                nullifierHex:
                    '0x1ad82bee1d893c4ad0b4c39ee60aa947e00cc75c9bd174b6934cbce80f34ec62',
                to: '0xC8D48b0e9eB8d19CC7f914Af5a6Cd4EBd3F48B5F',
                fee: BigNumber.from('210500000000000000'),
                transactionHash:
                    '0xd44b5d2ffaa82433b89370356dbd264d5b8e47db8b1950de54fc4feb3b8e0e34',
                blockNumber: 9572565,
            });
        });
    });
});
