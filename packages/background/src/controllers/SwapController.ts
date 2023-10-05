import NetworkController from './NetworkController';

import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionCategories } from './transactions/utils/types';
import { TransactionController } from './transactions/TransactionController';
import { TransactionFeeData } from './erc-20/transactions/SignedTransaction';
import { retryHandling } from '../utils/retryHandling';
import { TokenController } from './erc-20/TokenController';

import httpClient from '../utils/http';
import TokenAllowanceController from './erc-20/transactions//TokenAllowanceController';
import { BaseController } from '../infrastructure/BaseController';
import {
    OneInchSwapQuoteResponse,
    OneInchSwapRequestResponse,
    BasicToken,
    ONEINCH_SWAPS_NETWORKS,
    OneInchSwapQuoteParams,
    OneInchSwapRequestParams,
    OneInchSpenderRes,
    ONEINCH_SWAPS_ENDPOINT,
    BASE_SWAP_FEE,
    GAS_LIMIT_INCREASE,
    REFERRER_ADDRESS,
    OneInchService,
} from '../utils/swaps/1inch';
import {
    map1InchErrorMessage,
    get1InchErrorMessageFromResponse,
} from '../utils/swaps/1inchError';
import { OpenOceanService } from '../utils/swaps/openOcean';
import { GasPricesController } from './GasPricesController';

export enum ExchangeType {
    SWAP_1INCH = 'SWAP_1INCH',
    SWAP_COWSWAP = 'SWAP_COWSWAP',
    LIMIT_1INCH = 'LIMIT_1INCH',
    SWAP_OPENOCEAN = 'SWAP_OPENOCEAN',
}

export interface SwapControllerMemState {
    availableSwapChainIds: number[];
}

export interface SwapQuoteParams {
    fromToken: BasicToken;
    toToken: BasicToken;
    amount: string;
    gasPrice?: string;
}

export interface SwapQuoteResponse {
    fromToken: BasicToken;
    toToken: BasicToken;
    fromTokenAmount: string; //	Input amount of fromToken in minimal divisible units
    toTokenAmount: string; // Result amount of toToken in minimal divisible units
    estimatedGas: number;
    // BlockWallet fee in spender token units
    blockWalletFee?: BigNumber;
}

export interface SwapRequestParams {
    fromAddress: string;
    fromToken: BasicToken;
    toToken: BasicToken;
    amount: string;
    slippage: number;
    gasPrice?: string;
}

export interface SwapParameters extends OneInchSwapRequestResponse {
    blockWalletFee: BigNumber;
    methodSignature?: ContractMethodSignature;
}

export interface SwapTransaction extends SwapParameters {
    customNonce?: number;
    flashbots?: boolean;
    gasPrice?: BigNumber;
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
}

// Interface of swap parameters that are stored in the transaction object
export interface ExchangeParams {
    exchangeType: ExchangeType;
    fromToken: BasicToken;
    toToken: BasicToken;
    fromTokenAmount: string;
    toTokenAmount: string;
    blockWalletFee: BigNumber;
}

/**
 * Exchange Controller
 *
 * This class handles BlockWallet native exchange actions.
 *
 * Provides functionality to approve an asset transfer, fetch quotes for exchanges
 * depending on the exchange type, and execute the transactions.
 */
export default class SwapController extends BaseController<
    undefined,
    SwapControllerMemState
> {
    constructor(
        private readonly _networkController: NetworkController,
        private readonly _transactionController: TransactionController,
        private readonly _tokenController: TokenController,
        private readonly _tokenAllowanceController: TokenAllowanceController,
        private readonly _gasPricesController: GasPricesController
    ) {
        super(undefined, {
            //TODO
            availableSwapChainIds: ONEINCH_SWAPS_NETWORKS,
        });
    }

    /**
     * Checks if the given account has enough allowance to make the swap
     *
     * @param account User account
     * @param amount Amount to be spended
     * @param exchangeType Exchange type
     * @param tokenAddress Asset to be spended address
     */
    public checkSwapAllowance = async (
        account: string,
        amount: BigNumber,
        exchangeType: ExchangeType,
        tokenAddress: string
    ): Promise<boolean> => {
        const spender = await this.getSpender(exchangeType);
        return this._tokenAllowanceController.checkTokenAllowance(
            account,
            amount,
            spender,
            tokenAddress
        );
    };

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param amount Exchange amount
     * @param exchangeType The exchange type
     * @param feeData Transaction gas fee data
     * @param tokenAddress Spended asset token address
     * @param customNonce Custom transaction nonce
     */
    public approveSwapExchange = async (
        allowance: BigNumber,
        amount: BigNumber,
        exchangeType: ExchangeType,
        feeData: TransactionFeeData,
        tokenAddress: string,
        customNonce?: number
    ): Promise<boolean> => {
        const spender = await this.getSpender(exchangeType);
        return this._tokenAllowanceController.approveAllowance(
            allowance,
            amount,
            spender,
            feeData,
            tokenAddress,
            customNonce
        );
    };

    /**
     * Gets a quote for the specified exchange type and parameters
     *
     * @param exchangeType Exchange type
     * @param quoteParams Quote parameters
     */
    public getExchangeQuote = async (
        exchangeType: ExchangeType,
        quoteParams: SwapQuoteParams
    ): Promise<SwapQuoteResponse> => {
        const { chainId } = this._networkController.network;

        try {
            switch (exchangeType) {
                case ExchangeType.SWAP_1INCH:
                    return await OneInchService.getSwapQuote(
                        chainId,
                        quoteParams
                    );
                case ExchangeType.SWAP_OPENOCEAN: {
                    const gasPrice =
                        this._gasPricesController.getHighGasPriceInGwei();

                    return await OpenOceanService.getSwapQuote(chainId, {
                        ...quoteParams,
                        gasPrice,
                    });
                }
                default:
                    throw new Error('Exchange type not supported');
            }
        } catch (error) {
            throw new Error('Unable to fetch exchange spender');
        }
    };

    /**
     * Fetch the transaction parameters to make the exchange
     *
     * @param exchangeType Exchange type
     * @param exchangeParams Exchange parameters
     */
    public getExchangeParameters = async (
        exchangeType: ExchangeType,
        exchangeParams: SwapRequestParams
    ): Promise<SwapParameters> => {
        const { chainId } = this._networkController.network;
        const contractSignatureParser = new ContractSignatureParser(
            this._networkController
        );

        try {
            switch (exchangeType) {
                case ExchangeType.SWAP_1INCH:
                    return await OneInchService.getSwapParameters(
                        chainId,
                        contractSignatureParser,
                        exchangeParams
                    );
                case ExchangeType.SWAP_OPENOCEAN: {
                    const gasPrice =
                        this._gasPricesController.getHighGasPriceInGwei();
                    return await OpenOceanService.getSwapParameters(
                        chainId,
                        contractSignatureParser,
                        { ...exchangeParams, gasPrice }
                    );
                }
                default:
                    throw new Error('Exchange type not supported');
            }
        } catch (error) {
            throw new Error('Unable to fetch swap');
        }
    };

    /**
     * Executes the exchange
     *
     * @param exchangeType Exchange type
     * @param exchangeParams Exchange parameters
     */
    public executeExchange = async (
        exchangeType: ExchangeType,
        exchangeParams: SwapTransaction
    ): Promise<string> => {
        try {
            if (
                !(
                    exchangeType in
                    [ExchangeType.SWAP_1INCH, ExchangeType.SWAP_OPENOCEAN]
                )
            )
                throw new Error('Exchange type not supported');

            const swapPromise = this._executeSwap(exchangeParams);
            this._tokenController.attemptAddToken(
                exchangeParams.toToken.address
            );
            return swapPromise;
        } catch (error) {
            throw new Error('Unable to fetch swap');
        }
    };

    /**
     * Returns the spender to be approved for the asset transfer for the
     * specified exchange type
     *
     * @param exchangeType
     */
    public getSpender = async (exchangeType: ExchangeType): Promise<string> => {
        const { chainId } = this._networkController.network;

        try {
            switch (exchangeType) {
                case ExchangeType.SWAP_1INCH:
                    return OneInchService.getSpender(chainId);
                case ExchangeType.SWAP_OPENOCEAN:
                    return OpenOceanService.getSpender(chainId);
                default:
                    throw new Error('Exchange type not supported');
            }
        } catch (error) {
            throw new Error('Unable to fetch exchange spender');
        }
    };

    /**
     * Fetch quote details for a 1Inch Swap
     *
     * @param OneInchSwapQuoteParams 1Inch quote parameters
     */
    //private _get1InchSwapQuote = async ({
    //    fromTokenAddress,
    //    toTokenAddress,
    //    amount,
    //}: OneInchSwapQuoteParams): Promise<SwapQuote> => {
    //    try {
    //        const res = await retryHandling<OneInchSwapQuoteResponse>(() =>
    //            httpClient.request<OneInchSwapQuoteResponse>(
    //                `${ONEINCH_SWAPS_ENDPOINT}${this._networkController.network.chainId}/quote`,
    //                {
    //                    params: {
    //                        fromTokenAddress:
    //                            fromTokenAddress === '0x0'
    //                                ? ONEINCH_NATIVE_ADDRESS
    //                                : fromTokenAddress,
    //                        toTokenAddress:
    //                            toTokenAddress === '0x0'
    //                                ? ONEINCH_NATIVE_ADDRESS
    //                                : toTokenAddress,
    //                        amount,
    //                        fee: BASE_SWAP_FEE,
    //                    },
    //                }
    //            )
    //        );

    //        return {
    //            ...res,
    //            blockWalletFee: BigNumber.from(res.fromTokenAmount)
    //                .mul(BASE_SWAP_FEE * 10)
    //                .div(1000),
    //            estimatedGas: Math.round(res.estimatedGas * GAS_LIMIT_INCREASE),
    //        };
    //    } catch (error) {
    //        const errMessage = map1InchErrorMessage(
    //            get1InchErrorMessageFromResponse(error) // Error should be of type RequestError
    //        );
    //        throw new Error(errMessage || 'Error getting 1Inch swap quote');
    //    }
    //};

    /**
     * Fetch transaction parameters for a 1Inch Swap
     *
     * @param swapParams 1Inch swap parameters
     */
    //private _get1InchSwapParameters = async (
    //    swapParams: OneInchSwapRequestParams
    //): Promise<SwapParameters> => {

    //};

    /**
     * Submits a Swap transaction
     *
     * @param SwapTransaction swap transaction
     */
    private _executeSwap = async ({
        tx,
        flashbots,
        customNonce,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        fromToken,
        toToken,
        fromTokenAmount,
        toTokenAmount,
        blockWalletFee,
    }: SwapTransaction): Promise<string> => {
        try {
            const { result, transactionMeta } =
                await this._transactionController.addTransaction({
                    transaction: {
                        from: tx.from,
                        to: tx.to,
                        data: tx.data,
                        value: BigNumber.from(tx.value),
                        gasPrice: gasPrice
                            ? BigNumber.from(gasPrice)
                            : undefined,
                        maxPriorityFeePerGas: maxPriorityFeePerGas
                            ? BigNumber.from(maxPriorityFeePerGas)
                            : undefined,
                        maxFeePerGas: maxFeePerGas
                            ? BigNumber.from(maxFeePerGas)
                            : undefined,
                        gasLimit: BigNumber.from(tx.gas),
                        nonce: customNonce,
                    },
                    origin: 'blank',
                    customCategory: TransactionCategories.EXCHANGE,
                });

            transactionMeta.flashbots = flashbots;

            transactionMeta.exchangeParams = {
                exchangeType: ExchangeType.SWAP_OPENOCEAN,
                fromToken,
                toToken,
                fromTokenAmount,
                toTokenAmount,
                blockWalletFee,
            };

            this._transactionController.updateTransaction(transactionMeta);

            this._transactionController.approveTransaction(transactionMeta.id);

            return result;
        } catch (error) {
            throw new Error('Error executing Swap');
        }
    };
}
