import { toChecksumAddress } from 'ethereumjs-util';
import { defaultAbiCoder, hexDataLength } from 'ethers/lib/utils';

export function paddedToChecksumAddress(paddedAddress: string): string {
    try {
        return defaultAbiCoder.decode(['address'], paddedAddress)[0] as string;
    } catch (e) {
        if (hexDataLength(paddedAddress) === 20) {
            return toChecksumAddress(paddedAddress);
        }
        throw new Error('Invalid address to unpad', e);
    }
}
