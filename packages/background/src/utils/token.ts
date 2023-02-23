import {
    addHexPrefix,
    isValidAddress,
    toChecksumAddress,
} from '@ethereumjs/util';
import { compareAddresses } from '../controllers/transactions/utils/utils';
import { IToken, Token } from '../controllers/erc-20/Token';
import {
    ProviderError,
    WatchAssetParameters,
    WatchAssetReq,
} from './types/ethereum';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';

const IS_BASE64_IMAGE = 'IS_BASE64_IMAGE';

/**
 * Validates an ERC20 token to be added with EIP-747
 * Address, symbol and decimals should be included
 *
 * @param token - Token object to validate.
 */
export const validateWatchAssetReq = (
    token: WatchAssetParameters['options']
): WatchAssetReq['params'] => {
    const { address, symbol, decimals, image } = token;
    let validatedImage = '';

    if (!address || !symbol || typeof decimals === 'undefined') {
        throw new Error(ProviderError.INVALID_PARAMS);
    }

    if (typeof symbol !== 'string' || symbol.length > 11) {
        throw new Error(ProviderError.INVALID_PARAMS);
    }

    let numDecimals: number = decimals;

    if (typeof decimals === 'string') {
        numDecimals = parseInt(decimals, 10);
    }

    if (isNaN(numDecimals) || numDecimals > 36 || numDecimals < 0) {
        throw new Error(ProviderError.INVALID_PARAMS);
    }

    // Prevent valid address from throwing default error
    // if value is not a hex address
    try {
        if (!isValidAddress(addHexPrefix(address))) {
            throw new Error(ProviderError.INVALID_PARAMS);
        }
    } catch (error) {
        throw new Error(ProviderError.INVALID_PARAMS);
    }

    // Validate image
    if (image) {
        if (typeof image === 'string') {
            if (isBase64(image)) {
                validatedImage = IS_BASE64_IMAGE;
            } else {
                validatedImage = image;
            }
        } else {
            throw new Error(
                'The image parameter should be a string (URL or Base64 encoded image)'
            );
        }
    }

    return {
        address: toChecksumAddress(address),
        symbol: symbol.toUpperCase(),
        decimals,
        image: validatedImage,
    };
};

/**
 * Checks if the given string is compatible with a base64 encoded image
 *
 * @param v string
 */
export const isBase64 = (v: string): boolean => {
    if (typeof v !== 'string') {
        return false;
    }

    const base64RegEx =
        // eslint-disable-next-line no-useless-escape
        /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+/]{3}=)?$/gi;

    return base64RegEx.test(v.replace(/^[^,]+,/, ''));
};

export const isNativeTokenAddress = (address: string): boolean => {
    if (!address) {
        return false;
    }

    return (
        compareAddresses(
            address,
            '0x0000000000000000000000000000000000000000'
        ) || compareAddresses(address, '0x0')
    );
};

/**
 * This function fills every empty information we have about a token.
 * @param token The original token
 * @param defaultValues the default values to fill.
 * @returns normalized token;
 */
export const fillTokenData = (
    token: IToken,
    defaultValues?: IToken
): IToken => {
    if (!defaultValues) {
        return token;
    }

    return {
        address: token.address || defaultValues.address,
        decimals: token.decimals || defaultValues.decimals,
        logo: token.logo || defaultValues.logo,
        symbol: token.symbol || defaultValues.symbol,
        name: token.name || defaultValues.name,
        type: token.type || defaultValues.type,
        l1Bridge: token.l1Bridge || defaultValues.l1Bridge,
    };
};

export function isUnlimitedAllowance(
    currentToken: Token,
    allowance: BigNumber
): boolean {
    if (allowance === MaxUint256) {
        return true;
    }

    if (currentToken.totalSupply) {
        return BigNumber.from(currentToken.totalSupply).lte(
            BigNumber.from(allowance ?? 0)
        );
    }

    return false;
}

export function mergeTokens(
    baseToken: Token | IToken,
    mergeToken: Token | IToken
): Token | IToken {
    if (!mergeToken) {
        return baseToken;
    }
    return {
        address: baseToken.address || mergeToken.address,
        name: baseToken.name || mergeToken.name,
        symbol: baseToken.symbol || mergeToken.symbol,
        decimals: baseToken.decimals || mergeToken.decimals,
        logo: baseToken.logo || mergeToken.logo,
        type: baseToken.type || mergeToken.type,
        l1Bridge: baseToken.l1Bridge || mergeToken.l1Bridge,
        totalSupply: baseToken.totalSupply || mergeToken.totalSupply,
    };
}
