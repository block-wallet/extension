import { CurrencyAmountPair } from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { INotesService, NextDepositResult } from './INotesService';
import { babyJub, pedersenHash } from '@block-wallet/circomlib';
import HDKey from 'ethereumjs-wallet/dist/hdkey';
import { mnemonicToSeed } from 'bip39';
import { INoteDeposit } from './INoteDeposit';
import { getDerivationPath } from '../tornado/config/paths';

export abstract class NotesService implements INotesService {
    // The HD key root path to derive notes
    private _rootPath: HDKey | undefined;

    constructor() {
        // constructor
    }

    /* Public API */

    public abstract updateUnspentNotes(
        unspentDeposits: IBlankDeposit[]
    ): Promise<IBlankDeposit[]>;

    public abstract getNoteString(
        deposit: IBlankDeposit,
        chainId: number
    ): Promise<string>;

    public abstract getNextFreeDeposit(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<{
        nextDeposit: {
            spent?: boolean | undefined;
            deposit: INoteDeposit;
            pair: CurrencyAmountPair;
            increment?: () => number;
        };
        recoveredDeposits?: IBlankDeposit[];
    }>;

    public abstract reconstruct(
        mnemonic: string,
        lastDepositIndex?: number
    ): Promise<PromiseSettledResult<NextDepositResult>[]>;

    /* Protected methods */

    /**
     * createDeposit
     *
     * It creates a deposit for the specified index
     *
     * @param depositIndex The deposit index
     */
    protected abstract createDeposit(
        depositIndex: number,
        chainId: number,
        pair: CurrencyAmountPair
    ): Promise<INoteDeposit>;

    /**
     * getNextUnderivedDeposit
     *
     * It returns the next underived deposit
     *
     * @param currencyAmountPairKey The currency/amount pair key
     * @param numberOfDeposits The number of known deposits
     * @param isReconstruct Whether the method is executed in the context of a reconstruction (for error handling)
     * @param ignoreFetch Whether to skip new deposit fetch
     * @param chainId The chain id to make the derivation in
     */
    protected abstract getNextUnderivedDeposit(
        currencyAmountPairKey: string,
        numberOfDeposits?: number,
        isReconstruct?: boolean,
        ignoreFetch?: boolean,
        chainId?: number
    ): Promise<{
        spent?: boolean;
        deposit: INoteDeposit;
        timestamp?: number;
        exists?: boolean;
        increment?: () => number;
    }>;

    /**
     * getRootPath
     *
     * It initializes a deposit path
     *
     * @param mnemonic The account mnemonic to derive
     */
    protected async setRootPath(mnemonic?: string): Promise<void> {
        if (mnemonic) {
            const seed = await mnemonicToSeed(mnemonic);
            this._rootPath = HDKey.fromMasterSeed(seed);
        } else {
            this._rootPath = undefined;
        }
    }

    /**
     * isRootPathSet
     *
     * @returns Whether the root derivation path is set or not
     */
    protected isRootPathSet(): boolean {
        return !!this._rootPath;
    }

    /**
     * getDerivedDepositKey
     *
     * It returns derived deposit key for the specified index
     *
     * @param depositIndex The deposit index
     */
    protected getDerivedDepositKey(
        depositIndex: number,
        chainId: number,
        pair: CurrencyAmountPair
    ): Buffer {
        if (!this._rootPath) {
            throw new Error('Root path not set!');
        }

        return this._rootPath
            .derivePath(getDerivationPath(chainId, pair))
            .deriveChild(depositIndex)
            .getWallet()
            .getPrivateKey();
    }

    /**
     * It returns a 64-byte blake3 hash of the provided data
     * @param data The data to hash
     */
    protected abstract getBlake3Hash(data: string | Buffer): Promise<Buffer>;

    /**
     * It computes the pedersen hash from the specified input
     *
     * @param data The data to hash
     */
    protected pedersenHash(data: Buffer): any {
        return babyJub.unpackPoint(pedersenHash.hash(data))[0];
    }
}
