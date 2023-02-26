import {
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../controllers/transactions/utils/types';
import {
    createCustomAccountLink,
    createCustomExplorerLink,
} from '@block-wallet/explorer-link';
import { getChainListItem } from './chainlist';

export const showSetUpCompleteNotification = (): void => {
    const url = '';
    const title = 'BlockWallet RPCh (Experimental) is ready!';
    const message =
        "You've completed the set-up process. Check the extension in the upper right corner of your browser.";

    showNotification(title, message, url);
};

export const showTransactionNotification = (txMeta: TransactionMeta): void => {
    const { status, transactionCategory } = txMeta;

    if (
        transactionCategory === TransactionCategories.BLANK_DEPOSIT ||
        transactionCategory === TransactionCategories.BLANK_WITHDRAWAL
    ) {
        showBlankContractNotification(txMeta);
    } else if (status === TransactionStatus.CONFIRMED) {
        showSucceededTransaction(txMeta);
    } else if (status === TransactionStatus.FAILED) {
        showFailedTransaction(txMeta);
    } else if (status === TransactionStatus.REJECTED) {
        showRejectedTransaction(txMeta.error?.message ?? '');
    }
};

export const showBlankContractNotification = (
    txMeta: TransactionMeta
): void => {
    const { status } = txMeta;

    if (status === TransactionStatus.CONFIRMED) {
        showSucceededBlankInteraction(txMeta);
    } else if (status === TransactionStatus.FAILED) {
        showFailedBlankInteraction(txMeta);
    } else if (status === TransactionStatus.REJECTED) {
        showRejectedBlankInteraction(txMeta.error?.message ?? '');
    }
};

export const showIncomingTransactionNotification = (
    account: string,
    chainId: number,
    section?: '' | 'tokentxns' | 'tokentxnsErc721' | 'tokentxnsErc1155'
): void => {
    const explorerUrl = getExplorerUrl(chainId);
    if (!explorerUrl) {
        return;
    }

    addOnClickListener();

    const url = createCustomAccountLink(
        account as string,
        explorerUrl,
        section
    );
    const title = 'Incoming Transaction';
    const message = 'An incoming transaction to your address was confirmed!';

    showNotification(title, message, url);
};

const showSucceededTransaction = (txMeta: TransactionMeta) => {
    const { chainId, transactionParams } = txMeta;
    if (!chainId) {
        return;
    }

    const explorerUrl = getExplorerUrl(chainId);
    if (!explorerUrl) {
        return;
    }

    addOnClickListener();

    const { hash, nonce } = transactionParams;

    const url = createCustomExplorerLink(hash as string, explorerUrl);
    const title = 'Transaction confirmed';
    const message = `Transaction with nonce ${nonce} confirmed!`;

    showNotification(title, message, url);
};

const showSucceededBlankInteraction = (txMeta: TransactionMeta) => {
    const { chainId, transactionParams } = txMeta;
    if (!chainId) {
        return;
    }

    const explorerUrl = getExplorerUrl(chainId);
    if (!explorerUrl) {
        return;
    }

    addOnClickListener();

    const { hash } = transactionParams;

    const url = createCustomExplorerLink(hash as string, explorerUrl);
    const title = 'Blank interaction succeeded';
    const message = 'Privacy Smart Contract interaction has been confirmed!';

    showNotification(title, message, url);
};

const showFailedTransaction = (txMeta: TransactionMeta) => {
    const { chainId, transactionParams } = txMeta;
    if (!chainId) {
        return;
    }

    const explorerUrl = getExplorerUrl(chainId);
    if (!explorerUrl) {
        return;
    }

    addOnClickListener();

    const { hash, nonce } = transactionParams;

    const url = createCustomExplorerLink(hash as string, explorerUrl);
    const title = 'Transaction failed';
    const message = `Transaction with nonce ${nonce} failed!`;

    showNotification(title, message, url);
};

const showFailedBlankInteraction = (txMeta: TransactionMeta) => {
    const { chainId, transactionParams } = txMeta;
    if (!chainId) {
        return;
    }

    const explorerUrl = getExplorerUrl(chainId);
    if (!explorerUrl) {
        return;
    }

    addOnClickListener();

    const { hash } = transactionParams;

    const url = createCustomExplorerLink(hash as string, explorerUrl);
    const title = 'Blank interaction failed';
    const message = 'Privacy Smart Contract interaction failed!';

    showNotification(title, message, url);
};

const showRejectedTransaction = (message: string) => {
    addOnClickListener();

    const title = 'Transaction was rejected';

    showNotification(title, message, '');
};

const showRejectedBlankInteraction = (message: string) => {
    addOnClickListener();

    const title = 'Blank interaction rejected';

    showNotification(title, message, '');
};

const showNotification = (title: string, message: string, url: string) => {
    chrome.notifications.create(url, {
        title: title,
        message: message,
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        type: 'basic',
    });
};

const addOnClickListener = () => {
    if (!chrome.notifications.onClicked.hasListener(linkToEtherscan)) {
        chrome.notifications.onClicked.addListener(linkToEtherscan);
    }
};

const linkToEtherscan = (url: string) => {
    if (url.startsWith('https://')) {
        chrome.tabs.create({ url: url });
    }
};

const getExplorerUrl = (chainId: number) => {
    if (isNaN(chainId)) {
        return undefined;
    }

    const network = getChainListItem(chainId);
    if (!network) {
        return undefined;
    }
    if (!network.explorers || !network.explorers.length) {
        return undefined;
    }
    if (!network.explorers.some((e) => e.url)) {
        return undefined;
    }

    return network.explorers.find((e) => e.url)?.url;
};
