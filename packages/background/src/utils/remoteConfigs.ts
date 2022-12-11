import { retryHandling } from './retryHandling';
import log from 'loglevel';
export const INCOMPATIBLE_SITES_URL =
    'https://raw.githubusercontent.com/block-wallet/remote-configs/main/provider/incompatible_sites.json';

export async function fetchIncompatibleSites(): Promise<string[]> {
    try {
        const response = await retryHandling(
            () =>
                fetch(
                    `${INCOMPATIBLE_SITES_URL}?cache=${new Date().getTime()}`
                ),
            200,
            3
        );
        const file = await response.text();
        return JSON.parse(file);
    } catch (e) {
        log.warn('Unable to fetch incomptable sites', e);
    }

    return [];
}
