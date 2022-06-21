import Wallet, { thirdparty } from 'ethereumjs-wallet';
import {
    addHexPrefix,
    bufferToHex,
    isValidPrivate,
    stripHexPrefix,
    toBuffer,
} from 'ethereumjs-util';

export enum ImportStrategy {
    PRIVATE_KEY = 'PRIVATE_KEY',
    JSON_FILE = 'JSON_FILE',
}

export type ImportArguments = {
    PRIVATE_KEY: { privateKey: string };
    JSON_FILE: { input: string; password: string };
};

/**
 * Account import handler
 *
 */
export const importHandler: {
    [strategy in ImportStrategy]: (
        args: ImportArguments[strategy]
    ) => Promise<string>;
} = {
    PRIVATE_KEY: async ({ privateKey }) => {
        if (!privateKey) {
            throw new Error('Cannot import an empty key.');
        }

        const prefixed = addHexPrefix(privateKey);
        const buffer = toBuffer(prefixed);

        if (!isValidPrivate(buffer)) {
            throw new Error('Cannot import invalid private key.');
        }

        const stripped = stripHexPrefix(prefixed);
        return stripped;
    },
    JSON_FILE: async ({ input, password }) => {
        let wallet;
        try {
            wallet = thirdparty.fromEtherWallet(input, password);
        } catch (error) {
            wallet = await Wallet.fromV3(input, password, true);
        }

        return walletToPrivateKey(wallet);
    },
};

/**
 * Gets private key from imported account
 *
 * @param wallet
 * @returns Private key
 */
const walletToPrivateKey = (wallet: Wallet) => {
    const privateKeyBuffer = wallet.getPrivateKey();
    return bufferToHex(privateKeyBuffer);
};

/**
 * Export account as JSON
 *
 * @param privateKey Account private key
 * @param password Encryption password
 * @returns Etherem Version 3 Keystore Format object representing the account
 */
export const getAccountJson = async (
    privateKey: string,
    password: string
): Promise<string> => {
    const pk = Buffer.from(privateKey, 'hex');
    const account = Wallet.fromPrivateKey(pk);
    const v3FormattedAcc = await account.toV3(password);
    return JSON.stringify(v3FormattedAcc);
};
