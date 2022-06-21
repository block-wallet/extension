import { mockApiResponse } from '../../../../mocks/mockApiResponse';

export const TornadoRelayerMock = mockApiResponse({
    rewardAccount: '0x7542Be8193A34b984903A92e36e8c6F5a4A63c17',
    instances: {
        eth: {
            instanceAddress: {
                '1': '0x3aac1cC67c2ec5Db4eA850957b967Ba153aD6279',
                '10': '0x723B78e67497E85279CB204544566F4dC5d2acA0',
                '100': '0x0E3A09dDA6B20aFbB34aC7cD4A6881493f3E7bf7',
                '0.1': '0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7',
            },
            symbol: 'ETH',
            decimals: 18,
        },
        dai: {
            instanceAddress: {
                '100': '0x76D85B4C0Fc497EeCc38902397aC608000A06607',
                '1000': '0xCC84179FFD19A1627E79F8648d09e095252Bc418',
                '10000': '0x435aEa5B50CBE34CaC0b42d195da587b923200C3',
            },
            tokenAddress: '0xdc31ee1784292379fbb2964b3b9c4124d8f89c60',
            symbol: 'DAI',
            decimals: 18,
        },
    },
    netId: 5,
    ethPrices: {
        dai: '283482591704018',
        cdai: '6066623185041',
        usdc: '282800357455943',
        usdt: '283794295053285',
        wbtc: '16207614089077625466',
        torn: '126436548376989568',
    },
    tornadoServiceFee: 0.05,
    miningServiceFee: 0.05,
    version: '4.0.7',
    health: { status: 'true', error: '' },
    currentQueue: 0,
});
