import { CurrencyAmountPair, DepositStatus } from './types';

/**
 * It defines a Blank deposit
 */

export interface IBlankDeposit {
    /**
     * An internal deposit id
     */
    id: string;

    /**
     * The currency/amount pair
     */
    pair: CurrencyAmountPair;

    /**
     * Indicates whether the note has been spent or not
     */
    spent?: boolean;

    /**
     * The note calculated preImage
     */
    note: string;

    /**
     * Precalculated nullifierHex used to check for spent notes
     */
    nullifierHex: string;

    /**
     * The address used for the deposit
     *
     * This is used for alerting the user when withdrawing from the same account
     */
    depositAddress?: string;

    /**
     * The deposit timestamp
     */
    timestamp: number;

    /**
     * It indicates whether it's pending or has already been confirmed
     */
    status: DepositStatus;

    /**
     * It indicates the deposit derivation index
     */
    depositIndex: number;

    /**
     * The deposit chainId
     */
    chainId?: number;
}
