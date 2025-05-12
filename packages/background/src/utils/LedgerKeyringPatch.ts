import LedgerBridgeKeyring from '@block-wallet/eth-ledger-bridge-keyring';
import { bufferToHex, toChecksumAddress } from '@ethereumjs/util';

/**
 * Extends the LedgerBridgeKeyring class with additional methods for service worker compatibility
 * These methods are monkey-patched onto the prototype to allow using the keyring in a service worker
 * environment where DOM access is not available.
 */
export function patchLedgerBridgeKeyring() {
    if (!LedgerBridgeKeyring.prototype.forceAddAccount) {
        /**
         * Force adds an account to the keyring state without requiring Ledger device interaction
         * This is useful for adding accounts in a service worker context where DOM access is not available
         *
         * @param address The Ethereum address to add
         * @returns The added address (checksummed)
         */
        LedgerBridgeKeyring.prototype.forceAddAccount = function (address: string): string {
            if (!address) {
                throw new Error('Address is required');
            }

            // Normalize address
            const normalizedAddress = toChecksumAddress(address);

            // Check if account already exists
            if (this.accounts.includes(normalizedAddress)) {
                return normalizedAddress;
            }

            // Add to accounts array
            this.accounts.push(normalizedAddress);

            // Add minimal account details
            this.accountDetails[normalizedAddress] = {
                address: normalizedAddress,
                hdPath: this.hdPath,
                index: this.accounts.length - 1 // Assign next available index
            };

            return normalizedAddress;
        };

        console.log('[LEDGER] Patched LedgerBridgeKeyring with forceAddAccount method');
    }
}

// Do NOT automatically apply the patch - export it to be called only when needed
// patchLedgerBridgeKeyring();

let patched = false;

/**
 * Apply the patch only if it hasn't been applied yet
 * Returns true if patch was applied, false if already patched
 */
export function ensureLedgerKeyringPatched(): boolean {
    if (!patched) {
        patchLedgerBridgeKeyring();
        patched = true;
        return true;
    }
    return false;
}
