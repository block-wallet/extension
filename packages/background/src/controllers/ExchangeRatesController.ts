/* eslint-disable @typescript-eslint/no-explicit-any */
import { PreferencesController } from './PreferencesController';
import { BaseController } from '../infrastructure/BaseController';
import { Token } from './erc-20/Token';
import checksummedAddress from '../utils/checksummedAddress';
import NetworkController, { NetworkEvents } from './NetworkController';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../utils/constants/networks';

import ratesList from '../../rates-ids-list.json';
import assetPlatfomsList from '../../asset-platforms-ids-list.json';

import axios from 'axios';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import { currentTimestamp } from '../utils/constants/time';

export interface ExchangeRatesControllerState {
    exchangeRates: Rates;
    networkNativeCurrency: {
        symbol: string;
        coingeckoPlatformId: string;
    };
}

export interface Rates {
    [token: string]: number;
}

const DEFAULT_NETWORK_CURRENCY_ID = 'ethereum';
export class ExchangeRatesController extends BaseController<ExchangeRatesControllerState> {
    private readonly baseApiEndpoint =
        'https://api.coingecko.com/api/v3/simple/';
    private readonly staticTokens: { [address: string]: { token: Token } } = {
        '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
            token: { symbol: 'DAI' } as Token,
        },
        '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643': {
            token: { symbol: 'CDAI' } as Token,
        },
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            token: { symbol: 'USDC' } as Token,
        },
        '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
            token: { symbol: 'USDT' } as Token,
        },
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
            token: { symbol: 'WBTC' } as Token,
        },
    };
    private readonly _exchangeRateFetchIntervalController: ActionIntervalController;

    constructor(
        initState: ExchangeRatesControllerState,
        private readonly _preferencesController: PreferencesController,
        private readonly _networkController: NetworkController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly getTokens: () => {
            [address: string]: {
                token: Token;
            };
        }
    ) {
        super(initState);

        this._exchangeRateFetchIntervalController =
            new ActionIntervalController(this._networkController);

        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            (network: Network) => {
                this.updateNetworkNativeCurrencyId(network);
                this.updateExchangeRates();
            }
        );

        // Subscription to new blocks
        this._blockUpdatesController.on(
            BlockUpdatesEvents.BLOCK_UPDATES_SUBSCRIPTION,
            async (chainId: number) => {
                const network =
                    this._networkController.getNetworkFromChainId(chainId);
                const interval =
                    network?.actionsTimeIntervals.exchangeRatesFetch ||
                    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.exchangeRatesFetch;

                this._exchangeRateFetchIntervalController.tick(
                    interval,
                    async () => {
                        await this.updateExchangeRates();
                    }
                );
            }
        );
    }

    private updateNetworkNativeCurrencyId = ({
        chainId,
        nativeCurrency: { symbol },
    }: Network) => {
        let coingeckoPlatformId = DEFAULT_NETWORK_CURRENCY_ID;

        if (chainId in assetPlatfomsList) {
            coingeckoPlatformId =
                assetPlatfomsList[
                    String(chainId) as keyof typeof assetPlatfomsList
                ];
        } else if (symbol in ratesList) {
            coingeckoPlatformId = ratesList[symbol as keyof typeof ratesList];
        }

        this.store.updateState({
            networkNativeCurrency: {
                symbol,
                coingeckoPlatformId: coingeckoPlatformId,
            },
            exchangeRates: {
                ...this.store.getState().exchangeRates,
                // Add 0 rate while loading
                [symbol]: 0,
            },
        });
    };

    /**
     * Updates the exchange rates for all tokens
     */
    public updateExchangeRates = async (): Promise<void> => {
        const { symbol } = this.networkNativeCurrency;
        // Rates format: {[tokenTicker]: [price: number]}
        const rates = this.store.getState().exchangeRates;
        const currencyApiId =
            ratesList[
                this.networkNativeCurrency.symbol as keyof typeof ratesList
            ];

        // Get network native currency rate
        const nativeCurrencyRates = (
            await this._getNetworkNativeCurrencyRate()
        )[currencyApiId];

        // Response -> { ethereum : { [nativeCurrency] : rate }}
        rates[symbol] =
            nativeCurrencyRates[this._preferencesController.nativeCurrency];

        // Get tokens exchange rates
        const tokenRatesQuery = await this._getTokenRates();

        // Response -> {[contractAddress] : { [nativeCurrency] : rate }} | {}
        Object.keys(tokenRatesQuery).forEach((contractAddress) => {
            // Need to checksumm address given that the current assets list
            const address = checksummedAddress(contractAddress);
            const tokens = { ...this.staticTokens, ...this.getTokens() };
            const { symbol } = tokens[address].token;
            if (symbol) {
                rates[symbol] =
                    tokenRatesQuery[contractAddress][
                        this._preferencesController.nativeCurrency
                    ];
            }
        });

        // Update rates to store
        this._setRates(rates);
    };

    /**
     * Gets the exchange rate for all tokens
     */
    private _getTokenRates = async (): Promise<any> => {
        const tokens = { ...this.staticTokens, ...this.getTokens() };
        const tokenContracts = Object.keys(tokens).join(',');

        const query = `${this.baseApiEndpoint}token_price/${this.networkNativeCurrency.coingeckoPlatformId}`;

        const response = await axios.get(query, {
            params: {
                contract_addresses: tokenContracts,
                vs_currencies: this._preferencesController.nativeCurrency,
            },
        });

        if (response.status != 200) {
            throw new Error(response.statusText);
        }

        return response.data;
    };

    /**
     * Returns the current network native currency Coingecko id
     */
    public get networkNativeCurrency(): {
        symbol: string;
        coingeckoPlatformId: string;
    } {
        return this.store.getState().networkNativeCurrency;
    }

    /**
     *  Gets ethereum current price in native currency
     */
    private _getNetworkNativeCurrencyRate = async (): Promise<{
        [nativeCurrency: string]: { [vsCurrency: string]: number };
    }> => {
        const query = `${this.baseApiEndpoint}price`;
        const currencyApiId =
            ratesList[
                this.networkNativeCurrency.symbol as keyof typeof ratesList
            ];

        const response = await axios.get(query, {
            params: {
                ids: currencyApiId,
                vs_currencies: this._preferencesController.nativeCurrency,
            },
        });

        if (response.status != 200) {
            throw new Error(response.statusText);
        }

        return response.data;
    };

    /**
     * Updates the tokens selected by the user
     * @param tokens User tokens
     */
    private _setRates = (rates: Rates) => {
        this.store.updateState({ exchangeRates: rates });
    };
}
