/**
 * UI-side ledgerBridge utility that connects to the background's ledgerBridge
 * via message passing. The UI doesn't directly interact with the ledger device;
 * it just sends messages to the background script.
 */

import { Messages } from '../context/commTypes';
import log from 'loglevel';

// We need to use direct chrome messaging since we need to define new message types
const sendMessage = async <T>(method: string, params?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                method,
                params,
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response && response.error) {
                    reject(response.error);
                } else {
                    resolve(response?.result);
                }
            }
        );
    });
};

interface LedgerBridge {
    // Connection status check
    checkWebHIDStatus(): Promise<boolean>;
    // Connect to the device
    connectUsingWebHID(): Promise<boolean>;
    // Get accounts from the device
    getAccounts(pageIndex?: number, pageSize?: number): Promise<string[]>;
    // Get multiple accounts by index
    getMultipleAccounts(indexes: number[]): Promise<string[]>;
    // Verify that the Ethereum app is open
    verifyEthereumAppOpen(): Promise<{ appOpen: boolean }>;
}

class LedgerBridgeUI implements LedgerBridge {
    // Message types for Ledger operations
    private readonly MESSAGE_TYPES = {
        CHECK_STATUS: "ledger_check_webhid_status",
        CONNECT: "ledger_connect_webhid",
        GET_ACCOUNTS: "ledger_get_accounts",
        GET_MULTIPLE_ACCOUNTS: "ledger_get_multiple_accounts",
        VERIFY_APP: "ledger_verify_ethereum_app"
    };

    constructor() {
        log.debug('Initialized UI-side LedgerBridge for communication with background');
        console.log('[LEDGER] UI-side LedgerBridge initialized');
    }

    /**
     * Check if a WebHID connection to a Ledger device is available
     * @returns Promise resolving to a boolean indicating if connected
     */
    public async checkWebHIDStatus(): Promise<boolean> {
        try {
            return sendMessage(this.MESSAGE_TYPES.CHECK_STATUS);
        } catch (error) {
            log.error('Error checking WebHID status:', error);
            return false;
        }
    }

    /**
     * Connect to a Ledger device using WebHID
     * @returns Promise resolving to true if connected
     */
    public async connectUsingWebHID(): Promise<boolean> {
        try {
            return sendMessage(this.MESSAGE_TYPES.CONNECT);
        } catch (error) {
            log.error('Error connecting using WebHID:', error);
            throw error;
        }
    }

    /**
     * Get accounts from Ledger device
     * @param pageIndex The page index to get accounts from
     * @param pageSize The number of accounts per page
     * @returns Promise resolving to an array of addresses
     */
    public async getAccounts(pageIndex: number = 0, pageSize: number = 5): Promise<string[]> {
        try {
            return sendMessage(this.MESSAGE_TYPES.GET_ACCOUNTS, { pageIndex, pageSize });
        } catch (error) {
            log.error('Error getting Ledger accounts:', error);
            throw error;
        }
    }

    /**
     * Get multiple accounts by their indexes
     * @param indexes Array of account indexes to retrieve
     * @returns Promise resolving to an array of addresses
     */
    public async getMultipleAccounts(indexes: number[]): Promise<string[]> {
        try {
            return sendMessage(this.MESSAGE_TYPES.GET_MULTIPLE_ACCOUNTS, { indexes });
        } catch (error) {
            log.error('Error getting multiple Ledger accounts:', error);
            throw error;
        }
    }

    /**
     * Verify that the Ethereum app is open on the Ledger device
     * @returns Promise resolving to an object with appOpen boolean
     */
    public async verifyEthereumAppOpen(): Promise<{ appOpen: boolean }> {
        try {
            return sendMessage(this.MESSAGE_TYPES.VERIFY_APP);
        } catch (error) {
            log.error('Error verifying Ethereum app status:', error);
            return { appOpen: false };
        }
    }
}

export const ledgerBridge = new LedgerBridgeUI(); 