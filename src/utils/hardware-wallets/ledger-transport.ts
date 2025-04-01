import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { TransportStatusError, TransportError } from '@ledgerhq/errors';
import Eth from '@ledgerhq/hw-app-eth';
import log from 'loglevel';
import { listen } from '@ledgerhq/logs';

// Configure Ledger Logger
listen(log => {
    console.log(`[Ledger][${log.type}]`, log.message);
});

/**
 * Determines the most appropriate transport type based on browser capabilities
 * @returns 'webhid' for modern browsers, otherwise undefined
 */
export const getTransportType = (): 'webhid' | undefined => {
    try {
        return (window?.navigator as any)?.hid ? 'webhid' : undefined;
    } catch (e) {
        return undefined;
    }
};

/**
 * Creates a transport instance based on available browser APIs
 * @returns A Promise that resolves to a Transport instance
 * @throws Error if transport creation fails
 */
export async function createTransport() {
    try {
        const transportType = getTransportType();

        if (!transportType) {
            throw new Error('No compatible Ledger transport available');
        }

        log.debug(`Creating Ledger transport using ${transportType}`);

        if (transportType === 'webhid') {
            return await TransportWebHID.create();
        }

        throw new Error(`Unsupported transport type: ${transportType}`);
    } catch (error) {
        log.error('Failed to create Ledger transport:', error);
        throw error;
    }
}

/**
 * Interface for account information returned from Ledger
 */
interface LedgerAccount {
    address: string;
    index: number;
    path: string;
}

/**
 * LedgerBridge class for managing communication with Ledger devices
 */
export class LedgerBridge {
    private transport: any = null;
    private app: any = null;

    /**
     * Connects to a Ledger device and initializes the Ethereum app
     * @returns A Promise that resolves when the connection is established
     * @throws Error if connection fails
     */
    async connect() {
        try {
            log.debug('Connecting to Ledger device...');
            this.transport = await createTransport();
            this.app = new Eth(this.transport);
            log.debug('Ledger connection established');
            return true;
        } catch (error) {
            log.error('Failed to connect to Ledger device:', error);
            const formattedError = handleLedgerError(error);
            throw new Error(formattedError.message);
        }
    }

    /**
     * Gets a list of accounts from the Ledger device
     * @param hdPath The HD path prefix to use (e.g. m/44'/60'/0')
     * @param pageIndex The page index to start from
     * @param pageSize The number of accounts to retrieve
     * @returns A Promise that resolves to an array of account objects
     * @throws Error if retrieval fails
     */
    async getAccounts(hdPath: string, pageIndex = 0, pageSize = 5): Promise<LedgerAccount[]> {
        if (!this.app) {
            await this.connect();
        }

        const accounts: LedgerAccount[] = [];
        const offset = pageIndex * pageSize;

        try {
            log.debug(`Retrieving ${pageSize} accounts from Ledger starting at index ${offset}`);

            for (let i = 0; i < pageSize; i++) {
                const path = `${hdPath}/${offset + i}'`;
                const result = await this.app.getAddress(path, false, true);
                accounts.push({
                    address: result.address,
                    index: offset + i,
                    path
                });
            }

            return accounts;
        } catch (error) {
            log.error('Failed to retrieve accounts from Ledger:', error);
            const formattedError = handleLedgerError(error);
            throw new Error(formattedError.message);
        }
    }

    /**
     * Signs a transaction using the Ledger device
     * @param hdPath The HD path of the account to sign with
     * @param txHex The transaction hex string to sign
     * @returns A Promise that resolves to the signature components
     * @throws Error if signing fails
     */
    async signTransaction(hdPath: string, txHex: string) {
        if (!this.app) {
            await this.connect();
        }

        try {
            log.debug('Signing transaction with Ledger...');
            const result = await this.app.signTransaction(hdPath, txHex);
            return {
                v: result.v,
                r: result.r,
                s: result.s
            };
        } catch (error) {
            log.error('Failed to sign transaction with Ledger:', error);
            const formattedError = handleLedgerError(error);
            throw new Error(formattedError.message);
        }
    }

    /**
     * Signs a personal message using the Ledger device
     * @param hdPath The HD path of the account to sign with
     * @param messageHex The message hex string to sign
     * @returns A Promise that resolves to the signature components
     * @throws Error if signing fails
     */
    async signMessage(hdPath: string, messageHex: string) {
        if (!this.app) {
            await this.connect();
        }

        try {
            log.debug('Signing personal message with Ledger...');
            const result = await this.app.signPersonalMessage(hdPath, messageHex);
            return {
                v: result.v,
                r: result.r,
                s: result.s
            };
        } catch (error) {
            log.error('Failed to sign message with Ledger:', error);
            const formattedError = handleLedgerError(error);
            throw new Error(formattedError.message);
        }
    }

    /**
     * Signs typed data (EIP-712) using the Ledger device
     * @param hdPath The HD path of the account to sign with
     * @param domainSeparatorHex The domain separator hash
     * @param hashStructMessageHex The message hash
     * @returns A Promise that resolves to the signature components
     * @throws Error if signing fails
     */
    async signTypedData(hdPath: string, domainSeparatorHex: string, hashStructMessageHex: string) {
        if (!this.app) {
            await this.connect();
        }

        try {
            log.debug('Signing typed data with Ledger...');
            const result = await this.app.signEIP712HashedMessage(
                hdPath,
                domainSeparatorHex,
                hashStructMessageHex
            );
            return {
                v: result.v,
                r: result.r,
                s: result.s
            };
        } catch (error) {
            log.error('Failed to sign typed data with Ledger:', error);
            const formattedError = handleLedgerError(error);
            throw new Error(formattedError.message);
        }
    }

    /**
     * Closes the connection to the Ledger device
     * @returns A Promise that resolves when the connection is closed
     */
    async close() {
        if (this.transport) {
            try {
                log.debug('Closing Ledger transport...');
                await this.transport.close();
                this.transport = null;
                this.app = null;
                log.debug('Ledger transport closed');
            } catch (error) {
                log.error('Error closing Ledger transport:', error);
            }
        }
    }
}

/**
 * Interface for error response objects
 */
interface LedgerErrorResponse {
    code: string;
    message: string;
}

/**
 * Handles and formats Ledger-specific errors for better user experience
 * @param error The error object from Ledger operations
 * @returns A formatted error object with code and message
 */
export function handleLedgerError(error: any): LedgerErrorResponse {
    if (error instanceof TransportStatusError) {
        // Handle specific Ledger device errors
        switch (error.statusCode) {
            case 0x6985: // Tx rejected on device
                return { code: 'TRANSACTION_REJECTED', message: 'Transaction rejected by user' };
            case 0x6700: // Wrong length
                return { code: 'INCORRECT_DATA', message: 'Incorrect data format sent to device' };
            case 0x6804: // Not enough memory
                return { code: 'DEVICE_MEMORY_LIMIT', message: 'Transaction too complex for device' };
            case 0x6982: // Security not validated (user canceled prompt)
                return { code: 'USER_CANCELED', message: 'Operation canceled by user' };
            case 0x6a80: // Invalid data
                return { code: 'INVALID_DATA', message: 'Invalid data sent to device' };
            case 0x6d00: // Ethereum app not open
                return { code: 'APP_NOT_OPEN', message: 'Please open the Ethereum app on your Ledger device' };
            default:
                return { code: 'UNKNOWN_DEVICE_ERROR', message: `Device error: ${error.statusCode}` };
        }
    } else if (error instanceof TransportError) {
        return { code: 'TRANSPORT_ERROR', message: 'Connection to Ledger device failed' };
    }

    return { code: 'UNKNOWN_ERROR', message: error?.message || 'Unknown error occurred' };
}

// Export a singleton instance
export const ledgerBridge = new LedgerBridge(); 