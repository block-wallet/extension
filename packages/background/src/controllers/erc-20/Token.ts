import { BigNumber } from '@ethersproject/bignumber';

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
    totalSupply?: BigNumber;
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
    totalSupply?: BigNumber;
    order?: number;

    constructor(
        address: string,
        name: string,
        symbol: string,
        decimals: number,
        type?: string,
        logo?: string,
        l1Bridge?: IL1Bridge,
        totalSupply?: BigNumber
    ) {
        this.address = address;
        this.name = name;
        this.logo = logo || '';
        this.type = (type || 'ERC20').toUpperCase();
        this.symbol = symbol;
        this.decimals = decimals;
        this.l1Bridge = l1Bridge;
        this.decimals = decimals;
        this.totalSupply = totalSupply;
    }

    static new(token: IToken): Token {
        return new Token(
            token.address,
            token.name,
            token.symbol,
            token.decimals,
            token.type,
            token.logo,
            token.l1Bridge,
            token.totalSupply
        );
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
