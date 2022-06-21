import { typedSignatureHash } from 'eth-sig-util';
import {
    bufferToHex,
    isValidAddress,
    stripHexPrefix,
    toChecksumAddress,
} from 'ethereumjs-util';
import {
    JSONRPCMethod,
    MessageSchema,
    NormalizedSignatureParams,
    RawSignatureData,
    SignatureParams,
    SignatureMethods,
    TypedMessage,
    TypedSignatureMethods,
} from './types/ethereum';
import { hexValue } from 'ethers/lib/utils';
import schemaValidator from 'schema-validator';

/**
 * Validates a signature request
 *
 * @param method Signature method
 * @param params Raw signature params
 * @param chainId Current chain ID
 * @returns Normalized params
 */
export const validateSignature = <TSignatureType extends SignatureMethods>(
    method: TSignatureType,
    params: RawSignatureData[TSignatureType],
    chainId: string
): NormalizedSignatureParams<TSignatureType> => {
    const nParams = normalizeParams(method, params);

    // Validate
    if (!nParams.data) {
        throw new Error('Params must include a "data" field.');
    }

    if (!nParams.address) {
        throw new Error('Params must include a "from" field.');
    }

    if (
        typeof nParams.address !== 'string' ||
        !isValidAddress(nParams.address)
    ) {
        throw new Error('Must give a valid Ethereum address string.');
    }

    // Checksum address
    nParams.address = toChecksumAddress(nParams.address);

    if (
        method === JSONRPCMethod.eth_sign ||
        method === JSONRPCMethod.personal_sign
    ) {
        if (typeof nParams.data !== 'string') {
            throw new Error('Data should be a string');
        }

        nParams.data = normalizeMessageData(nParams.data);

        if (
            method === JSONRPCMethod.eth_sign &&
            nParams.data.length !== 66 &&
            nParams.data.length !== 67
        ) {
            throw new Error('eth_sign requires a 32 byte message hash');
        }
    } else {
        // Validate
        const requestChainId = validateTypedData(
            method,
            nParams as SignatureParams<TypedSignatureMethods>
        );

        // Validate chain id
        if (requestChainId) {
            if (chainId !== hexValue(requestChainId)) {
                throw new Error(
                    'Selected chain id is different than the specified in the message'
                );
            }
        }

        // Parse params for v3 and v4
        if (typeof nParams.data === 'string') {
            nParams.data = JSON.parse(nParams.data);
        }
    }

    return nParams as NormalizedSignatureParams<TSignatureType>;
};

const normalizeParams = <TSignatureType extends SignatureMethods>(
    method: TSignatureType,
    params: RawSignatureData[TSignatureType]
): SignatureParams<TSignatureType> => {
    if (
        method === JSONRPCMethod.eth_sign ||
        method === JSONRPCMethod.eth_signTypedData_v3 ||
        method === JSONRPCMethod.eth_signTypedData_v4
    ) {
        // params: [address, data]
        return {
            address: params[0] as string,
            data: params[1],
        };
    }

    // params: [data, address]
    return {
        address: params[1],
        data: params[0],
    };
};

/**
 * Validates that the passed params have the required properties.
 * Returns chain id if specified for v3 and v4 typed messages
 *
 * @param params signature params
 */
export const validateTypedData = <
    TSignatureMethod extends TypedSignatureMethods
>(
    method: TSignatureMethod,
    params: SignatureParams<TSignatureMethod>
): void | number => {
    if (
        method === JSONRPCMethod.eth_signTypedData ||
        method === JSONRPCMethod.eth_signTypedData_v1
    ) {
        if (!Array.isArray(params.data)) {
            throw new Error('Data must be an array');
        }
        try {
            typedSignatureHash(params.data);
        } catch (error) {
            throw new Error(error.message || error);
        }
    } else {
        if (typeof params.data !== 'string') {
            throw new Error('Data must be a string');
        }

        const data = JSON.parse(params.data) as TypedMessage<MessageSchema>;

        const isValid = schemaValidator(data);

        if (!isValid) {
            throw new Error(
                'Signing data not valid. See https://git.io/fNtcx.'
            );
        }

        let chainId;

        if (typeof data.domain.chainId === 'string') {
            chainId = parseInt(data.domain.chainId, 16);
        } else {
            chainId = data.domain.chainId;
        }

        if (chainId) {
            return chainId;
        }
    }
};

/**
 * Normalize message data
 *
 * @param data Message
 * @returns Hex string
 */
export const normalizeMessageData = (data: string): string => {
    if (data[0] === '0' && data[1] === 'x') {
        return data;
    } else {
        return bufferToHex(Buffer.from(data, 'utf8'));
    }
};

/**
 * Util to rebuild a string from a hex string
 *
 * @param hex hex string
 */
export const hexToString = (hex: string): string => {
    const strippedHex = stripHexPrefix(hex);
    let output = '';

    for (let i = 0; i < strippedHex.length; i += 2) {
        output += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }

    return output;
};
