/**
 * unixTimestampToJSTimestamp
 * Converts UNIX timestamp to JS timestamp
 * JSTimestamp = UNIXTimestamp * 1000
 * @param unixTimestamp
 * @returns jsTImestamp
 */

export function unixTimestampToJSTimestamp(
    unixTimestamp: number | undefined
): number | undefined {
    return unixTimestamp ? unixTimestamp * 1000 : unixTimestamp;
}
