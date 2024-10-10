import NetworkController from './NetworkController';

import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber } from '@ethersproject/bignumber';
import {
    MetaType,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from './transactions/utils/types';
import {
    TransactionController,
    TransactionGasEstimation,
} from './transactions/TransactionController';
import { TransactionFeeData } from './erc-20/transactions/SignedTransaction';
import { TokenController } from './erc-20/TokenController';

import TokenAllowanceController from './erc-20/transactions//TokenAllowanceController';
import { BaseController } from '../infrastructure/BaseController';
import {
    OneInchSwapRequestResponse,
    BasicToken,
    OneInchService,
    SwapTxMeta,
} from '../utils/swaps/1inch';

import {
    OPENOCEAN_AGGREGATOR_NETWORKS,
    OpenOceanService,
} from '../utils/swaps/openOcean';
import { GasPricesController } from './GasPricesController';
import { normalizeTransaction } from './transactions/utils/utils';
import { v4 as uuid } from 'uuid';

export enum ExchangeType {
    SWAP_1INCH = 'SWAP_1INCH',
    SWAP_COWSWAP = 'SWAP_COWSWAP',
    LIMIT_1INCH = 'LIMIT_1INCH',
    SWAP_OPENOCEAN = 'SWAP_OPENOCEAN',
}

// For now, we allow only one integration at the same time.
export const DEFAULT_EXCHANGE_TYPE = ExchangeType.SWAP_OPENOCEAN;

export interface SwapControllerMemState {
    availableSwapChainIds: number[];
}

export interface SwapQuoteParams {
    fromAddress?: string;
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
            availableSwapChainIds: Object.keys(
                OPENOCEAN_AGGREGATOR_NETWORKS
            ).map(Number),
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

        switch (exchangeType) {
            case ExchangeType.SWAP_1INCH:
                return await OneInchService.getSwapQuote(chainId, quoteParams);
            case ExchangeType.SWAP_OPENOCEAN: {
                const gasPrice =
                    this._gasPricesController.getHighGasPriceInGwei();

                return await OpenOceanService.getSwapQuote(chainId, {
                    ...quoteParams,
                    gasPrice,
                });
            }
            default:
                throw new Error('Exchange type not supported.');
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
                throw new Error('Exchange type not supported.');
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
        if (
            ![ExchangeType.SWAP_1INCH, ExchangeType.SWAP_OPENOCEAN].includes(
                exchangeType
            )
        )
            throw new Error('Exchange type not supported.');

        const swapPromise = this._executeSwap(exchangeParams);
        this._tokenController.attemptAddToken(exchangeParams.toToken.address);
        return swapPromise;
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
                    throw new Error('Exchange type not supported.');
            }
        } catch (error) {
            throw new Error('Unable to fetch exchange spender');
        }
    };

    public estimateSwapGas = async (
        tx: SwapTxMeta
    ): Promise<TransactionGasEstimation> => {
        try {
            const transactionMeta: TransactionMeta = {
                id: uuid(),
                chainId: this._networkController.network.chainId,
                origin: 'blank',
                status: TransactionStatus.UNAPPROVED,
                time: Date.now(),
                verifiedOnBlockchain: false,
                loadingGasValues: true,
                blocksDropCount: 0,
                transactionParams: normalizeTransaction({
                    from: tx.from,
                    to: tx.to,
                    data: tx.data,
                    value: BigNumber.from(tx.value),
                }),
                metaType: MetaType.REGULAR,
            };

            transactionMeta.origin = 'blank';
            return await this._transactionController.estimateGas(
                transactionMeta,
                BigNumber.from(tx.gas)
            );
        } catch (error) {
            throw new Error('Unable to estimate gas');
        }
    };

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
