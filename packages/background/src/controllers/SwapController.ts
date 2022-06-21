/* eslint-disable @typescript-eslint/no-non-null-assertion */
import NetworkController from './NetworkController';
import { PreferencesController } from './PreferencesController';
import { TransactionController } from './transactions/TransactionController';
import { TransactionCategories } from './transactions/utils/types';
import { BigNumber } from 'ethers';
import axios from 'axios';
import { TokenOperationsController } from './erc-20/transactions/Transaction';
import { ApproveTransaction } from './erc-20/transactions/ApproveTransaction';
import { GasPricesController } from './GasPricesController';
import { TransactionFeeData } from './erc-20/transactions/SignedTransaction';

const MAX_UINT_256 = BigNumber.from(
    '115792089237316195423570985008687907853269984665640564039457584007913129639935'
);

export interface Swap {
    fromToken: {
        symbol: 'string';
        name: 'string';
        address: 'string';
        decimals: number;
        logoURI: 'string';
    };
    toToken: {
        symbol: 'string';
        name: 'string';
        address: 'string';
        decimals: number;
        logoURI: 'string';
    };
    toTokenAmount: 'string';
    fromTokenAmount: 'string';
    protocols: [
        // route
        {
            name: 'string';
            part: number;
            fromTokenAddress: 'string';
            toTokenAddress: 'string';
        }
    ];
    tx: {
        from: 'string';
        to: 'string';
        data: 'string'; // call data
        value: BigNumber; // amount of eth (in wei) will be sent to the contract address
        gasPrice?: BigNumber;
        maxPriorityFeePerGas?: BigNumber;
        maxFeePerGas?: BigNumber;
        gas: BigNumber;
    };
}

export interface SwapParameters {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: BigNumber | string;
    fromAddress: string;
    slippage: number;
    fee?: number;
    gasPrice?: BigNumber | string;
    maxPriorityFeePerGas?: BigNumber;
    maxFeePerGas?: BigNumber;
    referrerAddress?: string;
    destReceiver?: string;
    allowPartialFill?: string;
}

export interface QuoteParameters {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: BigNumber | string;
    fee?: number;
    gasPrice?: BigNumber | string;
}

export interface SwapControllerProps {
    networkController: NetworkController;
    gasPricesController: GasPricesController;
    preferencesController: PreferencesController;
    transactionController: TransactionController;
    tokenOperationsController: TokenOperationsController;
}

export class SwapController {
    private readonly _networkController: NetworkController;
    private readonly _gasPricesController: GasPricesController;
    private readonly _preferencesController: PreferencesController;
    private readonly _transactionController: TransactionController;
    private readonly _tokenOperationsController: TokenOperationsController;

    constructor(props: SwapControllerProps) {
        this._networkController = props.networkController;
        this._gasPricesController = props.gasPricesController;
        this._preferencesController = props.preferencesController;
        this._transactionController = props.transactionController;
        this._tokenOperationsController = props.tokenOperationsController;
    }

    /**
     * Returns swap fee in percent
     */
    public getFee = async (): Promise<number> => {
        return 1;
    };

    /**
     * Whether the owner approved the 1inch router with a high enough allowance
     */
    public isApproved = async (
        amount: BigNumber,
        tokenAddress: string
    ): Promise<boolean> => {
        const { chainId } = this._networkController.network;
        const sender = await this._getApproveSender(chainId);
        const owner = this._preferencesController.getSelectedAddress();

        const allowance = await this._tokenOperationsController.allowance(
            tokenAddress,
            owner,
            sender
        );

        return BigNumber.from(amount).lte(allowance);
    };

    /**
     * Approve the 1inch router as a spender of a certain token
     */
    public approveSender = async (tokenAddress: string): Promise<boolean> => {
        const { chainId } = this._networkController.network;
        const spender = await this._getApproveSender(chainId);
        const gasPriceLevels = this._gasPricesController.getGasPricesLevels();
        let feeData: TransactionFeeData;

        if (gasPriceLevels.average.maxPriorityFeePerGas) {
            feeData = {
                maxPriorityFeePerGas:
                    gasPriceLevels.average.maxPriorityFeePerGas,
                maxFeePerGas: gasPriceLevels.average.maxFeePerGas!,
            };
        } else {
            feeData = { gasPrice: gasPriceLevels.average.gasPrice! };
        }

        const approveTransaction = new ApproveTransaction({
            networkController: this._networkController,
            transactionController: this._transactionController,
            preferencesController: this._preferencesController,
        });

        return approveTransaction.do({
            tokenAddress,
            spender,
            amount: MAX_UINT_256,
            feeData,
        });
    };

    /**
     * Get a quote for a token swap
     */
    public getQuote = async (
        quoteParams: QuoteParameters
    ): Promise<BigNumber> => {
        const { chainId } = this._networkController.network;

        quoteParams.fee = await this.getFee();
        const result = await this._getQuote(chainId, quoteParams);

        return BigNumber.from(result.toTokenAmount);
    };

    /**
     * get Swap Details
     */
    public getSwap = async (swapParams: SwapParameters): Promise<Swap> => {
        const { chainId } = this._networkController.network;

        swapParams.fee = await this.getFee();
        swapParams.referrerAddress = await this._getReferrerAddress();

        const swap = await this._getSwap(chainId, swapParams);

        return swap;
    };

    /**
     * execute a swap
     */
    public executeSwap = async (swap: Swap): Promise<string> => {
        const { transactionMeta: meta, result } =
            await this._transactionController.addTransaction({
                transaction: {
                    from: swap.tx.from,
                    to: swap.tx.to,
                    data: swap.tx.data,
                    value: BigNumber.from(swap.tx.value),
                    gasPrice: BigNumber.from(swap.tx.gasPrice),
                    gasLimit: BigNumber.from(swap.tx.gas),
                },
                origin: 'swap',
            });

        meta.transactionCategory = TransactionCategories.BLANK_SWAP;
        this._transactionController.updateTransaction(meta);

        // Approve transaction
        await this._transactionController.approveTransaction(meta.id);

        // Return hash
        return result;
    };

    /**
     * Gets the 1inch router contract address of a given network, that should be approved as a spender
     */
    private _getApproveSender = async (chainId: number): Promise<string> => {
        const result = await axios
            .get(`https://api.1inch.exchange/v3.0/${chainId}/approve/spender`)
            .catch(function (error) {
                throw new Error(
                    'Error fetching 1inch sender to approve' + error
                );
            });

        return result.data.address;
    };

    /**
     * Gets the address that receives fees from swaps
     */
    private _getReferrerAddress = async (): Promise<string> => {
        return '0xD096ad0BB394B15c1F38dAb94F6Ef9cb0226feB0';
    };

    /**
     * Gets a quote for a swap through 1inch
     * response = https://docs.1inch.io/api/quote-swap#description-of-response-parameters
     */
    private _getQuote = async (
        chainId: number,
        quoteParams: QuoteParameters
    ): Promise<Partial<Swap>> => {
        quoteParams.amount = quoteParams.amount.toString();
        if (quoteParams.gasPrice) {
            quoteParams.gasPrice = quoteParams.gasPrice.toString();
        }

        const result = await axios
            .get(`https://api.1inch.exchange/v3.0/${chainId}/quote`, {
                params: quoteParams,
            })
            .catch(function (error) {
                throw new Error('Error getting 1inch quote ' + error);
            });

        return result.data;
    };

    /**
     * Gets swap details through 1inch
     * response = https://docs.1inch.io/api/quote-swap#description-of-response-parameters-1
     */
    private _getSwap = async (
        chainId: number,
        swapParams: SwapParameters
    ): Promise<Swap> => {
        swapParams.amount = swapParams.amount.toString();
        if (swapParams.gasPrice) {
            swapParams.gasPrice = swapParams.gasPrice.toString();
        }
        swapParams.allowPartialFill = false.toString();

        const result = await axios
            .get(`https://api.1inch.exchange/v3.0/${chainId}/swap`, {
                params: swapParams,
            })
            .catch(function (error) {
                throw new Error('Error getting 1inch swap ' + error);
            });

        const swap = result.data;

        Object.assign(swap, {
            tx: {
                from: swap.tx.from,
                to: swap.tx.to,
                data: swap.tx.data,
                value: BigNumber.from(swap.tx.value),
                gasPrice: BigNumber.from(swap.tx.gasPrice),
                gas: BigNumber.from(swap.tx.value).mul(125).div(100), // increase rough gas estimate by 25%
            },
        });

        return swap;
    };
}
