import NetworkController from './NetworkController';
import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber } from 'ethers';
import { PreferencesController } from './PreferencesController';
import { TokenOperationsController } from './erc-20/transactions/Transaction';
import { TransactionCategories } from './transactions/utils/types';
import { TransactionController } from './transactions/TransactionController';
import { retryHandling } from '../utils/retryHandling';
import { TokenController } from './erc-20/TokenController';
import BridgeAPI, {
    BridgeImplementation,
    IBridgeQuote,
    IBridge,
    getBridgeRoutesRequest,
    getBridgeQuoteRequest,
    IBridgeRoute,
} from '../utils/bridgeApi';
import { BASE_BRIDGE_FEE, BRIDGE_REFERRER_ADDRESS } from '../utils/types/lifi';
import { IToken } from './erc-20/Token';
import { ExchangeController } from './ExchangeController';
import { IChain } from '../utils/types/chain';
import { getChainListItem } from '../utils/chainlist';

export interface BridgeControllerMemState {
    availableBridgeChains: IChain[];
}

export enum BridgeAllowanceCheck {
    NOT_CHECKED = 'NOT_CHECKED',
    ENOUGH_ALLOWANCE = 'ENOUGH_ALLOWANCE',
    INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
}

export interface BridgeQuote extends IBridgeQuote {
    // BlockWallet fee in spender token units
    blockWalletFee: BigNumber;
}

interface BridgeParameters {
    params: BridgeQuote;
    methodSignature?: ContractMethodSignature;
}

export interface GetBridgeQuoteResponse {
    bridgeParams: BridgeParameters;
    allowance: BridgeAllowanceCheck;
}

export interface BridgeTransaction extends BridgeParameters {
    customNonce?: number;
    flashbots?: boolean;
    gasPrice?: BigNumber;
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
}

export interface GetBridgeAvailableRoutesResponse {
    routes: IBridgeRoute[];
}

export interface BridgeRoutesRequest
    extends Omit<getBridgeRoutesRequest, 'fromChainId'> {}

export interface BridgeQuoteRequest
    extends Omit<getBridgeQuoteRequest, 'fromChainId'> {}

/**
 * Bridge Controller
 *
 * This class handles BlockWallet native exchange actions.
 *
 * Provides functionality to approve an asset transfer, fetch quotes for exchanges
 * depending on the exchange type, and execute the transactions.
 */
export default class BridgeController extends ExchangeController<
    undefined,
    BridgeControllerMemState
> {
    constructor(
        protected readonly _networkController: NetworkController,
        protected readonly _preferencesController: PreferencesController,
        protected readonly _tokenOperationsController: TokenOperationsController,
        protected readonly _transactionController: TransactionController,
        private readonly _tokenController: TokenController
    ) {
        super(
            _networkController,
            _preferencesController,
            _tokenOperationsController,
            _transactionController,
            undefined,
            {
                availableBridgeChains: [],
            }
        );
        this.getAvailableChains();
    }

    private _getAPIImplementation(
        implementation: BridgeImplementation
    ): IBridge {
        return BridgeAPI[implementation];
    }

    /**
     * Gets a quote for the specified bridge type and parameters
     *
     * @param quoteRequest Quote parameters
     * @param checkAllowance Whether check the spender allowance or not.
     */
    public getQuote = async (
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE,
        quoteRequest: BridgeQuoteRequest,
        checkAllowance = false
    ): Promise<GetBridgeQuoteResponse> => {
        let allowanceCheck = BridgeAllowanceCheck.NOT_CHECKED;
        const contractSignatureParser = new ContractSignatureParser(
            this._networkController
        );
        const quote = await this.getQuoteFromAggregator(
            aggregator,
            quoteRequest
        );

        if (checkAllowance && quote) {
            try {
                allowanceCheck = (await this.checkExchangeAllowance(
                    quoteRequest.fromAddress,
                    BigNumber.from(quoteRequest.fromAmount),
                    quote.spender,
                    quoteRequest.fromTokenAddress
                ))
                    ? BridgeAllowanceCheck.ENOUGH_ALLOWANCE
                    : BridgeAllowanceCheck.INSUFFICIENT_ALLOWANCE;
            } catch (e) {
                throw new Error('Error checking asset allowance.');
            }
        }

        const methodSignature =
            await contractSignatureParser.getMethodSignature(
                quote.transactionRequest.data,
                quote.transactionRequest.to
            );
        return {
            bridgeParams: {
                params: quote,
                methodSignature,
            },
            allowance: allowanceCheck,
        };
    };

    /**
     * Executes the bridge
     *
     * @param bridgeTx Bridge Transaction parameters
     */
    public executeBridge = async (
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE,
        bridgeTx: BridgeTransaction
    ): Promise<string> => {
        const bridgePromise = this._executeBridgeTransaction(
            aggregator,
            bridgeTx
        );
        this._tokenController.attemptAddToken(
            bridgeTx.params.fromToken.address
        );
        this._tokenController.attemptAddToken(
            bridgeTx.params.toToken.address,
            bridgeTx.params.toChainId
        );
        return bridgePromise;
    };

    /**
     * Fetch quote details
     *
     * @param getQuoteRequest request to get a quote
     */
    private getQuoteFromAggregator = async (
        agg: BridgeImplementation,
        request: BridgeQuoteRequest
    ): Promise<BridgeQuote> => {
        const { network } = this._networkController;
        const res = await retryHandling<IBridgeQuote>(() =>
            this._getAPIImplementation(agg).getQuote({
                ...request,
                fromChainId: network.chainId,
                referer: BRIDGE_REFERRER_ADDRESS,
            })
        );

        return {
            ...res,
            blockWalletFee: BigNumber.from(res.fromAmount)
                .mul(BASE_BRIDGE_FEE * 10)
                .div(1000),
        };
    };

    /**
     * Submits the Bridge transaction
     *
     * @param aggregator the aggregator used for executing the bridge transaction
     * @param BridgeTransaction bridge transaction
     */
    private _executeBridgeTransaction = async (
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE,
        {
            flashbots,
            customNonce,
            gasPrice,
            maxFeePerGas,
            maxPriorityFeePerGas,
            params: {
                transactionRequest,
                fromToken,
                toToken,
                toAmount,
                fromAmount,
                blockWalletFee,
                fromChainId,
                toChainId,
                tool,
            },
        }: BridgeTransaction
    ): Promise<string> => {
        try {
            const { result, transactionMeta } =
                await this._transactionController.addTransaction({
                    transaction: {
                        from: transactionRequest.from,
                        to: transactionRequest.to,
                        data: transactionRequest.data,
                        value: BigNumber.from(transactionRequest.value),
                        gasPrice: gasPrice
                            ? BigNumber.from(gasPrice)
                            : undefined,
                        maxPriorityFeePerGas: maxPriorityFeePerGas
                            ? BigNumber.from(maxPriorityFeePerGas)
                            : undefined,
                        maxFeePerGas: maxFeePerGas
                            ? BigNumber.from(maxFeePerGas)
                            : undefined,
                        gasLimit: BigNumber.from(transactionRequest.gasLimit),
                        nonce: customNonce,
                    },
                    origin: 'blank',
                    customCategory: TransactionCategories.BRIDGE,
                });

            transactionMeta.flashbots = flashbots;

            transactionMeta.bridgeParams = {
                bridgeImplementation: aggregator,
                fromToken,
                toToken,
                fromTokenAmount: fromAmount,
                toTokenAmount: toAmount,
                blockWalletFee,
                fromChainId,
                toChainId,
                tool, //store the tool used for executing the bridge.
            };

            this._transactionController.updateTransaction(transactionMeta);

            this._transactionController.approveTransaction(transactionMeta.id);

            return result;
        } catch (error) {
            throw new Error('Error submitting bridge transaction.');
        }
    };

    public async getTokens(
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE
    ): Promise<IToken[]> {
        const implementor = this._getAPIImplementation(aggregator);
        const { chainId } = this._networkController.network;
        try {
            const allTokens = await implementor.getSupportedTokensForChain(
                chainId
            );
            return allTokens;
        } catch (e) {
            throw new Error('Unable to fetch tokens.');
        }
    }

    public async getAvailableChains(
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE
    ): Promise<IChain[]> {
        const implementor = this._getAPIImplementation(aggregator);
        try {
            const availableBridgeChains: IChain[] = (
                await implementor.getSupportedChains()
            ).map((chain) => {
                const knownChain = getChainListItem(chain.id);
                return {
                    ...chain,
                    logo: knownChain?.logo ? knownChain.logo : chain.logo,
                };
            });
            this.UIStore.updateState({ availableBridgeChains });
            return availableBridgeChains;
        } catch (e) {
            throw new Error('Unable to fetch chains.');
        }
    }

    public async getAvailableRoutes(
        aggregator: BridgeImplementation,
        routesRequest: BridgeRoutesRequest
    ): Promise<GetBridgeAvailableRoutesResponse> {
        const apiImplementation = this._getAPIImplementation(aggregator);
        const { network } = this._networkController;
        const routes = await apiImplementation.getRoutes({
            ...routesRequest,
            fromChainId: network.chainId,
        });
        return { routes };
    }
}
