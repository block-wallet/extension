/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');
const fs = require('fs');

const readdir = fs.promises.readdir;

const readFileSync = (path: string): any =>
    JSON.parse(fs.readFileSync(path, 'utf8'));

const writeFileSync = (path: string, data: any): void =>
    fs.writeFileSync(path, JSON.stringify(data));

const get = async <T>(url: string): Promise<T> => {
    const response = await axios.get(url);
    if (response.status != 200) {
        throw new Error(`Error fetching ${url}`);
    }
    return response.data;
};

(async () => {
    interface IToken {
        address: string;
        name: string;
        logo: string;
        type: string;
        symbol: string;
        decimals: number;
        l1Bridge?: {
            tokenAddress: string;
            bridgeAddress: string;
        };
    }
    class Token implements IToken {
        address: string;
        name: string;
        logo: string;
        type: string;
        symbol: string;
        decimals: number;
        l1Bridge?: {
            tokenAddress: string;
            bridgeAddress: string;
        };

        constructor(token: IToken) {
            this.address = token.address;
            this.name = token.name;
            this.logo =
                typeof token.logo === 'string'
                    ? token.logo
                    : 'src' in token.logo
                    ? token.logo['src']
                    : '';
            this.type = token.type;
            this.symbol = token.symbol;
            this.decimals = token.decimals;

            if (token.l1Bridge) {
                this.l1Bridge = {
                    tokenAddress: token.l1Bridge.tokenAddress,
                    bridgeAddress: token.l1Bridge.bridgeAddress,
                };
            }
        }

        public toJSON() {
            const json: any = {
                n: this.name,
                l: this.logo,
                t: this.type,
                s: this.symbol,
                de: this.decimals,
                l1: this.l1Bridge
                    ? {
                          t: this.l1Bridge.tokenAddress,
                          b: this.l1Bridge.bridgeAddress,
                      }
                    : undefined,
            };

            const pattern =
                /https:\/\/raw\.githubusercontent\.com\/block-wallet\/assets\/master\/blockchains\/[a-zA-Z]+\/assets\/0x[a-fA-F0-9]{40}\/logo\.png/gm;
            if (pattern.test(this.logo)) {
                json['l'] = undefined;
            } else {
                json['l'] = json['l'].replace('https://', '');
            }

            switch (this.type) {
                case 'ERC20':
                    json['t'] = 'E';
                    break;
                case 'BEP20':
                    json['t'] = 'B';
                    break;
                case 'POLYGON':
                    json['t'] = 'P';
                    break;
                case 'FANTOM':
                    json['t'] = 'F';
                    break;
                case 'WAN20':
                    json['t'] = 'W';
                    break;
                case 'CELO':
                    json['t'] = 'C';
                    break;
                case 'AVALANCHE':
                    json['t'] = 'A';
                    break;
                case 'ETC20':
                    json['t'] = 'ET';
                    break;
                case 'TT20':
                    json['t'] = 'T';
                    break;
                case '':
                    json['t'] = undefined;
                    break;
            }

            return json;
        }
    }

    const TOKENS: { [key in number]: { [key in string]: Token } } = {};
    const NETWORKS: { [key in string]: number } = {
        arbitrum: 42161,
        avalanchec: 43114,
        callisto: 820,
        celo: 42220,
        classic: 61,
        ellaism: 64,
        eos: 59,
        'ether-1': 1313114,
        ethereum: 1,
        fantom: 250,
        gochain: 60,
        harmony: 1666600000,
        heco: 128,
        iotex: 4689,
        nervos: 71393,
        ontology: 58,
        optimism: 10,
        poa: 77,
        polygon: 137,
        smartbch: 10000,
        smartchain: 56,
        theta: 361,
        thundertoken: 108,
        tomochain: 88,
        wanchain: 888,
        xdai: 100,
        xdc: 50,
    };
    const MANUAL_BLOCKCHAINS = [NETWORKS['optimism'], NETWORKS['arbitrum']];
    const ASSETS_LIST_PATH = 'node_modules/assets/blockchains';

    const blockchains: string[] = await readdir(ASSETS_LIST_PATH);
    await Promise.all(
        blockchains.map(async (blockchain: string) => {
            const chainId: number | undefined = NETWORKS[blockchain];
            if (!chainId) {
                return;
            }

            TOKENS[chainId] = {};

            if (MANUAL_BLOCKCHAINS.includes(chainId)) {
                return;
            }

            const content: string[] = await readdir(
                `${ASSETS_LIST_PATH}/${blockchain}`
            );

            if (content.includes('assets')) {
                const assetsAddress: string[] = await readdir(
                    `${ASSETS_LIST_PATH}/${blockchain}/assets`
                );

                await Promise.all(
                    assetsAddress.map(async (assetAddress) => {
                        const tokenInfo: string[] = await readdir(
                            `${ASSETS_LIST_PATH}/${blockchain}/assets/${assetAddress}`
                        );

                        if (tokenInfo.includes('info.json')) {
                            const token = readFileSync(
                                `${ASSETS_LIST_PATH}/${blockchain}/assets/${assetAddress}/info.json`
                            );

                            if (token.status == 'active') {
                                TOKENS[chainId][assetAddress] = new Token({
                                    logo: `https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/${blockchain}/assets/${assetAddress}/logo.png`,
                                    ...token,
                                });
                            }
                        }
                    })
                );
            } else {
                const token = readFileSync(
                    `${ASSETS_LIST_PATH}/${blockchain}/info/info.json`
                );

                if (token.status == 'active') {
                    TOKENS[chainId][token.name] = new Token({
                        logo: `https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/${blockchain}/info/logo.png`,
                        ...token,
                    });
                }
            }
        })
    );

    // Optimism
    const optimismTokenList = (
        await get<{ tokens: any }>(
            `https://raw.githubusercontent.com/ethereum-optimism/ethereum-optimism.github.io/master/optimism.tokenlist.json?r=${Math.random()}`
        )
    ).tokens;
    optimismTokenList
        .filter((token: any) => token.chainId == 10)
        .forEach((token: any) => {
            let optimismBridgeAddress = '';
            if (token.extensions && token.extensions.optimismBridgeAddress) {
                optimismBridgeAddress = token.extensions.optimismBridgeAddress;
            }
            TOKENS[NETWORKS['optimism']][token.address] = new Token({
                address: token.address,
                name: token.name,
                logo: token.logoURI || '',
                type: '',
                symbol: token.symbol,
                decimals: token.decimals,
                l1Bridge: {
                    tokenAddress: '',
                    bridgeAddress: optimismBridgeAddress,
                },
            });
        });
    optimismTokenList
        .filter((token: any) => token.chainId == 1)
        .forEach((token: any) => {
            if (
                optimismTokenList.some(
                    (t: any) => t.chainId == 10 && t.name == token.name
                )
            ) {
                const optimismAddress = optimismTokenList.filter(
                    (t: any) => t.chainId == 10 && t.name == token.name
                )[0].address;
                if (
                    optimismAddress &&
                    optimismAddress in TOKENS[NETWORKS['optimism']]
                ) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    TOKENS[NETWORKS['optimism']][
                        optimismAddress
                    ].l1Bridge!.tokenAddress = token.address;
                }
            }
        });

    // Arbitrum
    const arbitrumTokenList = (
        await get<{ tokens: any }>(
            `https://bridge.arbitrum.io/token-list-42161.json?r=${Math.random()}`
        )
    ).tokens;

    arbitrumTokenList
        .filter(
            (token: any) => parseInt(token.chainId) === NETWORKS['arbitrum']
        )
        .forEach((token: any) => {
            TOKENS[NETWORKS['arbitrum']][token.address] = new Token({
                address: token.address,
                name: token.name,
                logo: token.logoURI || '',
                type: '',
                symbol: token.symbol,
                decimals: token.decimals,
                l1Bridge: {
                    tokenAddress: token.extensions?.l1Address,
                    bridgeAddress: token.extensions?.l1GatewayAddress,
                },
            });
        });

    writeFileSync('token-list.json', TOKENS);
})();

(async () => {
    // Fetch Coingecko coins list
    const coinGeckoList = await get<
        { id: string; symbol: string; name: string }[]
    >(`https://api.coingecko.com/api/v3/coins/list`);
    const ratesList = {} as { [key: string]: string };
    coinGeckoList.forEach((t) => {
        ratesList[t.symbol.toUpperCase()] = t.id;
    });

    // exceptions
    ratesList['FTM'] = 'fantom';
    ratesList['ETH'] = 'ethereum';

    writeFileSync('rates-ids-list.json', ratesList);
})();

(async () => {
    // Fetch Coingecko asset platforms list
    const coinGeckoList = await get<
        {
            id: string;
            chain_identifier: number;
            name: string;
            shortname: string;
        }[]
    >(`https://api.coingecko.com/api/v3/asset_platforms`);
    const assetPlatforms = {} as { [chainId: number]: string };

    coinGeckoList.forEach((t) => {
        if (t.chain_identifier) {
            assetPlatforms[t.chain_identifier] = t.id;
        }
    });

    writeFileSync('asset-platforms-ids-list.json', assetPlatforms);
})();
