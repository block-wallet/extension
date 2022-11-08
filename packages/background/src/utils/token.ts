import {
    addHexPrefix,
    isValidAddress,
    toChecksumAddress,
} from 'ethereumjs-util';
import { compareAddresses } from '../controllers/transactions/utils/utils';
import {
    ProviderError,
    WatchAssetParameters,
    WatchAssetReq,
} from './types/ethereum';

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
