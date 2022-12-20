// limit of Crypto.getRandomValues()
// https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
const MAX_BYTES = 65536;

// Node supports requesting up to this number of bytes
// https://github.com/nodejs/node/blob/master/lib/internal/crypto/random.js#L48
const MAX_UINT32 = 4294967295;

export function randomBytes(size: number): Buffer {
    const cryptoLib =
        typeof self !== 'undefined' && self.crypto
            ? self.crypto
            : require('crypto');

    if (size > MAX_UINT32)
        throw new RangeError('Requested too many random bytes');

    const bytes = Buffer.allocUnsafe(size);

    if (size > 0) {
        // getRandomValues fails on IE if size == 0
        if (size > MAX_BYTES) {
            // this is the max bytes crypto.getRandomValues
            // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
            for (let generated = 0; generated < size; generated += MAX_BYTES) {
                // buffer.slice automatically checks if the end is past the end of
                // the buffer so we don't have to here
                cryptoLib.getRandomValues(
                    bytes.slice(generated, generated + MAX_BYTES)
                );
            }
        } else {
            cryptoLib.getRandomValues(bytes);
        }
    }

    return bytes;
}
