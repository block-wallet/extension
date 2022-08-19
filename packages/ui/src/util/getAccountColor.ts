import ColorHash from 'color-hash'

/*
There are 4 color ranges for account logo,
the chosen color range is based on the last digit from the hash
*/

export const getAccountColor = (hash: string) => {
    const regex = /\d(?=\D*$)/
    const lastDigit = parseInt((hash.match(regex) || '0')[0], 10)
    let hueMin = 0
    let hueMax = 239
    let saturation = 0.5
    if (lastDigit > 7) {
        // Green
        hueMin = 155
        hueMax = 155
        saturation = 0.35
    } else if (lastDigit > 4) {
        // Blue range
        hueMin = 216
        hueMax = 217
        saturation = 1
    } else if (lastDigit > 2) {
        // Dark blue
        hueMin = 216
        hueMax = 220
        saturation = 0.1
    } else {
        // Grey range
        hueMin = 216
        hueMax = 240
        saturation = 0.3
    }
    return new ColorHash({
        hue: { min: hueMin, max: hueMax },
        saturation,
    }).hex(hash)
}
