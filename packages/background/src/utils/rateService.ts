import { BigNumber, Contract, ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { RATES_IDS_LIST } from '@block-wallet/chains-assets';
import CHAINLINK_DATAFEEDS_CONTRACTS from './chain-link/dataFeeds';
import httpClient from '../utils/http';
interface getRateOptions {
    networkProvider?: ethers.providers.StaticJsonRpcProvider;
}

export interface RateService {
    getRate(
        currency: string,
        symbol: string,
        options?: getRateOptions
    ): Promise<number>;
}

export const BaseApiEndpoint = 'https://api.coingecko.com/api/v3/simple/';

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
            console.log('Failed fecthing price from ChainLink. Ex: ' + e);
            return 0;
        }
    },
};

export const coingekoService: RateService = {
    async getRate(currency, symbol) {
        try {
            const query = `${BaseApiEndpoint}price`;
            const currencyApiId = overloadCurrencyApiId(
                RATES_IDS_LIST[
                    symbol.toUpperCase() as keyof typeof RATES_IDS_LIST
                ]
            );

            const response = await httpClient.get<
                Record<string, Record<string, number>>
            >(query, {
                ids: currencyApiId,
                vs_currencies: currency,
            });

            return response[currencyApiId][currency];
        } catch (e) {
            console.log('Failed fecthing price from Coingeko. Ex: ' + e);
            return 0;
        }
    },
};

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

export const getRateService = (
    nativeCurrency: string,
    tokenSymbol: string
): RateService => {
    const provider =
        rateProvider[`${nativeCurrency}-${tokenSymbol}`.toLowerCase()];
    return provider || coingekoService;
};
