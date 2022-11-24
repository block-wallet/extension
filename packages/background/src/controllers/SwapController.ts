import NetworkController from './NetworkController';
import {
    ONEINCH_NATIVE_ADDRESS,
    ONEINCH_SWAPS_ENDPOINT,
    OneInchSpenderRes,
    OneInchSwapQuoteParams,
    OneInchSwapQuoteResponse,
    OneInchSwapRequestParams,
    OneInchSwapRequestResponse,
    BASE_SWAP_FEE,
    REFERRER_ADDRESS,
    BasicToken,
    GAS_LIMIT_INCREASE,
    ONEINCH_SWAPS_NETWORKS,
} from '../utils/types/1inch';
import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber } from 'ethers';
import { TransactionCategories } from './transactions/utils/types';
import { TransactionController } from './transactions/TransactionController';
import { TransactionFeeData } from './erc-20/transactions/SignedTransaction';
import { retryHandling } from '../utils/retryHandling';
import { TokenController } from './erc-20/TokenController';
import {
    get1InchErrorMessageFromResponse,
    map1InchErrorMessage,
} from '../utils/1inchError';
import httpClient from '../utils/http';
import TokenAllowanceController from './erc-20/transactions//TokenAllowanceController';
import { BaseController } from '../infrastructure/BaseController';

export enum ExchangeType {
    SWAP_1INCH = 'SWAP_1INCH',
    SWAP_COWSWAP = 'SWAP_COWSWAP',
    LIMIT_1INCH = 'LIMIT_1INCH',
}

export interface SwapControllerMemState {
    availableSwapChainIds: number[];
}

export interface SwapQuote extends OneInchSwapQuoteResponse {
    // BlockWallet fee in spender token units
    blockWalletFee: BigNumber;
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
        private readonly _tokenAllowanceController: TokenAllowanceController
    ) {
        super(undefined, {
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
        const spender = await this._getSpender(exchangeType);
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
        const spender = await this._getSpender(exchangeType);
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
        quoteParams: OneInchSwapQuoteParams
    ): Promise<SwapQuote> => {
        if (exchangeType === ExchangeType.SWAP_1INCH) {
            return this._get1InchSwapQuote(quoteParams);
        } else {
            throw new Error('Exchange type not supported');
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
        exchangeParams: OneInchSwapRequestParams
    ): Promise<SwapParameters> => {
        if (exchangeType === ExchangeType.SWAP_1INCH) {
            return this._get1InchSwapParameters(exchangeParams);
        } else {
            throw new Error('Exchange type not supported');
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
        if (exchangeType === ExchangeType.SWAP_1INCH) {
            const swapPromise = this._execute1InchSwap(exchangeParams);
            this._tokenController.attemptAddToken(
                exchangeParams.toToken.address
            );
            return swapPromise;
        } else {
            throw new Error('Exchange type not supported');
        }
    };

    /**
     * Fetch quote details for a 1Inch Swap
     *
     * @param OneInchSwapQuoteParams 1Inch quote parameters
     */
    private _get1InchSwapQuote = async ({
        fromTokenAddress,
        toTokenAddress,
        amount,
    }: OneInchSwapQuoteParams): Promise<SwapQuote> => {
        try {
            const res = await retryHandling<OneInchSwapQuoteResponse>(() =>
                httpClient.get<
                    OneInchSwapQuoteResponse,
                    OneInchSwapQuoteParams
                >(
                    `${ONEINCH_SWAPS_ENDPOINT}${this._networkController.network.chainId}/quote`,
                    {
                        fromTokenAddress:
                            fromTokenAddress === '0x0'
                                ? ONEINCH_NATIVE_ADDRESS
                                : fromTokenAddress,
                        toTokenAddress:
                            toTokenAddress === '0x0'
                                ? ONEINCH_NATIVE_ADDRESS
                                : toTokenAddress,
                        amount,
                        fee: BASE_SWAP_FEE,
                    }
                )
            );

            return {
                ...res,
                blockWalletFee: BigNumber.from(res.fromTokenAmount)
                    .mul(BASE_SWAP_FEE * 10)
                    .div(1000),
                estimatedGas: Math.round(res.estimatedGas * GAS_LIMIT_INCREASE),
            };
        } catch (error) {
            const errMessage = map1InchErrorMessage(
                get1InchErrorMessageFromResponse(error) // Error should be of type RequestError
            );
            throw new Error(errMessage || 'Error getting 1Inch swap quote');
        }
    };

    /**
     * Fetch transaction parameters for a 1Inch Swap
     *
     * @param swapParams 1Inch swap parameters
     */
    private _get1InchSwapParameters = async (
        swapParams: OneInchSwapRequestParams
    ): Promise<SwapParameters> => {
        const { chainId } = this._networkController.network;
        const contractSignatureParser = new ContractSignatureParser(
            this._networkController
        );

        try {
            const res = await retryHandling<OneInchSwapRequestResponse>(() =>
                httpClient.get<
                    OneInchSwapRequestResponse,
                    OneInchSwapRequestParams
                >(`${ONEINCH_SWAPS_ENDPOINT}${chainId}/swap`, {
                    ...swapParams,
                    fee: BASE_SWAP_FEE,
                    referrerAddress: REFERRER_ADDRESS,
                    allowPartialFill: false,
                })
            );

            const methodSignature =
                await contractSignatureParser.getMethodSignature(
                    res.tx.data,
                    res.tx.to
                );

            return {
                ...res,
                methodSignature,
                blockWalletFee: BigNumber.from(res.fromTokenAmount)
                    .mul(BASE_SWAP_FEE * 10)
                    .div(1000),
                tx: {
                    ...res.tx,
                    gas: Math.round(res.tx.gas * GAS_LIMIT_INCREASE),
                },
            };
        } catch (error) {
            const errMessage = map1InchErrorMessage(
                get1InchErrorMessageFromResponse(error) // Error should be of type RequestError
            );
            throw new Error(
                errMessage || 'Error getting 1Inch swap parameters'
            );
        }
    };

    /**
     * Submits a 1Inch Swap transaction
     *
     * @param SwapTransaction 1Inch swap transaction
     */
    private _execute1InchSwap = async ({
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
                exchangeType: ExchangeType.SWAP_1INCH,
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
            throw new Error('Error executing 1Inch Swap');
        }
    };

    /**
     * Returns the spender to be approved for the asset transfer for the
     * specified exchange type
     *
     * @param exchangeType
     */
    private _getSpender = async (
        exchangeType: ExchangeType
    ): Promise<string> => {
        const { chainId } = this._networkController.network;

        try {
            if (exchangeType === ExchangeType.SWAP_1INCH) {
                // 1Inch router contract address
                const res = await retryHandling<OneInchSpenderRes>(() =>
                    httpClient.get<OneInchSpenderRes>(
                        `${ONEINCH_SWAPS_ENDPOINT}${chainId}/approve/spender`
                    )
                );

                return res.address;
            } else {
                throw new Error('Exchange type not supported');
            }
        } catch (error) {
            throw new Error('Unable to fetch exchange spender');
        }
    };
}
