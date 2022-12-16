import log from 'loglevel';
import NetworkController, {
    NetworkControllerState,
    NetworkEvents,
} from './NetworkController';
import {
    ContractMethodSignature,
    ContractSignatureParser,
} from './transactions/ContractSignatureParser';
import { BigNumber, ethers } from 'ethers';
import {
    BridgeTransactionParams,
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
    BridgeStatus,
    BridgeSubstatus,
    isQuoteNotFoundError,
} from '../utils/bridgeApi';
import {
    BRIDGE_REFERRER_ADDRESS,
    LiFiErrorResponse,
    LIFI_NATIVE_ADDRESS,
} from '../utils/types/lifi';
import { IToken, Token } from './erc-20/Token';
import { IChain } from '../utils/types/chain';
import { getChainListItem } from '../utils/chainlist';
import { TransactionByHash } from './TransactionWatcherController';
import { sleep } from '../utils/sleep';
import { HOUR, MILISECOND, MINUTE, SECOND } from '../utils/constants/time';
import { TransactionReceipt } from '@ethersproject/providers';
import { toChecksumAddress } from 'ethereumjs-util';
import { fetchBlockWithRetries } from '../utils/blockFetch';
import { isNil } from 'lodash';
import { BaseController } from '../infrastructure/BaseController';
import TokenAllowanceController from './erc-20/transactions//TokenAllowanceController';
import { fillTokenData, isNativeTokenAddress } from '../utils/token';
import { AccountTrackerController } from './AccountTrackerController';
const TIMEOUT_FETCH_RECEIVING_TX = 2 * HOUR;
const STATUS_API_CALLS_DELAY = 30 * SECOND;
const BRIDGE_STATUS_INVALID_MAX_COUNT = 10;
const GET_TX_RECEIPT_DELAY = 2 * SECOND;

export const BRIDGE_PENDING_STATUSES = [
    BridgeStatus.NOT_FOUND,
    BridgeStatus.PENDING,
];

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

export enum QuoteFeeStatus {
    OK = 'OK',
    INSUFFICIENT_BALANCE_TO_COVER_FEES = 'INSUFFICIENT_BALANCE_TO_COVER_FEES',
}

export type BridgeQuote = IBridgeQuote;

interface BridgeParameters {
    params: BridgeQuote;
    methodSignature?: ContractMethodSignature;
}

export type GetBridgeQuoteNotFoundResponse = LiFiErrorResponse;

export interface GetBridgeQuoteResponse {
    bridgeParams: BridgeParameters;
    allowance: BridgeAllowanceCheck;
    quoteFeeStatus: QuoteFeeStatus;
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

export type BridgeRoutesRequest = Omit<getBridgeRoutesRequest, 'fromChainId'>;

export type BridgeQuoteRequest = Omit<getBridgeQuoteRequest, 'fromChainId'>;

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
export default class BridgeController extends BaseController<
    BridgeControllerState,
    BridgeControllerMemState
> {
    constructor(
        private readonly _networkController: NetworkController,
        private readonly _transactionController: TransactionController,
        private readonly _tokenController: TokenController,
        private readonly _tokenAllowanceController: TokenAllowanceController,
        private readonly _accountTrackerController: AccountTrackerController,
        initialState?: BridgeControllerState
    ) {
        super(initialState, { availableBridgeChains: [] });

        this.getAvailableChains();

        this._networkController.on(NetworkEvents.NETWORK_CHANGE, () => {
            this.getAvailableChains();
        });

        this._networkController.store.subscribe(
            (
                state: NetworkControllerState,
                prevState?: NetworkControllerState
            ) => {
                let chainIds = Object.values(state.availableNetworks)
                    .filter((network) => network.enable)
                    .map(({ chainId }) => chainId);

                if (prevState) {
                    const oldChainIds = Object.values(
                        prevState.availableNetworks
                    )
                        .filter((network) => network.enable)
                        .map(({ chainId }) => chainId);

                    //process only the new chains
                    chainIds = chainIds.filter(
                        (id) => !oldChainIds.includes(id)
                    );
                }

                chainIds.forEach(async (id) => {
                    await this._processPendingBridgeReceivingTransactionForChainId(
                        id
                    );
                });
            }
        );

        this._processPendingBridgesAfterInit();
    }

    private _getAPIImplementation(
        implementation: BridgeImplementation
    ): IBridge {
        return BridgeAPI[implementation];
    }

    /**
     * _processPendingBridgesAfterInit
     *
     * Processes the bridge pending transactions
     * This method is meant for those that the extension was reloaded and the exection of _waitForBridgeFinalState hadn't finished.
     */
    private async _processPendingBridgesAfterInit() {
        const transactions =
            this._transactionController.getTransactions({
                transactionCategory: TransactionCategories.BRIDGE,
            }) || [];
        transactions.forEach((tx) => {
            if (
                !tx ||
                !tx.bridgeParams?.status ||
                !tx.transactionParams?.from
            ) {
                return;
            }

            if (
                BRIDGE_PENDING_STATUSES.includes(tx.bridgeParams.status || '')
            ) {
                this._waitForBridgeFinalState({
                    //tx params comes in lowercase format and we need the real address not the lowercased one.
                    accountAddress: toChecksumAddress(
                        tx.transactionParams.from
                    ),
                    fromChainId: tx.bridgeParams.fromChainId,
                    sendingTransactionId: tx.id,
                    toChainId: tx.bridgeParams.toChainId,
                    tool: tx.bridgeParams.tool,
                    toToken: tx.bridgeParams.toToken,
                });
            }
        });
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
            return Promise.all(
                allTokens.map((token) => this._normalizeTokenData(token))
            );
        } catch (e) {
            throw new Error('Unable to fetch tokens.');
        }
    }

    public async getAvailableChains(
        aggregator: BridgeImplementation = BridgeImplementation.LIFI_BRIDGE
    ): Promise<IChain[]> {
        const implementor = this._getAPIImplementation(aggregator);
        try {
            const supportedChains = await retryHandling<IChain[]>(
                () => implementor.getSupportedChains(),
                400,
                3
            );

            const availableBridgeChains: IChain[] = supportedChains.map(
                (chain) => {
                    const userNetwork = Object.values(
                        this._networkController.networks
                    ).find((network) => network.chainId === chain.id);

                    if (userNetwork) {
                        return {
                            ...chain,
                            name: userNetwork.desc
                                ? userNetwork.desc
                                : chain.name,
                            logo: userNetwork.iconUrls?.length
                                ? userNetwork.iconUrls[0]
                                : chain.logo,
                        };
                    }

                    const knownChain = getChainListItem(chain.id);
                    return {
                        ...chain,
                        name: knownChain?.name ? knownChain.name : chain.name,
                        logo: knownChain?.logo ? knownChain.logo : chain.logo,
                    };
                }
            );
            this.UIStore.updateState({ availableBridgeChains });
            return availableBridgeChains;
        } catch (e) {
            log.error('Error fetching bridge chains', e);
            return [];
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
        const normalizedRoutes: IBridgeRoute[] = [];
        for (const route of routes) {
            const fromTokensAsync = Promise.all(
                route.fromTokens.map(
                    async (token) =>
                        await this._normalizeTokenData(token, route.fromChainId)
                )
            );
            const toTokensAsync = Promise.all(
                route.toTokens.map(
                    async (token) =>
                        await this._normalizeTokenData(token, route.toChainId)
                )
            );
            normalizedRoutes.push({
                ...route,
                fromTokens: await fromTokensAsync,
                toTokens: await toTokensAsync,
            });
        }

        return { routes: normalizedRoutes };
    }

    /**
     * _normalizeTokenData
     *
     * Normalize token data so that we have the same logo, symbol and name in the frontend.
     * @param token token to normalize
     * @param chainId chain owner of the token
     */
    private async _normalizeTokenData(
        token: IToken,
        chainId: number = this._networkController.network.chainId
    ): Promise<IToken> {
        if (isNativeTokenAddress(token.address)) {
            const targetNetwork =
                this._networkController.getNetworkFromChainId(chainId);

            if (!targetNetwork) {
                const chainListItem = getChainListItem(chainId);
                if (!chainListItem) {
                    return token;
                }

                return {
                    ...chainListItem.nativeCurrency,
                    address: token.address,
                    logo: chainListItem.nativeCurrencyIcon || token.logo,
                    type: '',
                };
            }

            const logoUrl = targetNetwork.iconUrls
                ? targetNetwork.iconUrls[0]
                : token.logo;

            return {
                ...targetNetwork.nativeCurrency,
                address: token.address,
                logo: logoUrl || token.logo,
                type: '',
            };
        }
        const allTokens = await this._tokenController.getTokens(chainId);
        const fetchedToken = allTokens[token.address];
        return {
            address: fetchedToken?.address || token.address,
            name: fetchedToken?.name || token.name,
            logo: fetchedToken?.logo || token.logo,
            type: fetchedToken?.type || token.type,
            symbol: fetchedToken?.symbol || token.symbol,
            decimals: fetchedToken?.decimals || token.decimals,
        };
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
    ): Promise<GetBridgeQuoteResponse | GetBridgeQuoteNotFoundResponse> => {
        let allowanceCheck = BridgeAllowanceCheck.NOT_CHECKED;
        const contractSignatureParser = new ContractSignatureParser(
            this._networkController
        );
        let quote!: BridgeQuote;
        try {
            quote = await this.getQuoteFromAggregator(aggregator, quoteRequest);
        } catch (e) {
            if (isQuoteNotFoundError(e)) {
                return e.details as GetBridgeQuoteNotFoundResponse;
            }
            throw new Error('Error requesting the quote.');
        }

        if (quoteRequest.fromTokenAddress === LIFI_NATIVE_ADDRESS) {
            allowanceCheck = BridgeAllowanceCheck.ENOUGH_ALLOWANCE;
        } else if (checkAllowance && quote) {
            try {
                allowanceCheck =
                    (await this._tokenAllowanceController.checkTokenAllowance(
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

        const normalizedQuote: BridgeQuote = quote
            ? {
                  ...quote,
                  fromToken: await this._normalizeTokenData(
                      quote.fromToken,
                      quote.fromChainId
                  ),
                  toToken: await this._normalizeTokenData(
                      quote.toToken,
                      quote.toChainId
                  ),
              }
            : quote;

        const quoteFeeStatus = this._checkQuoteStatus(normalizedQuote);
        return {
            bridgeParams: {
                params: normalizedQuote,
                methodSignature,
            },
            allowance: allowanceCheck,
            quoteFeeStatus,
        };
    };

    private _checkQuoteStatus(quote: IBridgeQuote): QuoteFeeStatus {
        if (quote.feeCosts && quote.feeCosts.length) {
            const userTokenBalances =
                this._accountTrackerController.getAccountTokens();
            const nativeTokenBalance =
                this._accountTrackerController.getAccountNativeTokenBalance();
            for (const fee of quote.feeCosts) {
                //fees from the "fromToken" and "toToken" are already calculated in the quote.
                const feeTokenAddress = fee.token.address.toLowerCase();
                const fromAndToTokenAddresses = [
                    quote.fromToken.address.toLowerCase(),
                    quote.toToken.address.toLowerCase(),
                ];
                if (!fromAndToTokenAddresses.includes(feeTokenAddress)) {
                    const userTokenBalance = isNativeTokenAddress(
                        fee.token.address
                    )
                        ? nativeTokenBalance
                        : userTokenBalances[
                              toChecksumAddress(fee.token.address)
                          ]?.balance;

                    //If we don't have the token balance then avoid checking and stopping the operation.
                    if (
                        userTokenBalance &&
                        userTokenBalance.lt(BigNumber.from(fee.total))
                    ) {
                        return QuoteFeeStatus.INSUFFICIENT_BALANCE_TO_COVER_FEES;
                    }
                }
            }
        }
        return QuoteFeeStatus.OK;
    }

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
        const quote = await retryHandling<IBridgeQuote>(
            () =>
                this._getAPIImplementation(agg).getQuote({
                    ...request,
                    fromChainId: network.chainId,
                    referrer: BRIDGE_REFERRER_ADDRESS,
                }),
            400,
            4,
            (e: Error) => {
                return !isQuoteNotFoundError(e);
            }
        );

        return quote;
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
                fromChainId,
                toChainId,
                tool,
                feeCosts,
                slippage,
                estimatedDurationInSeconds,
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

            await this._transactionController.approveTransaction(
                transactionMeta.id
            );

            const newTransactionMeta =
                this._transactionController.getTransaction(transactionMeta.id);

            if (
                !newTransactionMeta ||
                !newTransactionMeta.transactionParams.hash
            ) {
                return result;
            }

            //add token if sending tx has been submitted
            this._tokenController.attemptAddToken(
                toToken.address,
                toChainId,
                toToken
            );

            newTransactionMeta.transferType = {
                amount: BigNumber.from(fromAmount),
                currency: fromToken.symbol,
                decimals: fromToken.decimals,
                logo: fromToken.logo,
                to: transactionRequest.to,
            };

            newTransactionMeta.bridgeParams = {
                bridgeImplementation: aggregator,
                estimatedDurationInSeconds,
                fromToken,
                toToken,
                fromTokenAmount: fromAmount,
                toTokenAmount: toAmount,
                fromChainId,
                toChainId,
                slippage,
                tool, //store the tool used for executing the bridge.
                role: 'SENDING',
                sendingTxHash: newTransactionMeta.transactionParams.hash,
                feeCosts,
                startTime: newTransactionMeta.submittedTime || Date.now(),
            };

            this._transactionController.updateTransaction(newTransactionMeta);

            this._waitForBridgeFinalState({
                accountAddress: transactionRequest.from,
                sendingTransactionId: newTransactionMeta.id,
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

    private _updateReceivingTransaction(
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
     * _waitForBridgeFinalState
     *
     * Waits for the bridge to end with an either successful or failed state.
     * When a receivingTx hash (transaction in the bridge's destination chain) it fires a flow to fetch the transaction data.
     *
     * @param accountAddress the account address from which the bridge was executed
     * @param sendingTransactionId the sending (outgoing) transaction reference to our store.
     * @param tool the bridge used
     * @param fromChainId the chain id of the sending transaction's network
     * @param toChainId the chain id of the receiving transaction's network
     * @param toToken the token obtained in the receiving chain after executing the bridge.
     */
    private async _waitForBridgeFinalState({
        accountAddress,
        sendingTransactionId,
        tool,
        fromChainId,
        toChainId,
        toToken,
    }: {
        sendingTransactionId: string;
        accountAddress: string;
        tool: string;
        fromChainId: number;
        toChainId: number;
        toToken: IToken;
    }): Promise<string | undefined> {
        const startTime = new Date().getTime();
        let receivingTxFetched = false;
        let receivingTxHash: string | undefined;
        let invalidStatusCount = 0;
        let sendingTx =
            this._transactionController.getTransaction(sendingTransactionId);

        if (
            !sendingTx ||
            !sendingTx.bridgeParams ||
            !sendingTx.transactionParams.hash
        ) {
            return;
        }

        //Bridge is still pending and orignal transaction hasn't failed.
        const shouldCheckBridgeStatus = (
            sendingTx: TransactionMeta
        ): boolean => {
            //If there is no status yet, then execute.
            if (!sendingTx.bridgeParams || !sendingTx.bridgeParams.status) {
                return true;
            }
            return (
                BRIDGE_PENDING_STATUSES.includes(
                    sendingTx.bridgeParams.status
                ) &&
                ![
                    TransactionStatus.FAILED,
                    TransactionStatus.DROPPED,
                    TransactionStatus.CANCELLED,
                ].includes(sendingTx.status)
            );
        };

        let isBridgePending = shouldCheckBridgeStatus(sendingTx);

        while (
            isBridgePending &&
            invalidStatusCount < BRIDGE_STATUS_INVALID_MAX_COUNT &&
            //Set a timeout to avoid looping without an stop condition.
            new Date().getTime() - startTime < TIMEOUT_FETCH_RECEIVING_TX
        ) {
            try {
                //fetch status from bridge API
                const bridgeStatus = await this._getAPIImplementation(
                    BridgeImplementation.LIFI_BRIDGE
                ).getStatus({
                    sendTxHash: sendingTx.transactionParams.hash as string,
                    tool: tool,
                    fromChainId: fromChainId,
                    toChainId: toChainId,
                });

                receivingTxHash = bridgeStatus.receiveTransaction?.txHash;

                if (bridgeStatus.status === BridgeStatus.INVALID) {
                    invalidStatusCount++;

                    //Store INVALID bridge statuses as NOT_FOUND to keep them as pending for a while.
                    if (invalidStatusCount < BRIDGE_STATUS_INVALID_MAX_COUNT) {
                        bridgeStatus.status = BridgeStatus.NOT_FOUND;
                    }
                }

                const effectiveToToken = bridgeStatus?.receiveTransaction?.token
                    ? //retrieve original token from
                      await this._normalizeTokenData(
                          bridgeStatus?.receiveTransaction?.token,
                          toChainId
                      )
                    : undefined;

                const effectiveToTokenAmount =
                    bridgeStatus?.receiveTransaction?.amount;

                const effectiveToChainId =
                    bridgeStatus?.receiveTransaction?.chainId;

                //update bridge status, substatus and recevingTxHash in the state.
                sendingTx = this._updateSendingTransactionBridgeParams(
                    sendingTransactionId,
                    {
                        substatus: bridgeStatus.substatus,
                        status: bridgeStatus.status,
                        receivingTxHash,
                        sendingTxLink: bridgeStatus?.sendTransaction?.txLink,
                        receivingTxLink:
                            bridgeStatus?.receiveTransaction?.txLink,
                        effectiveToToken,
                        effectiveToTokenAmount,
                        effectiveToChainId,
                    }
                );

                //If receving transaction hash flow hasn't been fired yet, then do it.
                if (!receivingTxFetched && receivingTxHash) {
                    receivingTxFetched = true;
                    this._fetchBridgeReceivingTransaction({
                        accountAddress,
                        receivingTxHash,
                        sendingTransaction: sendingTx,
                        toChainId: effectiveToChainId || toChainId,
                        toToken: effectiveToToken || toToken,
                    });
                }

                isBridgePending = shouldCheckBridgeStatus(sendingTx);
            } catch (e) {
                log.warn('_waitForBridgeFinalState', 'getStatus', e);
            } finally {
                //Only sleep if we're going to continue with the status check.
                if (isBridgePending) {
                    await sleep(STATUS_API_CALLS_DELAY);
                }
            }
        }
        return receivingTxHash;
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

        //Attempt to add the token here, as the toToken address might have changed due to
        // - Refunds
        // - Partial bridges, where the received token is different from the one specified in the quote.
        this._tokenController.attemptAddToken(
            toToken.address,
            toChainId,
            toToken
        );

        let transactionByHash: ethers.providers.TransactionResponse;
        try {
            transactionByHash =
                await retryHandling<ethers.providers.TransactionResponse>(
                    () =>
                        receivingChainIdProvider.getTransaction(
                            receivingTxHash
                        ),
                    MILISECOND * 500,
                    3
                );
        } catch (e) {
            log.error('_waitForReceivingTx', 'getTransaction', e);
            return false;
        }

        const isRefund =
            (sendingTransaction.bridgeParams?.substatus &&
                [
                    BridgeSubstatus.REFUNDED,
                    BridgeSubstatus.REFUND_IN_PROGRESS,
                ].includes(sendingTransaction.bridgeParams?.substatus)) ??
            false;

        const transactionMeta = this._transactionByHashToTransactionMeta(
            transactionByHash,
            isRefund ?? false
        );

        //Set bridge parameters
        transactionMeta.bridgeParams = {
            ...(sendingTransaction.bridgeParams ||
                ({} as BridgeTransactionParams)),
            role: 'RECEIVING',
        };

        this._updateReceivingTransaction(
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

                continue;
            }
        }

        const toAmount =
            sendingTransaction.bridgeParams?.effectiveToTokenAmount ||
            sendingTransaction.bridgeParams?.toTokenAmount;

        let txConfirmationTime: number | undefined;

        //If the transaction was mined and we have its block number, the fetch timestamp
        if (isSuccess && !isNil(txReceipt.blockNumber)) {
            const block = await fetchBlockWithRetries(
                txReceipt.blockNumber,
                receivingChainIdProvider
            );
            if (block) {
                //transform to miliseconds
                txConfirmationTime = block.timestamp * 1000;
            }
        }

        const contractSignatureParser = new ContractSignatureParser(
            this._networkController,
            toChainId
        );

        const methodSignature =
            await contractSignatureParser.getMethodSignature(
                transactionByHash.data,
                txReceipt.contractAddress || txReceipt.to
            );

        const transactionToken = await this._fetchToken(
            toToken,
            accountAddress,
            toChainId
        );

        //update sending transaction in the transaction controller
        if (txConfirmationTime) {
            this._updateSendingTransactionBridgeParams(sendingTransaction.id, {
                endTime: txConfirmationTime,
            });
        }

        //uodate receiving
        this._updateReceivingTransaction(
            toChainId,
            accountAddress,
            receivingTxHash,
            {
                confirmationTime: txConfirmationTime,
                methodSignature,
                transactionReceipt: {
                    ...txReceipt,
                },
                bridgeParams: {
                    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
                    ...transactionMeta.bridgeParams!,
                    endTime: txConfirmationTime,
                },
                transferType: transactionToken
                    ? {
                          logo: transactionToken.logo,
                          decimals: transactionToken.decimals,
                          currency: transactionToken.symbol,
                          to: transactionByHash.to,
                          amount: toAmount
                              ? BigNumber.from(toAmount)
                              : BigNumber.from(transactionByHash.value),
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

        for (const address in pendingTransactions) {
            const pendingAddrTransactions = pendingTransactions[address];
            for (const pendingTx of pendingAddrTransactions) {
                const sendingTransaction =
                    this._transactionController.getTransaction(
                        pendingTx.sendingTransactionId
                    );

                //If sending transaction doesn't exist, then avoid persisting this transaction as well.
                if (sendingTransaction) {
                    try {
                        await this._fetchBridgeReceivingTransaction({
                            accountAddress: address,
                            receivingTxHash: pendingTx.hash,
                            toChainId: chainId,
                            toToken: pendingTx.toToken,
                            sendingTransaction,
                        });
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

        const perndingBridgeReceivingTransactions = {
            ...(this.store.getState().perndingBridgeReceivingTransactions ||
                {}),
        };
        delete perndingBridgeReceivingTransactions[chainId];

        this.store.updateState({
            perndingBridgeReceivingTransactions,
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

        try {
            const token = await this._tokenController.getToken(
                transactionToken.address,
                accountAddress,
                chainId
            );

            const realToken = token || transactionToken;

            //try to fetch the token from our list, if it is not present, use the transaction token data.
            return fillTokenData(realToken, transactionToken);
        } catch (e) {
            log.warn('_fetchToken', 'tokenController.search', e);
            return transactionToken;
        }
    }

    private _transactionByHashToTransactionMeta(
        transaction: ethers.providers.TransactionResponse,
        isRefund: boolean
    ): Partial<TransactionMeta> {
        return {
            rawTransaction: transaction.data,
            time: transaction.timestamp,
            approveTime: transaction.timestamp,
            confirmationTime: transaction.timestamp,
            verifiedOnBlockchain: true,
            chainId: transaction.chainId,
            origin: 'blank',
            transactionCategory: isRefund
                ? TransactionCategories.INCOMING_BRIDGE_REFUND
                : TransactionCategories.INCOMING_BRIDGE,
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

    /**
     * Updates the sending transanction bridge parameters.
     * @param txId transaction ID to update
     * @param brideParams bridge params updates.
     * @returns
     */
    private _updateSendingTransactionBridgeParams(
        txId: string,
        brideParams: Partial<BridgeTransactionParams>
    ): TransactionMeta {
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        const tx = this._transactionController.getTransaction(txId)!;
        this._transactionController.updateTransactionPartially(txId, {
            bridgeParams: {
                ...(tx.bridgeParams || ({} as BridgeTransactionParams)),
                ...brideParams,
            },
        });
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        return this._transactionController.getTransaction(txId)!;
    }
}
