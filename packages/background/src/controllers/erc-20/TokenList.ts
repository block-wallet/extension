/* eslint-disable @typescript-eslint/no-var-requires */
import { INetworkTokens, IToken } from './Token';
import {
    TOKENS_LIST,
    ASSETS_BLOCKCHAINS_CHAIN_ID,
} from '@block-wallet/chains-assets';
import browser from 'webextension-polyfill';

export const GOBLANK_TOKEN_DATA: {
    addresses: { [chainId in number]: string };
    name: string;
    symbol: string;
    type: string;
    decimals: number;
    logo: string;
} = {
    addresses: {
        1: '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
        137: '0xf4C83080E80AE530d6f8180572cBbf1Ac9D5d435',
    },
    name: 'GoBlank',
    symbol: 'BLANK',
    type: 'ERC20',
    decimals: 18,
    logo: browser.runtime.getURL('icons/icon-48.png'),
};

export const getBlankTokenDataByChainId = (
    chainId: number
): IToken | undefined => {
    if (!(chainId in GOBLANK_TOKEN_DATA.addresses)) {
        return undefined;
    }
    const { name, symbol, type, decimals, logo } = GOBLANK_TOKEN_DATA;
    return {
        address: GOBLANK_TOKEN_DATA.addresses[chainId],
        name,
        symbol,
        type,
        decimals,
        logo,
    };
};

const NETWORK_TOKENS_LIST: INetworkTokens = {
    42161: {}, // arbitrum
    43114: {}, // avalanchec
    820: {}, // callisto
    42220: {}, // celo
    61: {}, // classic
    64: {}, // ellaism
    59: {}, // eos
    1313114: {}, // 'ether-1'
    1: {}, // ethereu
    250: {}, // fantom
    60: {}, // gochain
    1666600000: {}, // harmony
    128: {}, // heco
    4689: {}, // iotex
    71393: {}, // nervos
    58: {}, // ontology
    10: {}, // optimism
    69: {}, // optimism kovan
    420: {}, // optimism goerli
    77: {}, // poa
    137: {}, // polygon
    80001: {}, // polygon testnet mumbai
    10000: {}, // smartbch
    56: {}, // smartchain
    361: {}, // theta
    108: {}, // thundertoken
    88: {}, // tomochain
    888: {}, // wanchain
    100: {}, // xdai
    50: {}, // xdc
    // Added Tornado supported tokens to Goerli
    5: {
        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': {
            name: 'Dai Stablecoin',
            symbol: 'DAI',
            type: 'ERC20',
            address: '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
            decimals: 18,
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
        },
        '0x822397d9a55d0fefd20F5c4bCaB33C5F65bd28Eb': {
            decimals: 8,
            symbol: 'CDAI',
            name: 'Compound Dai',
            address: '0x822397d9a55d0fefd20F5c4bCaB33C5F65bd28Eb',
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/assets/0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643/logo.png',
            type: 'ERC20',
        },
        '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C': {
            decimals: 6,
            symbol: 'USDC',
            name: 'USDC',
            address: '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C',
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            type: 'ERC20',
        },
        '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66': {
            decimals: 6,
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
            type: 'ERC20',
        },
        '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05': {
            decimals: 8,
            symbol: 'WBTC',
            name: 'Wrapped BTC',
            address: '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05',
            logo: 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
            type: 'ERC20',
        },
    }, // goerli
    3: {}, // ropsten
    42: {}, // kovan
    4: {}, // rinkeby
    97: {}, // bsc testnet
    280: {}, // zkSync alpha testnet
    1337: {}, // localhost
};

export const NETWORK_TOKENS_LIST_ARRAY: { [chainId in number]: string[] } = {};

for (const chainId in TOKENS_LIST) {
    if (!(parseInt(chainId) in NETWORK_TOKENS_LIST)) {
        NETWORK_TOKENS_LIST[parseInt(chainId)] = {};
    }
    for (const address in TOKENS_LIST[chainId]) {
        const token = TOKENS_LIST[chainId][address];

        let logo = '';
        if ('l' in token) {
            logo = 'https://' + token['l'];
        } else {
            logo = `https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/${
                ASSETS_BLOCKCHAINS_CHAIN_ID[parseInt(chainId)]
            }/assets/${address}/logo.png`;
        }

        let type = '';
        if ('t' in token) {
            switch (token['t']) {
                case 'E':
                    type = 'ERC20';
                    break;
                case 'B':
                    type = 'BEP20';
                    break;
                case 'P':
                    type = 'POLYGON';
                    break;
                case 'F':
                    type = 'FANTOM';
                    break;
                case 'W':
                    type = 'WAN20';
                    break;
                case 'C':
                    type = 'CELO';
                    break;
                case 'A':
                    type = 'AVALANCHE';
                    break;
                case 'ET':
                    type = 'ETC20';
                    break;
                case 'T':
                    type = 'TT20';
                    break;
                default:
                    type = token['t'];
            }
        }

        const iToken = {
            address: address,
            logo,
            type,
            name: token['n'],
            symbol: token['s'],
            decimals: token['de'],
        } as IToken;

        if ('l1' in token) {
            iToken.l1Bridge = {
                tokenAddress: token['l1']['t'],
                bridgeAddress: token['l1']['b'],
            };
        }

        NETWORK_TOKENS_LIST[parseInt(chainId)][address] = iToken;
    }

    // Adding/updating BlockWallet
    const blankToken = getBlankTokenDataByChainId(parseInt(chainId));
    if (blankToken) {
        NETWORK_TOKENS_LIST[parseInt(chainId)][blankToken.address] = blankToken;
    }
}

for (const chainId in NETWORK_TOKENS_LIST) {
    NETWORK_TOKENS_LIST_ARRAY[parseInt(chainId)] = Object.keys(
        NETWORK_TOKENS_LIST[parseInt(chainId)]
    );
}
export default NETWORK_TOKENS_LIST;
