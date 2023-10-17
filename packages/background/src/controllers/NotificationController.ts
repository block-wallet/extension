import { BigNumber } from '@ethersproject/bignumber';
import { createCustomExplorerLink } from '@block-wallet/explorer-link';

import { PreferencesController } from './PreferencesController';
import {
    TransactionWatcherController,
    TransactionWatcherControllerEvents,
} from './TransactionWatcherController';
import TransactionController from './transactions/TransactionController';
import { AccountTrackerController } from './AccountTrackerController';
import { AddressBookController } from './AddressBookController';
import { EnsController } from './EnsController';

import { ChainListItem, getChainListItem } from '../utils/chainlist';
import {
    MetaType,
    TransactionCategories,
    TransactionEvents,
    TransactionMeta,
    TransactionStatus,
    WatchedTransactionType,
} from '../controllers/transactions/utils/types';
import { formatTokenAmount } from '../utils/token';
import { fetchContractDetails } from '../utils/contractsInfo';
import { formatName } from '../utils/account';
import browser from 'webextension-polyfill';
import { isHttpsURL } from '../utils/http';

interface ChainListItemWithExplorerUrl extends ChainListItem {
    explorerUrl: string;
}

export class NotificationController {
    constructor(
        private readonly _preferencesController: PreferencesController,
        private readonly _transactionWatcherController: TransactionWatcherController,
        private readonly _transactionController: TransactionController,
        private readonly _accountTrackerController: AccountTrackerController,
        private readonly _addressBookController: AddressBookController,
        private readonly _ensController: EnsController
    ) {
        // Subscribe to Incoming transactions
        this._transactionWatcherController.on(
            TransactionWatcherControllerEvents.INCOMING_TRANSACTION,
            async (
                _chainId: number,
                _address: string,
                _transactionType: WatchedTransactionType,
                txMeta: TransactionMeta
            ) => {
                this.showTransactionNotification(txMeta);
            }
        );

        // Subscribe to transactions status updates
        this._transactionController.on(
            TransactionEvents.STATUS_UPDATE,
            (transactionMeta: TransactionMeta) => {
                const notificationTxStatuses = [
                    TransactionStatus.CONFIRMED,
                    TransactionStatus.FAILED,
                    TransactionStatus.CANCELLED,
                ];

                if (notificationTxStatuses.includes(transactionMeta.status)) {
                    this.showTransactionNotification(transactionMeta);
                }
            }
        );
    }

    /**
     * Shows a notification when the user has completed the set-up process.
     */
    async showSetUpCompleteNotification() {
        const url = '';
        const title = 'BlockWallet is ready!';
        const message =
            "You've completed the set-up process. Check the extension in the upper right corner of your browser.";

        this.showNotification(title, message, url);
    }

    /**
     * Shows a notification including the transaction info and open link to explorer on click.
     * @param txMeta - The transaction meta object.
     */
    async showTransactionNotification(txMeta: TransactionMeta) {
        const network = this.getNetworkData(txMeta.chainId);
        if (!network) return;

        // the cancel transaction is not shown in the notification only the cancelation
        if (txMeta.metaType === MetaType.CANCEL) return;

        const { title, message, url } = await this.getTxNotificationData(
            txMeta,
            network
        );

        if (!txMeta.transactionCategory) return;

        const isIncomingTransaction = [
            TransactionCategories.INCOMING,
            TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER,
        ].includes(txMeta.transactionCategory);

        const accountAddress = isIncomingTransaction
            ? txMeta.transactionParams.to
            : txMeta.transactionParams.from;

        if (!accountAddress) return;

        const accountName =
            this._accountTrackerController.getAccountName(accountAddress);

        if (!accountName) return;

        const accountInfo = `${formatName(
            accountName
        )} (...${accountAddress?.slice(accountAddress.length - 4)})`;

        this.showNotification(title, message, url, accountInfo);
    }

    /**
     * Shows a browser notification and open link on click.
     *
     * @param title - The notification title.
     * @param message - The notification message.
     * @param url - The url to open on click.
     * @param contextMessage - The context message.
     *
     */
    public showNotification(
        title: string,
        message: string,
        url: string,
        contextMessage?: string
    ) {
        if (!this._preferencesController.settings.subscribedToNotifications)
            return;
        let notificationUrl = url;
        if (url) {
            this.addOnClickListener();

            // To prevent duplicate notifications id which causes the notification to not show (overrides the old one)
            const urlObject = new URL(url);
            urlObject.searchParams.set('timestamp', Date.now().toString());
            notificationUrl = urlObject.toString();
        }
        browser.notifications.create(notificationUrl, {
            title: title,
            message: message,
            iconUrl: browser.runtime.getURL('icons/icon-48.png'),
            type: 'basic',
            isClickable: url ? true : false,
            contextMessage: contextMessage,
        });
    }

    private addOnClickListener() {
        const onClickListener = browser.notifications.onClicked;

        if (!onClickListener.hasListener(this.linkToExplorer)) {
            onClickListener.addListener(this.linkToExplorer);
        }
    }

    private linkToExplorer(url: string) {
        if (isHttpsURL(url)) {
            browser.tabs.create({ url: url });
        }
    }

    /**
     * Gets the network data from the chain list.
     * @param chainId - The chain id.
     * @returns The network data.
     *
     */
    private getNetworkData(chainId: number | undefined) {
        if (!chainId || isNaN(chainId)) return undefined;

        const networkData = getChainListItem(chainId);

        if (
            !networkData ||
            !networkData.explorers ||
            !networkData.explorers.length
        )
            return undefined;

        const explorerUrl = networkData.explorers.find((e) => e.url)?.url;
        if (!explorerUrl) return undefined;

        return { ...networkData, explorerUrl } as ChainListItemWithExplorerUrl;
    }

    private async getTxNotificationData(
        txMeta: TransactionMeta,
        network: ChainListItemWithExplorerUrl
    ) {
        const {
            transactionParams: txParams,
            transactionCategory,
            status,
            exchangeParams,
            bridgeParams,
            approveAllowanceParams,
            transferType,
            chainId,
        } = txMeta;

        const {
            name: txNetworkName,
            nativeCurrency: txNetworkNativeToken,
            explorerUrl,
        } = network;

        let title = '';
        let message = '';
        let url = '';

        if (txParams.hash) {
            url = createCustomExplorerLink(txParams.hash, explorerUrl);
        }

        const isTxFailed = status === TransactionStatus.FAILED;
        const isTxCancelled = status === TransactionStatus.CANCELLED;

        // Used when the transaction category is not supported or there is no data for the transaction category.
        let showDefaultNotification = false;

        switch (transactionCategory) {
            case TransactionCategories.EXCHANGE:
                if (!exchangeParams) {
                    showDefaultNotification = true;
                    break;
                }
                title = `Swap`;
                message = `${exchangeParams.fromToken.symbol} to ${exchangeParams.toToken.symbol} swap on ${txNetworkName}`;
                break;
            case TransactionCategories.BRIDGE:
                if (!bridgeParams) {
                    showDefaultNotification = true;
                    break;
                }
                title = `Bridge`;
                message = `${
                    this.getNetworkData(bridgeParams.fromChainId)?.name
                } to ${
                    this.getNetworkData(bridgeParams.toChainId)?.name
                } bridge`;
                break;
            case TransactionCategories.TOKEN_METHOD_APPROVE: {
                if (!approveAllowanceParams) {
                    showDefaultNotification = true;
                    break;
                }
                const {
                    spenderAddress,
                    spenderInfo,
                    token,
                    allowanceValue,
                    isUnlimited,
                } = approveAllowanceParams;
                const isRevoke = BigNumber.from(allowanceValue).eq(0);
                const spenderName =
                    spenderInfo?.name ??
                    `Spender (${spenderAddress?.slice(
                        0,
                        6
                    )}...${spenderAddress?.slice(spenderAddress.length - 4)})`;
                if (!isRevoke) {
                    title = `Token Approval`;
                    message = `Approval of ${
                        isUnlimited
                            ? `unlimited ${token.symbol}`
                            : formatTokenAmount(
                                  allowanceValue,
                                  token.decimals,
                                  token.symbol
                              )
                    } for use with ${spenderName} on ${txNetworkName}`;
                } else {
                    title = `Approval Revoke`;
                    message = `${token.symbol} approval revoke for ${spenderName} on ${txNetworkName}`;
                }
                break;
            }
            case TransactionCategories.SENT_ETHER: {
                const recipientName = await this._getAddressName(txParams.to);

                title = `Transaction`;
                message = `${txNetworkNativeToken.symbol} transfer${
                    recipientName ? ` to ${recipientName}` : ''
                } on ${txNetworkName}`;
                break;
            }
            case TransactionCategories.TOKEN_METHOD_TRANSFER: {
                const recipientName = await this._getAddressName(
                    transferType?.to
                );
                if (!transferType) {
                    showDefaultNotification = true;
                    break;
                }
                title = `Transaction`;
                message = `${transferType.currency} transfer${
                    recipientName ? ` to ${recipientName}` : ''
                } on ${txNetworkName}`;
                break;
            }
            case TransactionCategories.INCOMING: {
                const senderName = await this._getAddressName(txParams.from);

                if (!txParams || !txParams.value) {
                    showDefaultNotification = true;
                    break;
                }
                title = `Incoming Transaction`;
                message = `Received ${formatTokenAmount(
                    txParams.value,
                    txNetworkNativeToken.decimals,
                    txNetworkNativeToken.symbol
                )}${
                    senderName ? ` from ${senderName}` : ''
                } on ${txNetworkName}.`;
                break;
            }
            case TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER: {
                const senderName = await this._getAddressName(txParams.from);
                if (!transferType) {
                    showDefaultNotification = true;
                    break;
                }

                title = 'Incoming Transaction';
                message = `Received ${formatTokenAmount(
                    transferType.amount,
                    transferType.decimals,
                    transferType.currency
                )}${
                    senderName ? ` from ${senderName}` : ''
                } on ${txNetworkName}.`;
                break;
            }
            case TransactionCategories.CONTRACT_INTERACTION: {
                if (!txParams || !txParams.to || !chainId) {
                    showDefaultNotification = true;
                    break;
                }
                const contractAddress = txParams.to;
                const contractDetails = await fetchContractDetails(
                    chainId,
                    contractAddress
                );
                const contractName =
                    contractDetails?.name ??
                    `Contract (${contractAddress?.slice(
                        0,
                        6
                    )}...${contractAddress?.slice(
                        contractAddress.length - 4
                    )})`;

                title = `Contract Interaction`;
                message = `Transaction with ${contractName} on ${txNetworkName}`;
                break;
            }
            case TransactionCategories.CONTRACT_DEPLOYMENT:
                title = `Contract Deploy`;
                message = `Contract deployment on ${txNetworkName}`;
                break;
            default:
                showDefaultNotification = true;
                break;
        }

        if (showDefaultNotification) {
            title = 'Transaction';
            message = `Transaction on ${txNetworkName}`;
        }

        const incomingTxCategories = [
            TransactionCategories.INCOMING,
            TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER,
        ];

        if (
            transactionCategory &&
            !incomingTxCategories.includes(transactionCategory)
        ) {
            title =
                title +
                (!isTxFailed && !isTxCancelled
                    ? ' Completed'
                    : isTxCancelled
                    ? ' Cancelled'
                    : ' Failed');
            message =
                message +
                (!isTxFailed && !isTxCancelled
                    ? ' completed.'
                    : isTxCancelled
                    ? ' cancelled.'
                    : ' failed.');
        }

        return {
            title,
            message,
            url,
        };
    }

    /**
     * Returns the name of the address if it is an account or in address book or an ENS name
     * @param address - Hex address of the account
     * @returns - Name of the address
     *
     */
    private async _getAddressName(address?: string) {
        if (!address) return undefined;

        let name: string | undefined | null;

        name = this._accountTrackerController.getAccountName(address);

        if (!name) {
            name = await this._addressBookController.getFormattedContactName(
                address
            );
        }

        if (!name) {
            name = await this._ensController
                .lookupAddress(address)
                .catch(() => {
                    return undefined;
                });
        }

        return name;
    }
}
