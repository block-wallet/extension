import sinon from 'sinon';
import { expect } from 'chai';
import * as balanceChecker from '@block-wallet/background/utils/balance-checker/balanceChecker';
import NetworkController from '@block-wallet/background/controllers/NetworkController';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';
import { BigNumber } from '@ethersproject/bignumber';

describe('BalanceChecker', () => {
    let networkController: NetworkController;

    beforeEach(async () => {
        networkController = getNetworkControllerInstance();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('isSingleCallBalancesContractAvailable', async () => {
        it('current configuration', async () => {
            const contracts: { [chainId: number]: boolean } = {
                42161: true, // arbitrum
                43114: true, // avalanchec
                820: false, // callisto
                42220: false, // celo
                61: false, // classic
                64: false, // ellaism
                59: false, // eos
                1313114: false, // 'ether-1'
                1: true, // ethereum
                250: true, // fantom
                60: false, // gochain
                1666600000: false, // harmony
                128: false, // heco
                4689: false, // iotex
                71393: false, // nervos
                58: false, // ontology
                10: true, // optimism
                69: true, // optimism kovan
                420: false, // optimism goerli
                77: false, // poa
                137: true, // polygon
                80001: true, // polygon testnet mumbai
                10000: false, // smartbch
                56: true, // bsc smartchain
                361: false, // theta
                108: false, // thundertoken
                88: false, // tomochain
                888: false, // wanchain
                100: false, // xdai
                50: false, // xdc
                5: true, // goerli
                3: true, // ropsten
                42: true, // kovan
                4: true, // rinkeby
                97: true, // bsc testnet
                1337: false, // localhost
            };

            for (const chainId in contracts) {
                expect(
                    balanceChecker.isSingleCallBalancesContractAvailable(
                        parseInt(chainId)
                    )
                ).equal(contracts[chainId]);
            }
        });

        it('invalid address', async () => {
            sinon
                .stub(balanceChecker, 'getSingleCallBalancesContracts')
                .returns({
                    1: 'not a valid address',
                    2: '',
                    3: '9C3E6bdaf755A60c7418C',
                    4: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
                });

            const contracts: { [chainId: number]: boolean } = {
                1: false,
                2: false,
                3: false,
                4: true,
            };

            for (const chainId in contracts) {
                expect(
                    balanceChecker.isSingleCallBalancesContractAvailable(
                        parseInt(chainId)
                    )
                ).equal(contracts[chainId]);
            }
        });
    });

    describe('getSingleCallBalancesContract', async () => {
        it('current configuration', async () => {
            const contracts: {
                [chainId: number]: string;
            } = {
                42161: '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c', // arbitrum
                43114: '0xD023D153a0DFa485130ECFdE2FAA7e612EF94818', // avalanchec
                820: '', // callisto
                42220: '', // celo
                61: '', // classic
                64: '', // ellaism
                59: '', // eos
                1313114: '', // 'ether-1'
                1: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39', // ethereum
                250: '0x07f697424ABe762bB808c109860c04eA488ff92B', // fantom
                60: '', // gochain
                1666600000: '', // harmony
                128: '', // heco
                4689: '', // iotex
                71393: '', // nervos
                58: '', // ontology
                10: '0xB1c568e9C3E6bdaf755A60c7418C269eb11524FC', // optimism
                69: '0xB1c568e9C3E6bdaf755A60c7418C269eb11524FC', // optimism kovan
                420: '', // optimism goerli
                77: '', // poa
                137: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4', // polygon
                80001: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4', // polygon testnet mumbai
                10000: '', // smartbch
                56: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4', // bsc smartchain
                361: '', // theta
                108: '', // thundertoken
                88: '', // tomochain
                888: '', // wanchain
                100: '', // xdai
                50: '', // xdc
                5: '0x906F63676923374a7B9781BcC1B1532488d45a7a', // goerli
                3: '0xb8e671734ce5c8d7dfbbea5574fa4cf39f7a54a4', // ropsten
                42: '0x55ABBa8d669D60A10c104CC493ec5ef389EC92bb', // kovan
                4: '0x3183B673f4816C94BeF53958BaF93C671B7F8Cf2', // rinkeby
                97: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4', // bsc testnet
                1337: '', // localhost
            };

            for (const chainId in contracts) {
                expect(
                    balanceChecker.getSingleCallBalancesContract(
                        parseInt(chainId)
                    )
                ).equal(contracts[chainId]);
            }
        });

        it('invalid address', async () => {
            sinon
                .stub(balanceChecker, 'getSingleCallBalancesContracts')
                .returns({
                    1: 'not a valid address',
                    2: '',
                    3: '9C3E6bdaf755A60c7418C',
                    4: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
                });

            const contracts: { [chainId: number]: string } = {
                1: '',
                2: '',
                3: '',
                4: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
            };

            for (const chainId in contracts) {
                expect(
                    balanceChecker.getSingleCallBalancesContract(
                        parseInt(chainId)
                    )
                ).equal(contracts[chainId]);
            }
        });
    });

    describe('getContract', async () => {
        it('should detect and invalid contract address', async () => {
            sinon
                .stub(balanceChecker, 'getSingleCallBalancesContracts')
                .returns({
                    1: 'not a valid address',
                    2: '',
                    3: '9C3E6bdaf755A60c7418C',
                    4: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
                });

            try {
                balanceChecker.getContract(networkController.getProvider(), 1);
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal(
                    'Error fetching balances, contract not found or invalid. chainId: 1, contract found: ""'
                );
            }

            try {
                balanceChecker.getContract(networkController.getProvider(), 2);
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal(
                    'Error fetching balances, contract not found or invalid. chainId: 2, contract found: ""'
                );
            }

            try {
                balanceChecker.getContract(networkController.getProvider(), 3);
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal(
                    'Error fetching balances, contract not found or invalid. chainId: 3, contract found: ""'
                );
            }

            const contract = balanceChecker.getContract(
                networkController.getProvider(),
                4
            );
            expect(contract).not.equal(undefined);
        });
    });

    describe('formatAddressBalances', async () => {
        it('empty response', async () => {
            const addressBalances = balanceChecker.formatAddressBalances(
                [],
                ['0x0', '0x1'],
                []
            );

            expect(addressBalances).not.equal(undefined);
            expect(addressBalances).deep.equal({ '0x0': {}, '0x1': {} });
        });

        it('valid response', async () => {
            const addressesBalances = balanceChecker.formatAddressBalances(
                [
                    BigNumber.from('1'),
                    BigNumber.from('2'),
                    BigNumber.from('2'),
                    BigNumber.from('3'),
                ],
                ['0x0', '0x1'],
                ['0x11', '0x12']
            );

            expect(addressesBalances).not.equal(undefined);
            expect(addressesBalances).deep.equal({
                '0x0': {
                    '0x11': BigNumber.from('1'),
                    '0x12': BigNumber.from('2'),
                },
                '0x1': {
                    '0x11': BigNumber.from('2'),
                    '0x12': BigNumber.from('3'),
                },
            });
        });
    });

    describe('getAddressesBalances', async () => {
        it('multiple addresses', async () => {
            sinon.stub(balanceChecker, 'getContract').returns({
                balances: (
                    addresses: string[],
                    _ethBalance: string[]
                ): Promise<BigNumber[]> => {
                    return new Promise<BigNumber[]>((resolve) => {
                        resolve([
                            BigNumber.from('1'),
                            BigNumber.from('2'),
                            BigNumber.from('2'),
                            BigNumber.from('3'),
                        ]);
                    });
                },
            } as any);

            const balances = await balanceChecker.getAddressesBalances(
                networkController.getProvider(),
                ['0x0', '0x1'],
                ['0x11', '0x12'],
                4
            );

            expect(balances).not.equal(undefined);
            expect(balances).deep.equal({
                '0x0': {
                    '0x11': BigNumber.from('1'),
                    '0x12': BigNumber.from('2'),
                },
                '0x1': {
                    '0x11': BigNumber.from('2'),
                    '0x12': BigNumber.from('3'),
                },
            });
        });
    });

    describe('getAddressBalances', async () => {
        it('single address', async () => {
            sinon.stub(balanceChecker, 'getContract').returns({
                balances: (
                    addresses: string[],
                    _ethBalance: string[]
                ): Promise<BigNumber[]> => {
                    return new Promise<BigNumber[]>((resolve) => {
                        resolve([BigNumber.from('1'), BigNumber.from('2')]);
                    });
                },
            } as any);

            const balances = await balanceChecker.getAddressBalances(
                networkController.getProvider(),
                '0x0',
                ['0x11', '0x12'],
                4
            );

            expect(balances).not.equal(undefined);
            expect(balances).deep.equal({
                '0x11': BigNumber.from('1'),
                '0x12': BigNumber.from('2'),
            });
        });
    });
});
