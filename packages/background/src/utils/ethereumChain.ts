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
