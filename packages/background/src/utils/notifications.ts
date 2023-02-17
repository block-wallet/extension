import { BigNumber } from '@ethersproject/bignumber';
import { createCustomExplorerLink } from '@block-wallet/explorer-link';
import { formatUnits } from 'ethers/lib/utils';
import { ChainListItem, getChainListItem } from './chainlist';
import {
    MetaType,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../controllers/transactions/utils/types';

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
export const showTransactionNotification = (txMeta: TransactionMeta) => {
    const network = getNetworkData(txMeta.chainId);
    if (!network) return;

    if (
        txMeta.metaType === MetaType.CANCEL ||
        txMeta.transactionCategory === TransactionCategories.INCOMING ||
        txMeta.transactionParams.from === txMeta.transactionParams.to
    )
        return;
    console.log(
        '🚀 ~ file: notifications.ts:34 ~ showTransactionNotification ~ txMeta',
        txMeta
    );

    const { title, message, url } = getTxNotificationData(txMeta, network);

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
    if (url) addOnClickListener();

    chrome.notifications.create(url, {
        title: title,
        message: message,
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        type: 'basic',
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

const getTxNotificationData = (
    txMeta: TransactionMeta,
    network: ChainListItemWithExplorerUrl
) => {
    const {
        transactionParams: txParams,
        transactionCategory,
        status,
        exchangeParams,
        bridgeParams,
        transferType,
        metaType,
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

    const isTxFailure = status === TransactionStatus.FAILED;
    const isTxCancelled = status === TransactionStatus.CANCELLED;
    const isTxSpedUp =
        status === TransactionStatus.CONFIRMED &&
        metaType === MetaType.SPEED_UP;

    if (isTxCancelled) {
        title = `Transaction Cancelled`;
        message = `Transaction cancelled on ${txNetworkName}.`;
        return { title, message, url };
    }

    switch (transactionCategory) {
        case TransactionCategories.EXCHANGE:
            title = `Swap ${isTxFailure ? 'Failed' : 'Completed'}`;
            message = `${exchangeParams?.fromToken.symbol} to ${
                exchangeParams?.toToken.symbol
            } swap on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;
        case TransactionCategories.BRIDGE:
            title = `Bridge ${isTxFailure ? 'Failed' : 'Completed'}`;
            message = `${getNetworkData(bridgeParams?.fromChainId)?.name} to ${
                getNetworkData(bridgeParams?.toChainId)?.name
            } bridge ${isTxFailure ? 'failed' : 'completed'}.`;
            break;

        //TODO: Add notification for token approval when allowance epic is pushed to main branch
        case TransactionCategories.TOKEN_METHOD_APPROVE:
            //Token Approval Revoked
            //<token> approval revoked for <spender> on <network>.
            title = 'Token Approval';
            message = `Approved <amount> <token> for use with <spender> on ${txNetworkName}.`;
            break;
        case TransactionCategories.SENT_ETHER:
            title = `Transaction ${isTxFailure ? 'Failed' : 'Completed'}`;
            message = `${
                txNetworkNativeToken.symbol
            } transaction on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;
        case TransactionCategories.TOKEN_METHOD_TRANSFER:
            title = `Transaction ${isTxFailure ? 'Failed' : 'Completed'}`;
            message = `${
                transferType?.currency
            } transaction on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;

        case TransactionCategories.TOKEN_METHOD_INCOMING_TRANSFER: {
            const isNativeToken = !transferType;

            const decimals = isNativeToken
                ? txNetworkNativeToken?.decimals
                : transferType?.decimals;

            const symbol = isNativeToken
                ? txNetworkNativeToken?.symbol
                : transferType?.currency;

            const value = isNativeToken
                ? txParams?.value
                : transferType?.amount;

            title = 'Incoming Transaction';
            message = `Received ${formatTokenAmount(
                value,
                decimals,
                symbol
            )} on ${txNetworkName}.`;
            break;
        }
        case TransactionCategories.CONTRACT_INTERACTION:
            title = `Contract Interaction ${isTxFailure ? 'Failed' : ''}`;
            message = `Interaction with contract on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;
        case TransactionCategories.CONTRACT_DEPLOYMENT:
            title = `Contract ${
                isTxFailure ? 'Deployment Failed' : 'Deployed'
            }`;
            message = `Contract deployment on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;
        default:
            title = isTxFailure
                ? 'Transaction Failed'
                : 'Transaction Completed';
            message = `Transaction on ${txNetworkName} ${
                isTxFailure ? 'failed' : 'completed'
            }.`;
            break;
    }

    if (isTxSpedUp) {
        title = title + ' (Sped Up)';
    }

    return {
        title,
        message,
        url,
    };
};

/**
 * Formats the token amount.
 * @param amount - The token amount.
 * @param decimals - The token decimals.
 * @param symbol - The token symbol.
 * @returns The formatted token amount.
 * @example
 * formatTokenAmount('1000000000000000000', 18, 'ETH') // '1 ETH'
 * formatTokenAmount('2000000000000000000', 18) // '2 tokens'
 * formatTokenAmount('1000000000000000000') // 'some tokens'
 * formatTokenAmount() // 'some tokens'
 * formatTokenAmount(undefined, 18, 'ETH') // 'some ETH'
 */
const formatTokenAmount = (
    amount: BigNumber | string | undefined,
    decimals: number | undefined,
    symbol: string | undefined
) => {
    return `${amount && decimals ? formatUnits(amount, decimals) : 'some'} ${
        symbol ?? 'tokens'
    }`;
};
