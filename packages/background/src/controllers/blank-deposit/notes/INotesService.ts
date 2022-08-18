import { CurrencyAmountPair } from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { INoteDeposit } from './INoteDeposit';

export type NextDepositResult = {
    nextDeposit: {
        spent?: boolean | undefined;
        deposit: INoteDeposit;
        pair: CurrencyAmountPair;
        replacedFailedDeposit?: boolean;
    };
    recoveredDeposits?: IBlankDeposit[];
};

export interface INotesService {
    /**
     * It returns the next free deposit in the derivation chain
     * that is neither used nor is a hole
     */
    getNextFreeDeposit(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<NextDepositResult>;

    /**
     * reconstruct
     *
     * Deterministically reconstruct the user's notes from the seed phrase
     *
     * @param mnemonic The account mnemonic
     */
    reconstruct(
        mnemonic: string,
        lastDepositIndex?: number
    ): Promise<PromiseSettledResult<NextDepositResult>[]>;

    /**
     * Returns a note string from a deposit
     *
     * @param deposit The deposit
     */
    getNoteString(deposit: IBlankDeposit, chainId: number): Promise<string>;

    /**
     * Checks for possible spent notes and updates its internal state
     *
     * @param unspentDeposits The unspent deposits list
     */
    updateUnspentNotes(
        unspentDeposits: IBlankDeposit[]
    ): Promise<IBlankDeposit[]>;
}
