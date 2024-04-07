import { expect } from 'chai';
import NetworkController from '../../src/controllers/NetworkController';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import sinon from 'sinon';
import { BigNumber } from '@ethersproject/bignumber';
import { Block } from '@ethersproject/abstract-provider';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { AddNetworkType } from '@block-wallet/background/utils/constants/networks';
import * as ethereumChain from '@block-wallet/background/utils/ethereumChain';

describe('Network controller', function () {
    let networkController: NetworkController;

    beforeEach(function () {
        networkController = getNetworkControllerInstance();
    });
    afterEach(function () {
        sinon.restore();
    });

    it('should get and set selected network', async function () {
        networkController.selectedNetwork = 'goerli';
        expect(networkController.selectedNetwork).to.equal('goerli');

        networkController.selectedNetwork = 'mainnet';
        expect(networkController.selectedNetwork).to.equal('mainnet');
    });

    it('should init properly', async function () {
        await networkController.waitUntilNetworkLoaded();

        let network = await networkController.getNetwork();
        expect(network.name).to.equal('goerli');
    });

    it('should set and get network', async function () {
        await networkController.setNetwork('mainnet');
        let network = await networkController.getNetwork();
        expect(network.name).to.equal('homestead');
    }).timeout(100000);

    it('should get a real provider', async function () {
        const provider = networkController.getProvider();
        expect(networkController.getProvider()).to.be.instanceOf(
            StaticJsonRpcProvider
        );
    });

    it('should add and remove block listeners', async function () {
        networkController.getProvider().on('block', () => {});
        expect(
            networkController.getProvider().listenerCount('block')
        ).not.equal(0);
        networkController.getProvider().removeAllListeners('block');
        expect(networkController.getProvider().listenerCount('block')).equal(0);
    });

    it('should get the latest block', async function () {
        await networkController.setNetwork('mainnet');
        expect(
            (await networkController.getLatestBlock()).number
        ).to.be.greaterThan(12556240);
    }).timeout(100000);

    describe('EIP1559 compatibility', async () => {
        it('There is a value for the chain', async () => {
            networkController.store.updateState({
                isEIP1559Compatible: {
                    5: true,
                },
            });

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(5, false);
            expect(shouldBeCompatibleWithEIP155).equal(true);

            networkController.store.updateState({
                isEIP1559Compatible: {
                    5: false,
                },
            });

            const shouldNotBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(5, false);
            expect(shouldNotBeCompatibleWithEIP155).equal(false);
        });
        it('Catched by the NO_EIP_1559_NETWORKS list', async () => {
            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(324, false);
            expect(shouldBeCompatibleWithEIP155).equal(false);
        });
        it('The chain fee service indicates EIP 1559 compatibility', async () => {
            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(5, false);
            expect(shouldBeCompatibleWithEIP155).equal(true);
        });
        it('The chain fee service indicates NO EIP 1559 compatibility', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );
            const feeHistoryStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: BigNumber.from('1') } as Block);
                })
            );
            feeHistoryStub.onFirstCall().returns(
                new Promise((_, err) => {
                    err(new Error('some error'));
                })
            );

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(1101, false);
            expect(shouldBeCompatibleWithEIP155).equal(false);
        });
        it('There is not a value for the chain', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );
            const feeHistoryStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: BigNumber.from('1') } as Block);
                })
            );
            feeHistoryStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: {}, rewards: [] });
                })
            );

            providerStub.onSecondCall().returns(
                new Promise((resolve) => {
                    resolve({} as Block);
                })
            );

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(555, false);
            expect(shouldBeCompatibleWithEIP155).equal(true);

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            const shouldNotBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(555, false);
            expect(shouldNotBeCompatibleWithEIP155).equal(false);
        });
        it('eth_feeHistory is not available', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );
            const feeHistoryStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: BigNumber.from('1') } as Block);
                })
            );
            feeHistoryStub.onFirstCall().returns(
                new Promise((_, err) => {
                    err(new Error('some error'));
                })
            );

            const shouldBeNotCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(555, false);
            expect(shouldBeNotCompatibleWithEIP155).equal(false);
        });
        it('eth_feeHistory is available', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );
            const feeHistoryStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );

            networkController.store.updateState({
                isEIP1559Compatible: {},
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: BigNumber.from('1') } as Block);
                })
            );
            feeHistoryStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: {}, rewards: [] });
                })
            );

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(5, false);
            expect(shouldBeCompatibleWithEIP155).equal(true);
        });
        it('There is a value but the updated is forced', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );
            const feeHistoryStub = sinon.stub(
                networkController.getProvider(),
                'send'
            );

            networkController.store.updateState({
                isEIP1559Compatible: { 5: true },
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: BigNumber.from('0') } as Block);
                })
            );
            feeHistoryStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: {}, rewards: [] });
                })
            );

            const shouldBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(5, true);
            expect(shouldBeCompatibleWithEIP155).equal(true);
        });
        it('There is a value but the updated is forced. However, there is not updated', async () => {
            const providerStub = sinon.stub(
                networkController.getProvider(),
                'getBlock'
            );

            networkController.store.updateState({
                isEIP1559Compatible: { 5: false },
            });

            providerStub.onFirstCall().returns(
                new Promise((resolve) => {
                    resolve({ baseFeePerGas: undefined } as Block);
                })
            );

            const shouldNotBeCompatibleWithEIP155 =
                await networkController.getEIP1559Compatibility(555, true);
            expect(shouldNotBeCompatibleWithEIP155).equal(false);
        });
    });

    it('should add a new network that does not exist in our list', async () => {
        sinon.stub(ethereumChain, 'getCustomRpcChainId').resolves(19999);
        sinon.stub(networkController.getProvider(), 'getNetwork').resolves({
            chainId: 19999,
            name: 'test',
        });
        const network: AddNetworkType = {
            chainName: 'test',
            chainId: 19999,
            rpcUrls: ['https://test-network.io:8545'],
            blockExplorerUrls: ['https://test-network.io'],
            iconUrls: [''],
            test: true,
            nativeCurrency: {
                symbol: 'TEST',
                decimals: 18,
                name: 'Test Token',
            },
        };
        await networkController.addNetwork(network);
        expect(Object.keys(networkController.networks)).to.includes(
            'CHAIN-19999'
        );
    });

    // TODO: Add more tests for addNetwork flow
});
