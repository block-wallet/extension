export interface IL1Bridge {
    tokenAddress: string;
    bridgeAddress: string;
}
export interface IToken {
    address: string;
    name: string;
    logo: string;
    type: string;
    symbol: string;
    decimals: number;
    l1Bridge?: IL1Bridge;
}

export type IAccountTokens = {
    [accountAddress: string]: INetworkTokens;
};

export type INetworkTokens = {
    [chainId: number]: ITokens;
};

export interface ITokens {
    [address: string]: IToken;
}

export class Token implements IToken {
    address: string;
    name: string;
    logo: string;
    type: string;
    symbol: string;
    decimals: number;
    l1Bridge?: IL1Bridge;

    constructor(
        address: string,
        name: string,
        symbol: string,
        decimals: number,
        type?: string,
        logo?: string,
        l1Bridge?: IL1Bridge
    ) {
        this.address = address;
        this.name = name;
        this.logo = logo || '';
        this.type = (type || 'ERC20').toUpperCase();
        this.symbol = symbol;
        this.decimals = decimals;
        this.l1Bridge = l1Bridge;
        this.decimals = decimals;
    }
}

export interface FetchTokenResponse {
    fetchFailed: boolean;
    token: Token;
}

export interface SearchTokensResponse {
    tokens: Token[];
    fetchFailed: boolean;
}
