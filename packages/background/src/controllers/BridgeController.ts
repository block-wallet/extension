import log from 'loglevel';
import NetworkController, { NetworkControllerState } from './NetworkController';
import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber, ethers } from 'ethers';
import { PreferencesController } from './PreferencesController';
import { TokenOperationsController } from './erc-20/transactions/Transaction';
import {
    MetaType,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from './transactions/utils/types';
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
import { IToken, Token } from './erc-20/Token';
import { ExchangeController } from './ExchangeController';
import { IChain } from '../utils/types/chain';
import { getChainListItem } from '../utils/chainlist';
import { TransactionByHash } from './TransactionWatcherController';
import { sleep } from '../utils/sleep';
import { MILISECOND, MINUTE, SECOND } from '../utils/constants/time';
import { TransactionReceipt } from '@ethersproject/providers';
import { toChecksumAddress } from 'ethereumjs-util';
const STATUS_API_CALLS_DELAY = 2 * SECOND;
const GET_TX_RECEIPT_DELAY = 2 * SECOND;

export interface BridgeControllerMemState {
    availableBridgeChains: IChain[];
}

interface PendingBridgeReceivingTransaction {
    hash: string;
    toToken: IToken;
    sendingTransactionId: string;
}

export interface BridgeControllerState {
    //stores all the receiving transactions for the user's networks.
    bridgeReceivingTransactions: {
        [chainId: number]: {
            [address: string]: TransactionByHash;
        };
    };

    //stores all the hashes of the receiving transactions for the chains the user hasn't already added to the wallet.
    perndingBridgeReceivingTransactions: {
        [chainId: number]: {
            [address: string]: PendingBridgeReceivingTransaction[];
        };
    };
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
 * This class handles BlockWallet Bridges.
 *
 * Provides functionality to fetch chains, tokens and routes to potentially execute bridges transactions,
 * fetch quotes for exchanges, and execute the transactions.
 *
 * Also, this controller stores the receiving transactions in the target chain of an executed bridge.
 * If the target network hasn't been added to the user's network yet,
 * this controller stores references to recunstruct the transaction once the network is added.
 */
export default class BridgeController extends ExchangeController<
    BridgeControllerState,
    BridgeControllerMemState
> {
    constructor(
        protected readonly _networkController: NetworkController,
        protected readonly _preferencesController: PreferencesController,
        protected readonly _tokenOperationsController: TokenOperationsController,
        protected readonly _transactionController: TransactionController,
        private readonly _tokenController: TokenController,
        initialState?: BridgeControllerState
    ) {
        super(
            _networkController,
            _preferencesController,
            _tokenOperationsController,
            _transactionController,
            initialState,
            {
                availableBridgeChains: [],
            }
        );

        this.getAvailableChains();

        this._networkController.store.subscribe(
            (state: NetworkControllerState) => {
                const chainIds = Object.values(state.availableNetworks).map(
                    ({ chainId }) => chainId
                );

                //3

                chainIds.forEach(async (id) => {
                    await this._processPendingBridgeReceivingTransactionForChainId(
                        id
                    );
                });
            }
        );
    }

    private _getAPIImplementation(
        implementation: BridgeImplementation
    ): IBridge {
        return BridgeAPI[implementation];
    }

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
                role: 'SENDING',
                sendingTxHash: transactionMeta.transactionParams.hash!,
            };

            this._transactionController.updateTransaction(transactionMeta);

            await this._transactionController.approveTransaction(
                transactionMeta.id
            );

            this._waitForReceivingTx({
                accountAddress: transactionRequest.from,
                sendingTransaction: transactionMeta,
                fromChainId,
                toChainId,
                tool,
                toToken,
            });

            return result;
        } catch (error) {
            throw new Error('Error submitting bridge transaction.');
        }
    };

    private _updateStateTransaction(
        chainId: number,
        address: string,
        txHash: string,
        updates: Partial<TransactionMeta>
    ) {
        const stateTransactions = {
            ...(this.store.getState().bridgeReceivingTransactions || {}),
        };
        const chainTx = stateTransactions[chainId] || {};
        const addrTransactions = chainTx[address] || {};
        const newTransaction = {
            ...(addrTransactions[txHash] || {}),
            ...updates,
        };
        this.store.updateState({
            bridgeReceivingTransactions: {
                ...stateTransactions,
                [chainId]: {
                    ...chainTx,
                    [address]: {
                        ...addrTransactions,
                        [txHash]: newTransaction,
                    },
                },
            },
        });
    }

    /**
     * Waits for the receving transaction in a Bridge operation (the transaction in the target chain).
     *
     * This function executes an API call to get the receiving transaction hash and based on that gets the proper data to store in the state.
     * @param accountAddress the account address from which the bridge was executed
     * @param hash the sending transaction hash in a Bridge operation (the transaction in the current chain).
     * @param tool the bridge used
     * @param fromChainId the chain id of the sending transaction's network
     * @param fromChainId the chain id of the receiving transaction's network
     * @param toToken the token obtained in the receiving chain after executing the bridge.
     */
    private async _waitForReceivingTx({
        accountAddress,
        sendingTransaction,
        tool,
        fromChainId,
        toChainId,
        toToken,
    }: {
        sendingTransaction: TransactionMeta;
        accountAddress: string;
        tool: string;
        fromChainId: number;
        toChainId: number;
        toToken: IToken;
    }) {
        const sendingTxHash = sendingTransaction.transactionParams.hash!;
        const sendingTxId = sendingTransaction.id;
        let receivingTxHash: string | null = null;
        let notFoundCalls = 0;

        while (receivingTxHash === null || notFoundCalls < 5) {
            try {
                const bridgeStatus = await this._getAPIImplementation(
                    BridgeImplementation.LIFI_BRIDGE
                ).getStatus({
                    sendTxHash: sendingTxHash,
                    tool,
                    fromChainId,
                    toChainId,
                });

                if (!bridgeStatus || bridgeStatus.status === 'NOT_FOUND') {
                    notFoundCalls++;
                    await sleep(STATUS_API_CALLS_DELAY * (notFoundCalls + 1));
                    continue;
                }

                //transaction faield
                if (['INVALID', 'FAILED'].includes(bridgeStatus.status)) {
                    break;
                }

                if (bridgeStatus.receiveTransaction?.txHash) {
                    receivingTxHash = bridgeStatus.receiveTransaction.txHash;
                    continue;
                }

                await sleep(STATUS_API_CALLS_DELAY);
            } catch (e) {
                log.warn('_waitForReceivingTx', 'getStatus', e);
                notFoundCalls++;
            }
        }

        //bridge failed
        if (!receivingTxHash) {
            log.debug(
                '_waitForReceivingTx',
                'Receiving transaction hash not found.'
            );
            return;
        }

        //Add recevingTx hash reference to sending transaction.
        try {
            const sendingTransactionMeta =
                this._transactionController.getTransaction(sendingTxId);
            this._transactionController.updateTransactionPartially(
                sendingTxId,
                {
                    bridgeParams: {
                        ...sendingTransactionMeta!.bridgeParams!,
                        receivingTxHash,
                    },
                }
            );
        } catch (e) {
            log.warn(
                'Error updating bridge sending transaction with ID: ',
                sendingTxId
            );
        }

        this._fetchBridgeReceivingTransaction({
            accountAddress,
            receivingTxHash,
            sendingTransaction,
            toChainId,
            toToken,
        });
    }

    private _storePendingTransaction({
        toChainId,
        accountAddress,
        receivingTxHash,
        sendingTransactionId,
        toToken,
    }: {
        toChainId: number;
        accountAddress: string;
        receivingTxHash: string;
        sendingTransactionId: string;
        toToken: IToken;
    }) {
        const pendingReceivingTx = {
            ...(this.store.getState().perndingBridgeReceivingTransactions ||
                {}),
        };
        const pendingChainTx = pendingReceivingTx[toChainId] || {};
        const pendingAddressTx = [...(pendingChainTx[accountAddress] || [])];

        //If pending tx doesn't exists, then persist it.
        if (!pendingAddressTx.some((tx) => tx.hash === receivingTxHash)) {
            this.store.updateState({
                perndingBridgeReceivingTransactions: {
                    ...pendingReceivingTx,
                    [toChainId]: {
                        ...pendingChainTx,
                        [accountAddress]: [
                            ...pendingAddressTx,
                            {
                                hash: receivingTxHash,
                                sendingTransactionId,
                                toToken,
                            },
                        ],
                    },
                },
            });
        }
    }

    private async _fetchBridgeReceivingTransaction({
        toToken,
        toChainId,
        accountAddress,
        receivingTxHash,
        sendingTransaction,
    }: {
        toChainId: number;
        toToken: IToken;
        accountAddress: string;
        receivingTxHash: string;
        sendingTransaction: TransactionMeta;
    }): Promise<boolean> {
        //use user networks only
        const receivingChainIdProvider =
            this._networkController.getProviderForChainId(toChainId, true);

        //The receving chain Id hasn't been added as a user network yet
        if (!receivingChainIdProvider) {
            this._storePendingTransaction({
                accountAddress,
                receivingTxHash,
                toChainId,
                sendingTransactionId: sendingTransaction.id,
                toToken,
            });
            return false;
        }

        let transactionByHash: ethers.providers.TransactionResponse;
        try {
            transactionByHash =
                await retryHandling<ethers.providers.TransactionResponse>(
                    () =>
                        receivingChainIdProvider.getTransaction(
                            receivingTxHash!
                        ),
                    MILISECOND * 500,
                    3
                );
        } catch (e) {
            log.error('_waitForReceivingTx', 'getTransaction', e);
            return false;
        }

        const transactionMeta =
            this._transactionByHashToTransactionMeta(transactionByHash);

        //Set bridge parameters
        transactionMeta.bridgeParams = {
            ...sendingTransaction.bridgeParams!,
            role: 'RECEIVING',
        };

        this._updateStateTransaction(
            toChainId,
            accountAddress,
            receivingTxHash,
            transactionMeta
        );

        let txReceipt: TransactionReceipt | null = null;
        let isSuccess: boolean | undefined = false;
        let txReceiptRetries = 0;

        while (txReceipt === null) {
            [txReceipt, isSuccess] =
                await this._transactionController.checkTransactionReceiptStatus(
                    receivingTxHash,
                    receivingChainIdProvider
                );

            if (!txReceipt) {
                txReceiptRetries++;
                //Max sleep for 1 minute.
                await sleep(
                    Math.min(
                        GET_TX_RECEIPT_DELAY * txReceiptRetries,
                        1 * MINUTE
                    )
                );

                //TODO: Set Max retry count?
                continue;
            }
        }

        const contractSignatureParser = new ContractSignatureParser(
            this._networkController,
            toChainId
        );

        const methodSignature =
            await contractSignatureParser.getMethodSignature(
                transactionByHash.data,
                txReceipt.contractAddress
            );

        const transactionToken = await this._fetchToken(
            toToken,
            accountAddress,
            toChainId
        );

        this._updateStateTransaction(
            toChainId,
            accountAddress,
            receivingTxHash,
            {
                methodSignature,
                transactionReceipt: txReceipt,
                transferType: transactionToken
                    ? {
                          logo: transactionToken.logo,
                          decimals: transactionToken.decimals,
                          currency: transactionToken.symbol!,
                          to: transactionByHash.to,
                          amount: BigNumber.from(transactionByHash.value),
                      }
                    : undefined,
                status: isSuccess
                    ? TransactionStatus.CONFIRMED
                    : TransactionStatus.FAILED,
            }
        );

        return true;
    }

    private async _processPendingBridgeReceivingTransactionForChainId(
        chainId: number
    ) {
        const pendingTxState = {
            ...(this.store.getState().perndingBridgeReceivingTransactions ||
                {}),
        };

        const pendingTransactions = pendingTxState[chainId];

        if (!pendingTransactions) {
            return;
        }

        for (const address in Object.keys(pendingTransactions)) {
            const pendingAddrTransactions = pendingTransactions[address];
            for (const pendingTx of pendingAddrTransactions) {
                const sendingTransaction =
                    this._transactionController.getTransaction(
                        pendingTx.sendingTransactionId
                    );

                //If sending transaction doesn't exist, then avoid persisting this transaction as well.
                if (sendingTransaction) {
                    try {
                        const processedOk =
                            await this._fetchBridgeReceivingTransaction({
                                accountAddress: address,
                                receivingTxHash: pendingTx.hash,
                                toChainId: chainId,
                                toToken: pendingTx.toToken,
                                sendingTransaction,
                            });
                        return processedOk !== true; // if it was not processed ok, then don't filter it.
                    } catch (e) {
                        log.warn(
                            '_processChainPendingReceivingTransactionForChainId',
                            '_fetchBridgeReceivingTransaction',
                            e
                        );
                    }
                }
            }
        }

        //delete chainId pending transactions
        delete pendingTxState[chainId];

        this.store.updateState({
            perndingBridgeReceivingTransactions: pendingTxState,
        });
    }

    private async _fetchToken(
        transactionToken: IToken,
        accountAddress: string,
        chainId: number
    ): Promise<Token | IToken | undefined> {
        if (!transactionToken || !transactionToken.address) {
            return;
        }

        const contractAddress = toChecksumAddress(transactionToken.address);

        try {
            const tokens = await this._tokenController.search(
                contractAddress,
                true,
                accountAddress,
                chainId
            );
            //try to fetch the token from our list, if it is not present, use the transaction token data.
            return tokens.length ? tokens[0] : transactionToken;
        } catch (e) {
            log.warn('_fetchToken', 'tokenController.search', e);
            return transactionToken;
        }
    }

    private _transactionByHashToTransactionMeta(
        transaction: ethers.providers.TransactionResponse
    ): Partial<TransactionMeta> {
        return {
            rawTransaction: transaction.data,
            time: transaction.timestamp,
            approveTime: transaction.timestamp,
            chainId: transaction.chainId,
            origin: 'blank',
            transactionCategory: TransactionCategories.INCOMING_BRIDGE,
            metaType: MetaType.REGULAR,
            status: transaction.blockNumber
                ? TransactionStatus.CONFIRMED
                : TransactionStatus.SUBMITTED,
            transactionParams: {
                hash: transaction.hash,
                to: transaction.to,
                from: transaction.from,
                nonce: transaction.nonce,
                gasLimit: transaction.gasLimit,
                gasPrice: transaction.gasPrice,
                data: transaction.data,
                value: transaction.value,
                chainId: transaction.chainId,
                type: transaction.type,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
                maxFeePerGas: transaction.maxFeePerGas,
            },
        };
    }
}
