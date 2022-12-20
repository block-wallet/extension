/**
 * isOriginSafe
 *
 * check if the origin url of the dapp is safe by making sure that the domain is not bigger than 80 characters with no more than 3 subdomains.
 *
 * @param {string} origin - the origin url of the dapp
 * @returns {boolean} true if the origin is safe, false otherwise
 *
 */
export function isOriginSafe(origin: string) {
    try {
        const url = new URL(origin)
        const domain = url.hostname
        // subdomains including the domain itself
        const subdomains = domain.split(".")
        const isSafe =
            subdomains.length <= 4 &&
            subdomains.every((subdomain) => subdomain.length <= 25) &&
            domain.length <= 80
        return isSafe
    } catch (e) {
        return false
    }
}
