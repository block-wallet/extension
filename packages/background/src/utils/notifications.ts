import { BigNumber } from '@ethersproject/bignumber';
import { createCustomExplorerLink } from '@block-wallet/explorer-link';
import { ChainListItem, getChainListItem } from './chainlist';
import {
    MetaType,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../controllers/transactions/utils/types';
import { formatTokenAmount } from './token';
import { fetchContractDetails } from './contractsInfo';

interface ChainListItemWithExplorerUrl extends ChainListItem {
    explorerUrl: string;
}

/**
 * Shows a notification when the user has completed the set-up process.
 */
export const showSetUpCompleteNotification = () => {
    const url = '';
    const title = 'BlockWallet is ready!';
    const message =
        "You've completed the set-up process. Check the extension in the upper right corner of your browser.";

    showNotification(title, message, url);
};

/**
 * Shows a notification including the transaction info and open link to explorer on click.
 * @param txMeta - The transaction meta object.
 */
export const showTransactionNotification = async (txMeta: TransactionMeta) => {
    const network = getNetworkData(txMeta.chainId);
    if (!network) return;

    // the cancel transaction is not shown in the notification only the cancelation
    if (txMeta.metaType === MetaType.CANCEL) return;

    const { title, message, url } = await getTxNotificationData(
        txMeta,
        network
    );

    showNotification(title, message, url);
};

/**
 * Shows a browser notification and open link on click.
 *
 * @param title - The notification title.
 * @param message - The notification message.
 * @param url - The url to open on click.
 *
 */
const showNotification = (title: string, message: string, url: string) => {
    let notificationUrl = url;
    if (url) {
        addOnClickListener();

        // To prevent duplicate notifications id which causes the notification to not show (overrides the old one)
        const urlObject = new URL(url);
        urlObject.searchParams.set('timestamp', Date.now().toString());
        notificationUrl = urlObject.toString();
    }
    chrome.notifications.create(notificationUrl, {
        title: title,
        message: message,
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        type: 'basic',
        isClickable: url ? true : false,
    });
};

const addOnClickListener = () => {
    const onClickListener = chrome.notifications.onClicked;

    if (!onClickListener.hasListener(linkToExplorer)) {
        onClickListener.addListener(linkToExplorer);
    }
};

const linkToExplorer = (url: string) => {
    if (url.startsWith('https://')) {
        chrome.tabs.create({ url: url });
    }
};

/**
 * Gets the network data from the chain list.
 * @param chainId - The chain id.
 * @returns The network data.
 *
 */
const getNetworkData = (chainId: number | undefined) => {
    if (!chainId || isNaN(chainId)) return undefined;

    const networkData = getChainListItem(chainId);

    if (!networkData || !networkData.explorers || !networkData.explorers.length)
        return undefined;

    const explorerUrl = networkData.explorers.find((e) => e.url)?.url;
    if (!explorerUrl) return undefined;

    return { ...networkData, explorerUrl } as ChainListItemWithExplorerUrl;
};

const getTxNotificationData = async (
    txMeta: TransactionMeta,
    network: ChainListItemWithExplorerUrl
) => {
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
            message = `${getNetworkData(bridgeParams.fromChainId)?.name} to ${
                getNetworkData(bridgeParams.toChainId)?.name
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
        case TransactionCategories.SENT_ETHER:
            title = `Transaction`;
            message = `${txNetworkNativeToken.symbol} transfer on ${txNetworkName}`;
            break;
        case TransactionCategories.TOKEN_METHOD_TRANSFER:
            if (!transferType) {
                showDefaultNotification = true;
                break;
            }
            title = `Transaction`;
            message = `${transferType.currency} transfer on ${txNetworkName}`;
            break;
        case TransactionCategories.INCOMING:
            if (!txParams || !txParams.value) {
                showDefaultNotification = true;
                break;
            }
            title = `Incoming Transaction`;
            message = `Received ${formatTokenAmount(
                txParams.value,
                txNetworkNativeToken.decimals,
                txNetworkNativeToken.symbol
            )} on ${txNetworkName}.`;
            break;
        case TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER: {
            if (!transferType) {
                showDefaultNotification = true;
                break;
            }

            title = 'Incoming Transaction';
            message = `Received ${formatTokenAmount(
                transferType.amount,
                transferType.decimals,
                transferType.currency
            )} on ${txNetworkName}.`;
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
                )}...${contractAddress?.slice(contractAddress.length - 4)})`;

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
};
