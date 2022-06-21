import {
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from '../controllers/transactions/utils/types';
import {
    createExplorerLink,
    createAccountLink,
} from '@block-wallet/explorer-link';

export const showSetUpCompleteNotification = (): void => {
    const url = '';
    const title = 'Block Wallet is ready!';
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
    chainId: string
): void => {
    addOnClickListener();

    const url = createAccountLink(account as string, String(chainId));
    const title = 'Incoming Transaction';
    const message = 'An incoming transaction to your address was confirmed!';

    showNotification(title, message, url);
};

const showSucceededTransaction = (txMeta: TransactionMeta) => {
    addOnClickListener();

    const { chainId, transactionParams } = txMeta;
    const { hash, nonce } = transactionParams;

    const url = createExplorerLink(hash as string, String(chainId));

    const title = 'Transaction confirmed';
    const message = `Transaction with nonce ${nonce} confirmed!`;

    showNotification(title, message, url);
};

const showSucceededBlankInteraction = (txMeta: TransactionMeta) => {
    addOnClickListener();

    const { chainId, transactionParams } = txMeta;
    const { hash } = transactionParams;

    const url = createExplorerLink(hash as string, String(chainId));

    const title = 'Blank interaction succeeded';
    const message = 'Privacy Smart Contract interaction has been confirmed!';

    showNotification(title, message, url);
};

const showFailedTransaction = (txMeta: TransactionMeta) => {
    addOnClickListener();

    const { chainId, transactionParams } = txMeta;
    const { hash, nonce } = transactionParams;

    const url = createExplorerLink(hash as string, String(chainId));

    const title = 'Transaction failed';
    const message = `Transaction with nonce ${nonce} failed!`;

    showNotification(title, message, url);
};

const showFailedBlankInteraction = (txMeta: TransactionMeta) => {
    addOnClickListener();

    const { chainId, transactionParams } = txMeta;
    const { hash } = transactionParams;

    const url = createExplorerLink(hash as string, String(chainId));

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
