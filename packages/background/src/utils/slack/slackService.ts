import httpClient from '../../utils/http';
import log from 'loglevel';
import { customHeadersForBlockWalletNode } from './../nodes';
import { MINUTE } from './../constants/time';
import { toError } from '../toError';
import { slackMessageBody } from './slackUtils';
import { isDevEnvironment } from './../env';

export const BLOCK_WALLET_SLACK_ENDPOINT = 'https://slack-proxy.blockwallet.io';

export interface SlackService {
    postMessage(
        message: string,
        error: Error,
        extraParams?: any | undefined
    ): Promise<void>;
}

export const slackService: (
    endpoint: string,
    fallbackEndpoint?: string
) => SlackService = (baseEndpoint: string) => ({
    async postMessage(message, error, extraParams) {
        try {
            if (isDevEnvironment()) return;

            const query = `${baseEndpoint}`;
            const safeError = toError(error);
            const body = slackMessageBody(message, safeError, extraParams);
            await httpClient.request<Record<string, Record<string, number>>>(
                query,
                {
                    headers: customHeadersForBlockWalletNode,
                    timeout: 1.5 * MINUTE,
                    method: 'POST',
                    body: body,
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
