import log from 'loglevel';

import { PreferencesController } from './PreferencesController';
import { BaseController } from '../infrastructure/BaseController';
import { Token } from './erc-20/Token';
import NetworkController, { NetworkEvents } from './NetworkController';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../utils/constants/networks';

import {
    RATES_IDS_LIST,
    ASSET_PLATFORMS_IDS_LIST,
} from '@block-wallet/chains-assets';

import { ActionIntervalController } from './block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import {
    getRateService,
    RateService,
    chainLinkService,
    getCoingekoService,
} from '../utils/rateService';
import {
    AccountTrackerController,
    AccountTrackerEvents,
} from './AccountTrackerController';
import { isNativeTokenAddress } from '../utils/token';
export interface ExchangeRatesControllerState {
    exchangeRates: Rates;
    networkNativeCurrency: {
        symbol: string;
        coingeckoPlatformId: string;
    };
    isRatesChangingAfterNetworkChange: boolean;
}

export interface Rates {
    [token: string]: number;
}

const DEFAULT_NETWORK_CURRENCY_ID = 'ethereum';
export class ExchangeRatesController extends BaseController<ExchangeRatesControllerState> {
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
    private _exchangeRateService: RateService;

    constructor(
        initState: ExchangeRatesControllerState,
        private readonly _preferencesController: PreferencesController,
        private readonly _networkController: NetworkController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        private readonly _accountTrackerController: AccountTrackerController
    ) {
        super({ ...initState, isRatesChangingAfterNetworkChange: false });

        this._exchangeRateFetchIntervalController =
            new ActionIntervalController(this._networkController);

        this._exchangeRateService = getRateService(
            _preferencesController.nativeCurrency.toLowerCase(),
            this.networkNativeCurrency.symbol
        );

        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            async (network: Network) => {
                try {
                    this.store.updateState({
                        isRatesChangingAfterNetworkChange: true,
                    });

                    this.updateNetworkNativeCurrencyId(network);

                    //Still use interval manager to avoid multiple request but execute immeditately.
                    this._exchangeRateFetchIntervalController.tick(
                        0,
                        async () => {
                            await this.updateExchangeRates();
                        }
                    );
                } catch (error) {
                    log.error(error);
                } finally {
                    this.store.updateState({
                        isRatesChangingAfterNetworkChange: false,
                    });
                }
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

        this._accountTrackerController.on(
            AccountTrackerEvents.BALANCE_UPDATED,
            () => {
                const { exchangeRates } = this.store.getState();
                const newTokenSymbols = Object.values(this.getTokens())
                    .map(({ token }) => token)
                    .filter(
                        (token) =>
                            !isNativeTokenAddress(token.address) &&
                            exchangeRates[token.symbol] === undefined
                    );
                if (newTokenSymbols.length) {
                    //when there are new token symbols, force fetching.
                    this._exchangeRateFetchIntervalController.tick(
                        0, //force update with 0 interval
                        async () => {
                            await this.updateExchangeRates();
                        }
                    );
                }
            }
        );
    }

    private getTokens() {
        return this._accountTrackerController.getAccountTokens(
            this._preferencesController.getSelectedAddress()
        );
    }

    /**
     * Indicates whether the exchange rates is being changed after a network change
     */
    public get isRatesChangingAfterNetworkChange(): boolean {
        return this.store.getState().isRatesChangingAfterNetworkChange;
    }

    private updateNetworkNativeCurrencyId = ({
        chainId,
        nativeCurrency,
    }: Network) => {
        let coingeckoPlatformId = DEFAULT_NETWORK_CURRENCY_ID;
        const symbol = nativeCurrency.symbol.toUpperCase();

        if (chainId in ASSET_PLATFORMS_IDS_LIST) {
            coingeckoPlatformId =
                ASSET_PLATFORMS_IDS_LIST[
                    String(chainId) as keyof typeof ASSET_PLATFORMS_IDS_LIST
                ];
        } else if (symbol in RATES_IDS_LIST) {
            coingeckoPlatformId =
                RATES_IDS_LIST[symbol as keyof typeof RATES_IDS_LIST];
        }

        this._exchangeRateService = getRateService(
            this._preferencesController.nativeCurrency.toLowerCase(),
            symbol
        );

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

        // Get network native currency rate
        const nativeCurrency =
            this._preferencesController.nativeCurrency.toLowerCase();

        rates[symbol] = await this._exchangeRateService.getRate(
            nativeCurrency,
            symbol,
            //TODO: check if we want to get the price using the mainnet datafeed even when standing on other networks
            {
                networkProvider:
                    this._networkController.getProviderFromName('mainnet'),
            }
            // this._networkController.getProvider()
        );

        //In case chainlink returns 0, we will retrieve value from Coingeko, in case of failure from chainlink
        if (
            rates[symbol] === 0 &&
            this._exchangeRateService === chainLinkService
        ) {
            rates[symbol] = await getCoingekoService().getRate(
                nativeCurrency,
                symbol
            );
        }

        // Get tokens exchange rates
        const tokenRatesQuery = await this._getTokenRates();

        const tokens = { ...this.staticTokens, ...this.getTokens() };

        Object.keys(tokens).forEach((contractAddress) => {
            const lowerAddress = contractAddress.toLowerCase();
            //TODO: Improve the way we store "unknown" convertion rates.
            const rate = tokenRatesQuery[lowerAddress] ||
                tokenRatesQuery[contractAddress] || {
                    [this._preferencesController.nativeCurrency]: 0,
                }; //Force 0 if the convertion is not returned.

            const { symbol } = tokens[contractAddress].token;
            if (symbol) {
                rates[symbol] =
                    rate[this._preferencesController.nativeCurrency];
            }
        });

        // Update rates to store
        this._setRates(rates);
    };

    /**
     * Gets the exchange rate for all tokens
     */
    private _getTokenRates = async (): Promise<{
        [lowerCaseAddress: string]: { [currency: string]: number };
    }> => {
        const tokens = { ...this.staticTokens, ...this.getTokens() };
        const service = getCoingekoService();
        return service.getTokensRates(
            this.networkNativeCurrency.coingeckoPlatformId,
            Object.keys(tokens),
            this._preferencesController.nativeCurrency
        );
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
     * Updates the tokens selected by the user
     * @param tokens User tokens
     */
    private _setRates = (rates: Rates) => {
        this.store.updateState({ exchangeRates: rates });
    };
}
