import { toChecksumAddress } from 'ethereumjs-util';

export function paddedToChecksumAddress(address: string) {
    if (address.slice(0, 2) === '0x') address = address.slice(2);
    while (address.slice(0, 2) === '00') address = address.slice(2);
    return toChecksumAddress('0x' + address);
}
