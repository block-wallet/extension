export const INCOMPATIBLE_SITES_URL =
    'https://raw.githubusercontent.com/block-wallet/remote-configs/main/provider/incompatible_sites.json';

export async function getIncompatibleSites(): Promise<string[]> {
    const response = await fetch(INCOMPATIBLE_SITES_URL);
    const file = await response.text();
    return JSON.parse(file);
}
