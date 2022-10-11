import { BigNumber, Contract, ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { RATES_IDS_LIST } from '@block-wallet/chains-assets';
import axios from 'axios';
import CHAINLINK_DATAFEEDS_CONTRACTS from './constants/eth-usd-contract';

export interface RateService {
    getRate(
        currency: string,
        symbol: string,
        networkProvider?: any
    ): Promise<number>;
}

export const BaseApiEndpoint = 'https://api.coingecko.com/api/v3/simple/';

interface getRateOptions {
    networkProvider?: ethers.providers.StaticJsonRpcProvider;
}

export const chainLinkService: RateService = {
    async getRate(currency, symbol, options: getRateOptions = {}) {
        const dataFeedPair =
            symbol.toUpperCase() + '/' + currency.toUpperCase();
        const dataFeedAddress =
            CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.address;
        const dataFeedABI = CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.abi;

        if (dataFeedAddress && dataFeedABI) {
            const chainLinkDataFeedContract = new Contract(
                dataFeedAddress,
                dataFeedABI,
                options.networkProvider
            );

            const roundData = await chainLinkDataFeedContract.latestRoundData();
            return parseFloat(formatUnits(BigNumber.from(roundData.answer), 8));
        }

        //At this point there is no dataFeedPair in CHAINLINK_DATAFEEDS_CONTRACTS
        return 0;
    },
};

export const coingekoService: RateService = {
    async getRate(currency, symbol) {
        const query = `${BaseApiEndpoint}price`;
        const currencyApiId =
            RATES_IDS_LIST[symbol.toUpperCase() as keyof typeof RATES_IDS_LIST];

        const response = await axios.get(query, {
            params: {
                ids: currencyApiId,
                vs_currencies: currency,
            },
        });

        if (response.status != 200) {
            throw new Error(response.statusText);
        }

        return response.data[currencyApiId][currency];
    },
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
