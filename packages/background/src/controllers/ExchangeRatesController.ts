import { PreferencesController } from './PreferencesController';
import { BaseController } from '../infrastructure/BaseController';
import { Token } from './erc-20/Token';
import checksummedAddress from '../utils/checksummedAddress';
import NetworkController, { NetworkEvents } from './NetworkController';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../utils/constants/networks';

import {
    RATES_IDS_LIST,
    ASSET_PLATFORMS_IDS_LIST,
} from '@block-wallet/chains-assets';

import axios from 'axios';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import { BigNumber, Contract } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';

type DataFeed_Contract = {
    address: string;
    abi: any;
};

type DataFeed_Contracts = {
    [key: string]: DataFeed_Contract;
};

interface RateService {
    getRate(
        currency: string,
        symbol: string,
        networkProvider?: any
    ): Promise<number>;
}

const chainLinkService: RateService = {
    async getRate(currency, symbol, networkProvider) {
        const dataFeedPair =
            symbol.toUpperCase() + '/' + currency.toUpperCase();
        const dataFeedAddress =
            CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.address;
        const dataFeedABI = CHAINLINK_DATAFEEDS_CONTRACTS[dataFeedPair]?.abi;

        if (dataFeedAddress && dataFeedABI) {
            const chainLinkDataFeedContract = new Contract(
                dataFeedAddress,
                dataFeedABI,
                networkProvider
            );

            const roundData = await chainLinkDataFeedContract.latestRoundData();
            return parseFloat(formatUnits(BigNumber.from(roundData.answer), 8));
        }

        //At this point there is no dataFeedPair in CHAINLINK_DATAFEEDS_CONTRACTS
        return 0;
    },
};

const coingekoService: RateService = {
    async getRate(currency, symbol) {
        const baseApiEndpoint = 'https://api.coingecko.com/api/v3/simple/';
        const query = `${baseApiEndpoint}price`;
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

const getRateService = (
    nativeCurrency: string,
    tokenSymbol: string
): RateService => {
    const provider =
        rateProvider[`${nativeCurrency}-${tokenSymbol}`.toLowerCase()];
    return provider || coingekoService;
};

const CHAINLINK_DATAFEEDS_CONTRACTS: DataFeed_Contracts = {
    'ETH/USD': {
        address: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
        abi: [
            {
                inputs: [
                    {
                        internalType: 'address',
                        name: '_aggregator',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: '_accessController',
                        type: 'address',
                    },
                ],
                stateMutability: 'nonpayable',
                type: 'constructor',
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'int256',
                        name: 'current',
                        type: 'int256',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'roundId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'updatedAt',
                        type: 'uint256',
                    },
                ],
                name: 'AnswerUpdated',
                type: 'event',
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'roundId',
                        type: 'uint256',
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'startedBy',
                        type: 'address',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'startedAt',
                        type: 'uint256',
                    },
                ],
                name: 'NewRound',
                type: 'event',
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'from',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'to',
                        type: 'address',
                    },
                ],
                name: 'OwnershipTransferRequested',
                type: 'event',
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'from',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'to',
                        type: 'address',
                    },
                ],
                name: 'OwnershipTransferred',
                type: 'event',
            },
            {
                inputs: [],
                name: 'acceptOwnership',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [],
                name: 'accessController',
                outputs: [
                    {
                        internalType: 'contract AccessControllerInterface',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'aggregator',
                outputs: [
                    { internalType: 'address', name: '', type: 'address' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'address',
                        name: '_aggregator',
                        type: 'address',
                    },
                ],
                name: 'confirmAggregator',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [],
                name: 'decimals',
                outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'description',
                outputs: [{ internalType: 'string', name: '', type: 'string' }],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'uint256',
                        name: '_roundId',
                        type: 'uint256',
                    },
                ],
                name: 'getAnswer',
                outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'uint80',
                        name: '_roundId',
                        type: 'uint80',
                    },
                ],
                name: 'getRoundData',
                outputs: [
                    { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                    { internalType: 'int256', name: 'answer', type: 'int256' },
                    {
                        internalType: 'uint256',
                        name: 'startedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'updatedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint80',
                        name: 'answeredInRound',
                        type: 'uint80',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'uint256',
                        name: '_roundId',
                        type: 'uint256',
                    },
                ],
                name: 'getTimestamp',
                outputs: [
                    { internalType: 'uint256', name: '', type: 'uint256' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'latestAnswer',
                outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'latestRound',
                outputs: [
                    { internalType: 'uint256', name: '', type: 'uint256' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'latestRoundData',
                outputs: [
                    { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                    { internalType: 'int256', name: 'answer', type: 'int256' },
                    {
                        internalType: 'uint256',
                        name: 'startedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'updatedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint80',
                        name: 'answeredInRound',
                        type: 'uint80',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'latestTimestamp',
                outputs: [
                    { internalType: 'uint256', name: '', type: 'uint256' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'owner',
                outputs: [
                    {
                        internalType: 'address payable',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
                name: 'phaseAggregators',
                outputs: [
                    {
                        internalType: 'contract AggregatorV2V3Interface',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'phaseId',
                outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'address',
                        name: '_aggregator',
                        type: 'address',
                    },
                ],
                name: 'proposeAggregator',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [],
                name: 'proposedAggregator',
                outputs: [
                    {
                        internalType: 'contract AggregatorV2V3Interface',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'uint80',
                        name: '_roundId',
                        type: 'uint80',
                    },
                ],
                name: 'proposedGetRoundData',
                outputs: [
                    { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                    { internalType: 'int256', name: 'answer', type: 'int256' },
                    {
                        internalType: 'uint256',
                        name: 'startedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'updatedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint80',
                        name: 'answeredInRound',
                        type: 'uint80',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'proposedLatestRoundData',
                outputs: [
                    { internalType: 'uint80', name: 'roundId', type: 'uint80' },
                    { internalType: 'int256', name: 'answer', type: 'int256' },
                    {
                        internalType: 'uint256',
                        name: 'startedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'updatedAt',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint80',
                        name: 'answeredInRound',
                        type: 'uint80',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [
                    {
                        internalType: 'address',
                        name: '_accessController',
                        type: 'address',
                    },
                ],
                name: 'setController',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [
                    { internalType: 'address', name: '_to', type: 'address' },
                ],
                name: 'transferOwnership',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [],
                name: 'version',
                outputs: [
                    { internalType: 'uint256', name: '', type: 'uint256' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ],
    },
};

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

        const rateService = getRateService(nativeCurrency, symbol);

        rates[symbol] = await rateService.getRate(
            nativeCurrency,
            symbol,
            //TODO: check if we want to get the price using the mainnet datafeed even when standing on other networks
            this._networkController.getProviderFromName('mainnet')
            // this._networkController.getProvider()
        );

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
     * Updates the tokens selected by the user
     * @param tokens User tokens
     */
    private _setRates = (rates: Rates) => {
        this.store.updateState({ exchangeRates: rates });
    };
}
