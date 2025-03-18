import log from 'loglevel';
// Use a type-only import for browser
import type { Browser } from 'webextension-polyfill';

// Declare the global browser variable
declare const browser: Browser;

/**
 * Utility class to manage the Ledger bridge window
 * This handles communication with the hardware-wallet-bridge.js page
 */
export class LedgerBridge {
    private bridgeUrl: string;
    private bridgeWindow: Window | null = null;
    private connectionPending = false;

    constructor() {
        // Get the bridge URL from the extension
        this.bridgeUrl = browser.runtime.getURL('hardware-wallet-bridge.html?device=LEDGER');
        log.debug(`Initialized LedgerBridge with URL: ${this.bridgeUrl}`);
    }

    /**
     * Opens the bridge window if not already open
     * @returns A promise that resolves when the window is open
     */
    async openBridgeWindow(): Promise<Window> {
        if (this.bridgeWindow && !this.bridgeWindow.closed) {
            log.debug('Bridge window already open, reusing');
            return this.bridgeWindow;
        }

        log.debug('Opening bridge window');
        this.connectionPending = true;

        // Open a new window
        try {
            this.bridgeWindow = window.open(
                this.bridgeUrl,
                'BlockWallet_LedgerConnect',
                'width=360,height=520,resizable=0,location=0,menubar=0,status=0,toolbar=0'
            );

            if (!this.bridgeWindow) {
                throw new Error('Failed to open Ledger connection window. Please check your popup blocker settings.');
            }

            log.debug('Bridge window opened successfully');
            return this.bridgeWindow;
        } catch (error) {
            log.error('Error opening bridge window:', error);
            this.connectionPending = false;
            throw error;
        }
    }

    /**
     * Checks if the bridge window is still open
     * @returns True if the window is open
     */
    isBridgeWindowOpen(): boolean {
        return !!this.bridgeWindow && !this.bridgeWindow.closed;
    }

    /**
     * Closes the bridge window if open
     */
    closeBridgeWindow(): void {
        if (this.bridgeWindow && !this.bridgeWindow.closed) {
            try {
                this.bridgeWindow.close();
                log.debug('Bridge window closed');
            } catch (e) {
                log.error('Error closing bridge window:', e);
            }
        }

        this.bridgeWindow = null;
        this.connectionPending = false;
    }

    /**
     * Checks the connection status with the bridge
     * @returns Promise resolving to true if connection is active
     */
    async checkBridgeConnection(): Promise<boolean> {
        // If no window is open and we're not trying to connect, return false
        if (!this.bridgeWindow && !this.connectionPending) {
            return false;
        }

        // If window is closed but we thought it was open, reset state
        if (this.bridgeWindow && this.bridgeWindow.closed) {
            log.debug('Bridge window was closed unexpectedly');
            this.bridgeWindow = null;
            this.connectionPending = false;
            return false;
        }

        // Check local storage for connection status
        try {
            const storedResult = localStorage.getItem('hw_bridge_result');
            if (storedResult) {
                const result = JSON.parse(storedResult);

                // Only consider recent results (within last 5 minutes)
                if (result && (Date.now() - result.timestamp < 300000)) {
                    if (result.success && result.device === 'LEDGER') {
                        log.debug('Found successful Ledger connection in localStorage');
                        return true;
                    }
                }
            }
        } catch (e) {
            log.error('Error checking localStorage for bridge status:', e);
        }

        // If we have a window open, check session storage
        if (this.bridgeWindow && !this.bridgeWindow.closed) {
            try {
                // Try to ping the bridge
                return new Promise((resolve) => {
                    // Set a timeout to fail after 2 seconds
                    const timeout = setTimeout(() => {
                        log.debug('Bridge connection check timed out');
                        resolve(false);
                    }, 2000);

                    // Try to send a message to check status
                    browser.runtime.sendMessage({
                        type: 'HW_BRIDGE_PING'
                    }).then((response: unknown) => {
                        clearTimeout(timeout);
                        const typedResponse = response as { status?: string };
                        if (typedResponse && typedResponse.status === 'ready') {
                            log.debug('Bridge responded to ping');
                            resolve(true);
                        } else {
                            log.debug('Bridge ping response invalid:', response);
                            resolve(false);
                        }
                    }).catch((error: Error) => {
                        clearTimeout(timeout);
                        log.error('Error pinging bridge:', error);
                        resolve(false);
                    });
                });
            } catch (e) {
                log.error('Error checking bridge connection:', e);
                return false;
            }
        }

        return false;
    }
}

// Export a singleton instance
export const ledgerBridge = new LedgerBridge(); 