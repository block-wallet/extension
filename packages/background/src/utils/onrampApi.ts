import { Currency } from './currency';
import httpClient from './http';

export enum OnrampImplementation {
    ONRAMPER_BUY = 'Onramper_BUY',
}

interface OnRampToken {
    address: string;
    code: string;
    icon: string;
    id: string;
    name: string;
    network: string;
    symbol: string;
    decimals: number;
    chainId: string;
}

interface GetOnrampCurrencyResponse {
    message: {
        crypto: OnRampToken[];
        fiat: Currency[];
    };
}

interface GetOnrampNetworkResponse {
    chainId: string;
    networkName: string;
}

export interface IOnramp {
    getSupportedCurrencies: () => Promise<GetOnrampCurrencyResponse>;
    getSupportedNetworks: () => Promise<GetOnrampNetworkResponse[]>;
}

const ONRAMPER_API_KEY = 'pk_prod_01GYCJHNRP0V65F272K4Z02JY0';

const ONRAMP_ENDPOINT = 'https://api.onramper.com/';

const OnrampBuy: IOnramp = {
    getSupportedCurrencies:
        async function (): Promise<GetOnrampCurrencyResponse> {
            const apiresponse =
                await httpClient.request<GetOnrampCurrencyResponse>(
                    `${ONRAMP_ENDPOINT}/supported`,
                    {
                        headers: { Authorization: ONRAMPER_API_KEY },
                    }
                );
            return apiresponse;
        },
    getSupportedNetworks: async function (): Promise<
        GetOnrampNetworkResponse[]
    > {
        const apiresponse = await httpClient.request<GetOnrampCurrencyResponse>(
            `${ONRAMP_ENDPOINT}/supported`,
            {
                headers: { Authorization: ONRAMPER_API_KEY },
            }
        );

        const result: GetOnrampNetworkResponse[] = [];
        apiresponse.message.crypto.map((token) =>
            result.push({ chainId: token.chainId, networkName: token.network })
        );

        return result.filter(
            (value, index) =>
                result.map((r) => r.chainId).indexOf(value.chainId) === index
        );
    },
};

const onrampAPIs: Record<OnrampImplementation, IOnramp> = {
    [OnrampImplementation.ONRAMPER_BUY]: OnrampBuy,
};

export default onrampAPIs;
