import httpClient from '../utils/http';
import log from 'loglevel';
import { customHeadersForBlockWalletNode } from './nodes';
import { MINUTE } from './constants/time';
import { getFormattedSlackMessage } from './constants/slackMessage';

export const BLOCK_WALLET_SLACK_ENDPOINT =
    'https://message.blockwallet.io/simple';

export interface SlackService {
    postMessage(message: string, error: any, extraParams?: any): Promise<void>;
}

export const slackService: (
    endpoint: string,
    fallbackEndpoint?: string
) => SlackService = (baseEndpoint: string) => ({
    async postMessage(message, error, extraParams) {
        try {
            const postMessageBody = getFormattedSlackMessage(
                message,
                error,
                extraParams
            );
            const query = `${baseEndpoint}/message`;

            await httpClient.request<Record<string, Record<string, number>>>(
                query,
                {
                    headers: customHeadersForBlockWalletNode,
                    timeout: 1.5 * MINUTE,
                    method: 'POST',
                    body: postMessageBody,
                }
            );

            return;
        } catch (e) {
            log.error('Failed sending error to slack. Ex: ' + e);
            return;
        }
    },
});

export const getSlackService = (): SlackService => {
    return slackService(BLOCK_WALLET_SLACK_ENDPOINT);
};
