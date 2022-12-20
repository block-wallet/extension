import { providers } from 'ethers';
import { memoize } from 'lodash';
import { getChainListItem } from './chainlist';
import {
    AddEthereumChainParameter,
    NormalizedAddEthereumChainParameter,
} from './types/ethereum';
// import {
//     isABlockWalletNode,
//     customHeadersForBlockWalletNode,
// } from '../utils/nodes';
/**
 * It validates and parses the chainId parameter checking if it's in the expected form
 *
 * @param chainId The chainId
 * @returns The normalized chainId
 */
export function validateChainId(chainId: string): number {
    if (typeof chainId !== 'string' || chainId.slice(0, 2) !== '0x') {
        throw new Error('Network chainId must be an hexadecimal string');
    }

    const normalizedChainId = parseInt(chainId, 16);
    if (isNaN(normalizedChainId)) {
        throw new Error('Provided chainId is not a valid hexadecimal value');
    }
    return normalizedChainId;
}

// EIP-3085

export const getUrlWithoutTrailingSlash = (urls?: string[]): string => {
    return urls && urls.length > 0
        ? urls[0].endsWith('/')
            ? urls[0].slice(0, -1)
            : urls[0]
        : '';
};

/**
 * Validates the shape and format of the RPC Url.
 * @param rpcUrl
 * @returns
 */

export const formatAndValidateRpcURL = (rpcUrl: string): string => {
    if (!rpcUrl) {
        throw new Error('No RPC endpoint provided');
    }
    return getUrlWithoutTrailingSlash([rpcUrl]);
};

/**
 * Validates that the provided chainId matches the returned chainId from the rpcUrl
 * @param chainId
 * @param rpcUrl
 */
export const validateNetworkChainId = async (
    chainId: number,
    rpcUrl: string
): Promise<void> => {
    // Check that chainId matches with network's
    let rpcChainId: number | undefined = undefined;
    try {
        rpcChainId = await getCustomRpcChainId(rpcUrl);
    } catch (error) {
        throw new Error(`Request to validate ${rpcUrl} Chain ID failed`);
    }

    if (rpcChainId !== chainId) {
        throw new Error(
            `The Chain ID ${rpcChainId} returned by the submitted provider's RPC(${rpcUrl}) does not match with ${chainId}`
        );
    }
};

/**
 * getCustomRpcChainId
 *
 * It obtains the chainId from the given provider RPC endpoint
 *
 * @param rpcUrl The RPC endpoint
 */
export const getCustomRpcChainId = memoize(
    async (rpcUrl: string): Promise<number> => {
        // Check that chainId matches with network's
        const tempProvider = new providers.StaticJsonRpcProvider({
            url: rpcUrl,
            // temporarily removed until cors issue is fixed
            //headers: isABlockWalletNode(rpcUrl)
            //    ? customHeadersForBlockWalletNode
            //    : undefined,
        });
        const { chainId: rpcChainId } = await tempProvider.getNetwork();

        return rpcChainId;
    }
);

/**
 * Validates the parameters passed to add a new chain
 *
 * @param params The wallet_addEthereumChain parameters to check
 */
export const validateAddEthereumChainParameters = async (
    params: AddEthereumChainParameter,
    normalizedChainId: number
): Promise<NormalizedAddEthereumChainParameter> => {
    // Get data for current chain
    const chainDataFromList = getChainListItem(normalizedChainId);

    // Destructure parameters
    const { blockExplorerUrls, chainName, iconUrls, nativeCurrency, rpcUrls } =
        params;

    // Validate received data
    if (typeof blockExplorerUrls !== 'undefined') {
        if (!Array.isArray(blockExplorerUrls)) {
            throw new Error('Invalid type for blockExplorerUrls');
        } else {
            const explorerUrl = blockExplorerUrls[0];
            if (explorerUrl && explorerUrl.indexOf('https://') === -1) {
                throw new Error('Block explorer endpoint must be https');
            }
        }
    }

    if (typeof iconUrls !== 'undefined') {
        if (!Array.isArray(iconUrls)) {
            throw new Error('Invalid type for iconUrls');
        } else {
            if (iconUrls.length > 0 && iconUrls[0].indexOf('https://') === -1) {
                throw new Error(
                    'Invalid icon URL provided: protocol must be https'
                );
            }
        }
    }

    if (typeof chainName !== 'string') {
        throw new Error('Invalid type for chainName');
    }

    if (typeof rpcUrls !== 'undefined') {
        if (!Array.isArray(rpcUrls)) {
            throw new Error('Invalid type for rpcUrls');
        } else {
            const rpcUrl = rpcUrls[0];
            if (rpcUrl && rpcUrl.indexOf('https://') === -1) {
                throw new Error('Invalid RPC provided: protocol must be https');
            }
        }
    } else {
        if (chainDataFromList) {
            const rpcUrl = chainDataFromList.rpc[0];
            if (
                typeof rpcUrl === 'undefined' ||
                rpcUrl.indexOf('https://') === -1
            ) {
                throw new Error('Invalid RPC provided');
            }
        }
    }

    if (typeof nativeCurrency !== 'undefined') {
        if (
            typeof nativeCurrency.decimals !== 'number' ||
            !Number.isInteger(nativeCurrency.decimals) ||
            nativeCurrency.decimals < 0
        ) {
            throw new Error('Invalid type for nativeCurrency.decimals');
        }

        if (typeof nativeCurrency.name !== 'string') {
            throw new Error('Invalid type for nativeCurrency.name');
        }

        if (typeof nativeCurrency.symbol !== 'string') {
            throw new Error('Invalid type for nativeCurrency.symbol');
        }
    }

    /// Parse the data prioritizing our own list except for RPC & Block Explorer,
    /// so the user can change them. (see: chainlist RPC selection)

    const nativeCurrencyIcon =
        chainDataFromList?.nativeCurrencyIcon || chainDataFromList?.logo;

    const nativeCurrencySymbol = chainDataFromList?.nativeCurrency.symbol;

    // At this point chainDataFromList has already been validated //

    // Check RPC url
    let rpcUrl = '';
    if (rpcUrls && rpcUrls.length) {
        rpcUrl = rpcUrls[0];
    } else if (
        chainDataFromList &&
        chainDataFromList.rpc &&
        chainDataFromList.rpc.length
    ) {
        rpcUrl = chainDataFromList.rpc[0];
    }

    rpcUrl = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl;
    const knownRpcUrl = chainDataFromList?.rpc
        .map((t) => (t.endsWith('/') ? t.slice(0, -1) : t))
        .includes(rpcUrl);

    // Validate RPC chainId
    let rpcChainId: number | undefined = undefined;
    try {
        rpcChainId = await getCustomRpcChainId(rpcUrl);
    } catch (error) {
        throw new Error(`Request to validate ${rpcUrl} Chain ID failed`);
    }
    if (rpcChainId !== normalizedChainId) {
        throw new Error(
            `The Chain ID ${rpcChainId} returned by the submitted provider's RPC(${rpcUrl}) does not match with ${normalizedChainId}`
        );
    }

    // Check block explorer url
    const blockExplorerUrl =
        getUrlWithoutTrailingSlash(blockExplorerUrls) ||
        getUrlWithoutTrailingSlash(
            chainDataFromList?.explorers?.map(({ url }) => url)
        ) ||
        '';

    const knownBlockExplorer = chainDataFromList?.explorers
        ?.map((t: any) => (t.url.endsWith('/') ? t.url.slice(0, -1) : t.url))
        .includes(blockExplorerUrl);

    return {
        chainId: normalizedChainId,
        chainName:
            chainDataFromList?.name ||
            chainName ||
            `chain-${normalizedChainId}`,
        iconUrl: nativeCurrencyIcon || iconUrls?.[0],
        nativeCurrency: {
            name:
                chainDataFromList?.nativeCurrency.name ||
                nativeCurrency?.name ||
                nativeCurrencySymbol ||
                'ETH',
            symbol: nativeCurrencySymbol || nativeCurrency?.symbol || 'ETH',
            decimals:
                chainDataFromList?.nativeCurrency.decimals ||
                nativeCurrency?.decimals ||
                18,
        },
        isTestnet: chainDataFromList?.isTestnet || false,
        blockExplorerUrl,
        rpcUrl,
        validations: {
            knownChainId: !!chainDataFromList,
            knownIcon: !!chainDataFromList?.logo,
            knownBlockExplorer: knownBlockExplorer || false,
            knownRpcUrl: knownRpcUrl || false,
        },
    };
};
