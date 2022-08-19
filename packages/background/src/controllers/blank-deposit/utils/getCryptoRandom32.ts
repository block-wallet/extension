/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * It returns a random value in the range [0, maxValue) - randomness can only
 * be ensured when maxValue <= 2^32
 *
 * @param maxValue The max excluded value of the range [0, maxValue)
 */
const getCryptoRandom32 = (maxValue: number): number => {
    let randomInRange;
    if (typeof window !== 'undefined') {
        if (!window.crypto) {
            throw new Error('Browser does not support Crypto lib');
        }
        randomInRange =
            window.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    } else {
        const { randomBytes } = require('crypto');
        randomInRange = randomBytes(4).readUInt32LE() / 0x100000000;
    }
    return Math.floor(randomInRange * maxValue);
};

export default getCryptoRandom32;
