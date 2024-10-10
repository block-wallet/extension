import { MILISECOND } from '../constants/time';
import httpClient from '../http';
import { sleep } from '../sleep';

interface EtherscanFetcherConfig {
    maxRetries: number;
    explorerAPIDelay: number;
}

const MAX_REQUEST_RETRY = 20;
const EXPLORER_API_CALLS_DELAY = 2000 * MILISECOND;

export class EtherscanFetcher {
    private readonly config: EtherscanFetcherConfig;
    constructor(
        private etherscanApiUrl: string,
        configOptions: Partial<EtherscanFetcherConfig> = {}
    ) {
        this.config = {
            explorerAPIDelay: EXPLORER_API_CALLS_DELAY,
            maxRetries: MAX_REQUEST_RETRY,
            ...configOptions,
        };
    }

    public async fetch<T>(
        params: Record<string, any>
    ): Promise<{ result: T[]; status: string }> {
        let retry = 0;
        while (retry < this.config.maxRetries) {
            const result = await httpClient.request<{
                status: string;
                message: string;
                result: T[];
            }>(`${this.etherscanApiUrl}/api`, {
                params: params,
                timeout: 30000,
            });

            if (result.status === '0' && result.message === 'NOTOK') {
                await sleep(this.config.explorerAPIDelay);
                retry++;

                continue;
            }
            return result;
        }
        return { status: '-999', result: [] };
    }
}
