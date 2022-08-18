import { toChecksumAddress } from 'ethereumjs-util';
import { memoize } from 'lodash';

const checksummedAddress = memoize((address: string) =>
    toChecksumAddress(address)
);

export default checksummedAddress;
