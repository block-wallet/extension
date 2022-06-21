/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Mutex } from 'async-mutex';
import NetworkController from '../NetworkController';
import { TransactionMeta } from './utils/types';

const GLOBAL_MUTEX = 'GLOBAL';

/**
 * @property nextNonce - The highest of the nonce values derived based on confirmed and pending transactions and eth_getTransactionCount method
 * @property releaseLock
 */
export interface NonceLock {
    nextNonce: number;
    releaseLock: () => void;
}

export class NonceTracker {
    private readonly locks: { [lockKey: string]: Mutex };

    constructor(
        private readonly _networkController: NetworkController,
        private readonly getConfirmedTransactions: (
            address: string
        ) => TransactionMeta[],
        private readonly getPendingTransactions: (
            address: string
        ) => TransactionMeta[]
    ) {
        this.locks = {};
    }

    /**
     * Function returns the nonce details from the latest block in the network
     *
     * @param address The hex string for the address whose nonce we are calculating
     */
    public async getNetworkNonce(address: string): Promise<number> {
        // Obtain network nonce
        const baseCount = await this._networkController
            .getProvider()
            .getTransactionCount(address, 'latest');

        if (!Number.isInteger(baseCount)) {
            throw new Error(
                `NonceTracker - baseCount is not an integer - got: (${typeof baseCount}) "${baseCount}"`
            );
        }

        return baseCount;
    }

    /**
     * It returns the highest nonce from the locally confirmed transactions
     *
     * @param address The address to look up for
     */
    private async getHighestLocallyConfirmedNonce(
        address: string
    ): Promise<number> {
        const confirmedTransactions = this.getConfirmedTransactions(address);
        const confirmedNonces = confirmedTransactions.map(
            (transaction) => transaction.transactionParams.nonce!
        );

        const highestNonce = Math.max.apply(null, confirmedNonces);
        return Number.isInteger(highestNonce) ? highestNonce + 1 : 0;
    }

    /**
     * It returns the next nonce value higher than the highest nonce
     * from the transactions list and the network latest block
     *
     * @param address The address to look up for
     */
    public getHighestContinousNextNonce = async (
        address: string
    ): Promise<number> => {
        const networkNonce = await this.getNetworkNonce(address);
        const highestLocallyConfirmed =
            await this.getHighestLocallyConfirmedNonce(address);

        const highestSuggested = Math.max(
            networkNonce,
            highestLocallyConfirmed
        );

        const pending = this.getPendingTransactions(address);
        const nonces = pending.map(
            (transaction) => transaction.transactionParams.nonce!
        );

        let highest = highestSuggested;
        while (nonces.includes(highest)) {
            highest += 1;
        }

        return Math.max(networkNonce, highest);
    };

    /**
     * It gets a mutex or creates one for the provided key
     *
     * @param lockKey The lock key
     */
    private getMutex(lockKey: string) {
        let mutex = this.locks[lockKey];
        if (!mutex) {
            mutex = new Mutex();
            this.locks[lockKey] = mutex;
        }
        return mutex;
    }

    /**
     * It acquires a lock on the specified mutex and
     * returns a `Promise` of the `releaseLock` function
     *
     * @param lockKey The lock key
     */
    private async takeMutex(lockKey: string) {
        const mutex = this.getMutex(lockKey);
        const releaseLock = await mutex.acquire();

        return releaseLock;
    }

    /**
     * It gets the global lock
     *
     * @returns An object with a releaseLock function (for the global mutex)
     */
    public async getGlobalLock(): Promise<{ releaseLock: () => void }> {
        const globalMutex = this.getMutex(GLOBAL_MUTEX);

        // await global mutex free
        const releaseLock = await globalMutex.acquire();
        return { releaseLock };
    }

    /**
     * It returns an object with the `nextNonce` and the `releaseLock` function
     * Note: releaseLock must be called after adding a signed transaction to pending transactions (or discarding).
     *
     * @param address the hex string for the address whose nonce we are calculating
     * @returns {Promise<NonceLock>}
     */
    public async getNonceLock(address: string): Promise<NonceLock> {
        // await global mutex free
        const { releaseLock: freeGlobalLock } = await this.getGlobalLock();
        freeGlobalLock();

        // await lock free, then take lock
        const releaseLock = await this.takeMutex(address);

        try {
            // evaluate multiple nextNonce strategies

            const nextNonce = await this.getHighestContinousNextNonce(address);

            // Throw if not integer
            if (!Number.isInteger(nextNonce)) {
                throw new Error(
                    `NonceTracker - nextNonce is not an integer - got: (${typeof nextNonce}) "${nextNonce}"`
                );
            }

            // return nonce and release callback
            return { nextNonce, releaseLock };
        } catch (err) {
            // release lock if we encounter an error
            releaseLock();
            throw err;
        }
    }
}
