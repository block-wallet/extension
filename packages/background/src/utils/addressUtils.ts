import { toChecksumAddress } from 'ethereumjs-util';
import { defaultAbiCoder } from '@ethersproject/abi';
import { hexDataLength } from '@ethersproject/bytes';

export function paddedToChecksumAddress(paddedAddress: string): string {
    try {
        return defaultAbiCoder.decode(['address'], paddedAddress)[0] as string;
    } catch (e) {
        if (hexDataLength(paddedAddress) === 20) {
            return toChecksumAddress(paddedAddress);
        }
        throw new Error('Invalid address to unpad');
    }
}
