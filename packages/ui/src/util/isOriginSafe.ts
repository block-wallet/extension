export function isOriginSafe(origin: string) {
    try {
        const url = new URL(origin)
        const domain = url.hostname
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
