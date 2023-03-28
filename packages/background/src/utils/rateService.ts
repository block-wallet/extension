import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { RATES_IDS_LIST } from '@block-wallet/chains-assets';
import CHAINLINK_DATAFEEDS_CONTRACTS from './chain-link/dataFeeds';
import httpClient from '../utils/http';
import log from 'loglevel';
import { customHeadersForBlockWalletNode } from './nodes';
import { isDevEnvironment } from './env';
import { MINUTE } from './constants/time';

export const BLOCK_WALLET_COINS_ENDPOINT = 'https://coin.blockwallet.io/simple';

export const COINGEKO_PUBLIC_ENDPOINT =
    'https://api.coingecko.com/api/v3/simple';

interface getRateOptions {
    networkProvider?: StaticJsonRpcProvider;
}

export interface RateService {
    getRate(
        currency: string,
        symbol: string,
        options?: getRateOptions
    ): Promise<number>;
}

export interface CoingekoService extends RateService {
    getTokensRates(
        coingekoPlatformId: string,
        tokenContracts: string[],
        nativeCurrency: string
    ): Promise<{
        [lowerCaseAddress: string]: { [currency: string]: number };
    }>;
}

export const chainLinkService: RateService = {
    async getRate(currency, symbol, options: getRateOptions = {}) {
        try {
            const dataFeedPair =
                symbol.toUpperCase() + '/' + currency.toUpperCase();
            const dataFeedAddress =
                CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.address;
            const dataFeedABI =
                CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.abi;

            if (dataFeedAddress && dataFeedABI) {
                const chainLinkDataFeedContract = new Contract(
                    dataFeedAddress,
                    dataFeedABI,
                    options.networkProvider
                );

                const roundData =
                    await chainLinkDataFeedContract.latestRoundData();
                return parseFloat(
                    formatUnits(BigNumber.from(roundData.answer), 8)
                );
            }

            //At this point there is no dataFeedPair in CHAINLINK_DATAFEEDS_CONTRACTS
            return 0;
        } catch (e) {
            log.error('Failed fecthing price from ChainLink. Ex: ' + e);
            return 0;
        }
    },
};

export const coingekoService: (endpoint: string) => CoingekoService = (
    baseEndpoint: string
) => ({
    async getRate(currency, symbol) {
        try {
            const query = `${baseEndpoint}/price`;
            const currencyApiId = overloadCurrencyApiId(
                RATES_IDS_LIST[
                    symbol.toUpperCase() as keyof typeof RATES_IDS_LIST
                ]
            );

            const response = await httpClient.request<
                Record<string, Record<string, number>>
            >(query, {
                params: { ids: currencyApiId, vs_currencies: currency },
                headers: customHeadersForBlockWalletNode,
                timeout: 1.5 * MINUTE, //Sometimes coingeko takes more than 1 minute to respond
            });

            return response[currencyApiId][currency];
        } catch (e) {
            log.error('Failed fecthing price from Coingeko. Ex: ' + e);
            return 0;
        }
    },
    async getTokensRates(
        coingekoPlatformId: string,
        tokenContracts: string[],
        nativeCurrency: string
    ): Promise<{
        [lowerCaseAddress: string]: { [currency: string]: number };
    }> {
        const query = `${baseEndpoint}/token_price/${coingekoPlatformId}`;

        return httpClient.request(query, {
            params: {
                contract_addresses: tokenContracts.join(','),
                vs_currencies: nativeCurrency,
            },
            headers: customHeadersForBlockWalletNode,
            timeout: 1.5 * MINUTE, //Sometimes coingeko takes more than 1 minute to respond
        });
    },
});

const overloadCurrencyApiId = (currencyApiId: string) => {
    switch (currencyApiId) {
        case 'ethereumpow':
            return 'ethereum-pow-iou';
        default:
            return currencyApiId;
    }
};

const rateProvider: Record<string, RateService> = {
    'usd-eth': chainLinkService,
};

export const getCoingekoService = (): CoingekoService => {
    return coingekoService(
        isDevEnvironment()
            ? COINGEKO_PUBLIC_ENDPOINT
            : BLOCK_WALLET_COINS_ENDPOINT
    );
};

export const getRateService = (
    nativeCurrency: string,
    tokenSymbol: string
): RateService => {
    const provider =
        rateProvider[`${nativeCurrency}-${tokenSymbol}`.toLowerCase()];
    return provider || getCoingekoService();
};
