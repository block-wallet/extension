import log from 'loglevel';
import NetworkController from './NetworkController';
import { IToken } from './erc-20/Token';
import { IChain } from '../utils/types/chain';
import { BaseController } from '../infrastructure/BaseController';
import { Currency } from '../utils/currency';
import OnrampAPI, { IOnramp, OnrampImplementation } from '../utils/onrampApi';
import { isValidAddress, toChecksumAddress } from '@ethereumjs/util';
import { isNativeTokenAddress } from '../utils/token';

export interface OnrampControllerMemState {
    availableOnrampChains: IChain[];
}

export interface GetOnRampCurrencies {
    crypto: IToken[];
    fiat: Currency[];
}

/**
 * Onramp Controller
 *
 * This class handles BlockWallet Onramp.
 *
 * Allow to retrieve onramp currencies and availablechains from OnrampApi
 *
 */

export default class OnrampController extends BaseController<OnrampControllerMemState> {
    constructor(private readonly _networkController: NetworkController) {
        super(undefined, { availableOnrampChains: [] });

        this.getAvailableChains();
    }

    /**
     * It returns the onramp available chains
     *
     */
    public getOnrampAvailableChains(): IChain[] {
        return this.store.getState().availableOnrampChains;
    }

    private _getAPIImplementation(
        implementation: OnrampImplementation
    ): IOnramp {
        return OnrampAPI[implementation];
    }

    public async getCurrencies(
        aggregator: OnrampImplementation = OnrampImplementation.ONRAMPER_BUY
    ): Promise<GetOnRampCurrencies> {
        const implementor = this._getAPIImplementation(aggregator);
        const { name, chainId } = this._networkController.network;
        const networkName =
            name === 'mainnet' ? 'ethereum' : name.toLowerCase();
        const availableChains = this.getOnrampAvailableChains();

        try {
            const response: GetOnRampCurrencies = { crypto: [], fiat: [] };
            const allCurrenciesResponse =
                await implementor.getSupportedCurrencies();
            const currentOnrampChain = availableChains.filter(
                (chain) => chain.id === chainId
            );

            if (!currentOnrampChain.length) return response;

            const currentNetworkCryptos =
                allCurrenciesResponse.message.crypto.filter(
                    (currency) =>
                        currency.network === currentOnrampChain[0].name
                );

            currentNetworkCryptos.map((token) => {
                const tokenAddress =
                    token.address && isValidAddress(token.address)
                        ? toChecksumAddress(token.address)
                        : '';
                const nativeTokenAddress = isNativeTokenAddress(tokenAddress);
                const logoURL = !nativeTokenAddress
                    ? 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/' +
                      networkName +
                      '/assets/' +
                      tokenAddress +
                      '/logo.png'
                    : 'https://raw.githubusercontent.com/block-wallet/assets/master/blockchains/ethereum/info/logo.png';

                return response.crypto.push({
                    name: token.name,
                    symbol: token.code,
                    logo: tokenAddress !== '' ? logoURL : '',
                    type: token.id,
                    address: token.address,
                    decimals: token.decimals,
                });
            });

            response.crypto.sort((tokenA, tokenB) =>
                tokenA.name > tokenB.name
                    ? 1
                    : tokenB.name > tokenA.name
                    ? -1
                    : 0
            );
            response.fiat.push(...allCurrenciesResponse.message.fiat);

            return response;
        } catch (e) {
            throw new Error('Unable to fetch onramper currencies.');
        }
    }

    public async getAvailableChains(
        aggregator: OnrampImplementation = OnrampImplementation.ONRAMPER_BUY
    ) {
        const implementor = this._getAPIImplementation(aggregator);
        try {
            const onrampSupportedNetworks =
                await implementor.getSupportedNetworks();

            const availableChains: IChain[] = [];
            onrampSupportedNetworks.map((network) => {
                return availableChains.push({
                    name: network.networkName,
                    id: Number(network.chainId),
                    logo: '',
                    test: false,
                });
            });

            this.store.setState({
                availableOnrampChains: availableChains,
            });
        } catch (e) {
            log.error('Error fetching onramper chains', e);
            this.store.setState({
                availableOnrampChains: [],
            });
        }
    }
}
