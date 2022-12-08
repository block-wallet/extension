/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Contract } from '@ethersproject/contracts';
import { BigNumber } from '@ethersproject/bignumber';
import { bigInt } from '@block-wallet/snarkjs';
import { v4 as uuid } from 'uuid';

import { INoteDeposit } from '../notes/INoteDeposit';
import { NotesService } from '../notes/NotesService';
import {
    AvailableNetworks,
    CurrencyAmountArray,
    CurrencyAmountPair,
    DepositStatus,
    DERIVATIONS_FORWARD,
} from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { ITornadoContract, TornadoEvents } from './config/ITornadoContract';
import {
    keyToCurrencyAmountPair,
    currencyAmountPairToMapKey,
    toHex,
    compareDepositsByPair,
} from './utils';
import { TornadoEventsDB } from './stores/TornadoEventsDB';
import NetworkController from '../../NetworkController';
import { WorkerRunner } from '../../../infrastructure/workers/WorkerRunner';
import { CircuitInput } from './types';
import { IProverWorker } from './IProverWorker';
import log from 'loglevel';
import { NextDepositResult } from '../notes/INotesService';
import { BlankDepositVault } from '../BlankDepositVault';

type ContractsType = Map<
    string,
    {
        contract?: ITornadoContract;
    }
>;

export class TornadoNotesService extends NotesService {
    private contracts: ContractsType;

    // Prover Worker
    private workerRunner!: WorkerRunner<IProverWorker>;

    constructor(
        private readonly _networkController: NetworkController,
        private readonly _tornadoEventsDb: TornadoEventsDB,
        private readonly _blankDepositVault: BlankDepositVault,
        public updateTornadoEvents: (
            eventType: TornadoEvents,
            currencyAmountPair: CurrencyAmountPair,
            contract: Contract,
            forceUpdate: boolean
        ) => Promise<void>,
        public getFailedDeposits: (
            pair: CurrencyAmountPair
        ) => Promise<IBlankDeposit[]>
    ) {
        super();
        this.contracts = new Map();
    }

    public async updateUnspentNotes(
        unspentDeposits: IBlankDeposit[]
    ): Promise<IBlankDeposit[]> {
        const sortedDeposits = unspentDeposits.sort(compareDepositsByPair);
        const { name: network } = this._networkController.network;

        const checkDeposits = async () => {
            const toUpdate = [];
            let lastDepositKey = '';
            for (const deposit of sortedDeposits) {
                const key = currencyAmountPairToMapKey(deposit.pair);
                if (lastDepositKey !== key) {
                    const contractObj = this.contracts.get(key);

                    if (!contractObj) {
                        throw new Error('Unexpected error');
                    }

                    await this.getWithdrawalEvents(
                        contractObj.contract!,
                        deposit.pair
                    );
                }

                // Check if deposit has been spent
                const isSpent = await this._tornadoEventsDb.isSpent(
                    network as AvailableNetworks,
                    deposit.pair,
                    deposit.nullifierHex
                );

                if (isSpent) {
                    deposit.spent = true;
                    toUpdate.push(deposit);
                }

                lastDepositKey = key;
            }

            return toUpdate;
        };

        return checkDeposits();
    }

    protected async getBlake3Hash(data: Buffer): Promise<Buffer> {
        // Convert to hex string
        const stringifiedData = data.toString('hex');

        // Hash data using blake3
        const hash = (await this.workerRunner.run({
            name: 'blake3',
            data: stringifiedData as Parameters<IProverWorker['blake3']>[0],
        })) as ReturnType<IProverWorker['blake3']>;

        return Buffer.from(hash);
    }

    public async getNoteString(
        deposit: IBlankDeposit,
        chainId: number
    ): Promise<string> {
        const { amount, currency } = deposit.pair;
        const { preImage } = await this.parseDeposit(deposit.note);
        const note = toHex(preImage, 62);

        return `tornado-${currency}-${amount}-${chainId}-${note}`;
    }

    /**
     * Inits the root paths
     */
    public async initRootPath(mnemonic?: string): Promise<void> {
        // Set the derivations root path
        return this.setRootPath(mnemonic);
    }

    public async initialize(): Promise<void> {
        const ProverWorker = (await import('worker-loader!./ProverWorker'))
            .default;
        this.workerRunner = new WorkerRunner(new ProverWorker());

        const provingKeyUrl = chrome.runtime.getURL(
            'snarks/tornado/tornadoProvingKey.bin'
        );
        const withdrawCircuitUrl = chrome.runtime.getURL(
            'snarks/tornado/tornado.json'
        );

        await this.workerRunner.run({
            name: 'init',
            data: { provingKeyUrl, withdrawCircuitUrl } as Parameters<
                IProverWorker['init']
            >[0],
        });
    }

    /**
     * Generate merkle tree for a deposit.
     * Download deposit events from tornado, reconstructs merkle tree, finds our deposit leaf
     * in it and generates merkle proof
     * @param deposit Deposit object
     */
    public async generateMerkleProof(
        contract: ITornadoContract,
        currencyAmountPair: CurrencyAmountPair,
        deposit: Omit<INoteDeposit, 'depositIndex'> & {
            nullifier: Buffer;
            secret: Buffer;
        }
    ): Promise<ReturnType<IProverWorker['generateMerkleProof']>> {
        // Get network
        const { name: network } = this._networkController.network;

        // Get deposit db key
        const key = this._tornadoEventsDb.getDepositTableName(
            network as AvailableNetworks,
            currencyAmountPair
        );

        const getMerkleTreeRoot = async (forceUpdate = false) => {
            // Check if deposit has been already spent
            // const isSpent = await contract.isSpent(toHex(deposit.nullifierHash))
            await this.getWithdrawalEvents(contract, currencyAmountPair);
            const isSpent = await this._tornadoEventsDb.isSpent(
                network as AvailableNetworks,
                currencyAmountPair,
                deposit.nullifierHex
            );

            if (isSpent) {
                throw new Error('The note is already spent');
            }

            const lastLeafIndex = (await this.workerRunner.run({
                name: 'getLastLeafIndex',
                data: { key } as Parameters<
                    IProverWorker['getLastLeafIndex']
                >[0],
            })) as ReturnType<IProverWorker['getLastLeafIndex']>;

            // Update deposit events
            await this.getDepositEvents(
                contract,
                currencyAmountPair,
                forceUpdate
            );

            // Retrieve all events from IndexedDB
            const events =
                await this._tornadoEventsDb.getAllDepositsByLeafIndex(
                    network as AvailableNetworks,
                    currencyAmountPair,
                    lastLeafIndex
                );

            // Assemble merkle tree
            const leaves = events.map((e) =>
                BigNumber.from(e.commitment).toString()
            );
            return this.workerRunner.run({
                name: 'updateMerkleTree',
                data: { key, leaves, forceUpdate } as Parameters<
                    IProverWorker['updateMerkleTree']
                >[0],
            });
        };

        // Validate that our data is correct
        let root = await getMerkleTreeRoot();
        let isValidRoot = await contract.isKnownRoot(toHex(root));

        // Check if valid root
        if (isValidRoot !== true) {
            // Check once more with forceUpdate on true or throw
            root = await getMerkleTreeRoot(true);
            isValidRoot = await contract.isKnownRoot(toHex(root));

            if (!isValidRoot) {
                throw new Error('Merkle tree is corrupted');
            }
        }

        // Get leaf index
        const depEv = await this._tornadoEventsDb.getDepositEventByCommitment(
            network as AvailableNetworks,
            currencyAmountPair,
            deposit.commitmentHex
        );

        if (!depEv) {
            throw new Error('The deposit is not present in the tree');
        }

        // Compute merkle proof of our commitment
        const { leafIndex } = depEv;
        return this.workerRunner.run({
            name: 'generateMerkleProof',
            data: { key, depositLeafIndex: leafIndex } as Parameters<
                IProverWorker['generateMerkleProof']
            >[0],
        }) as Promise<ReturnType<IProverWorker['generateMerkleProof']>>;
    }

    /**
     * It returns the list of Withdrawal events from
     * the specified tornado contract instance
     *
     * @param contract The tornado contract instance
     * @param fromBlock The block to start querying from
     */
    private async getWithdrawalEvents(
        contract: ITornadoContract,
        currencyAmountPair: CurrencyAmountPair,
        forceUpdate = false
    ) {
        return this.updateTornadoEvents(
            TornadoEvents.WITHDRAWAL,
            currencyAmountPair,
            contract,
            forceUpdate
        );
    }

    /**
     * It returns the list of Deposit events from
     * the specified tornado contract instance
     *
     * @param contract The tornado contract instance
     * @param fromBlock The block to start querying from
     */
    private async getDepositEvents(
        contract: ITornadoContract,
        currencyAmountPair: CurrencyAmountPair,
        forceUpdate = false
    ) {
        return this.updateTornadoEvents(
            TornadoEvents.DEPOSIT,
            currencyAmountPair,
            contract,
            forceUpdate
        );
    }

    /**
     * generateProof
     *
     * Generate SNARK proof for withdrawal
     *
     * @param deposit Deposit object
     * @param recipient Funds recipient
     * @param relayer Relayer address
     * @param fee Relayer fee
     * @param refund Receive ether for exchanged tokens
     */
    public async generateProof(
        depositPair: CurrencyAmountPair,
        deposit: Omit<INoteDeposit, 'depositIndex'> & {
            nullifier: Buffer;
            secret: Buffer;
        },
        recipient: string,
        relayerAddress: number | string = 0,
        fee: number | string = 0,
        refund = 0
    ): Promise<{ proof: any; args: string[] }> {
        const contract = this.contracts.get(
            currencyAmountPairToMapKey(depositPair)
        )?.contract;

        if (!contract) {
            throw new Error('Currency/Amount contract instance not supported');
        }

        // Compute merkle proof of our commitment
        const { root, pathElements, pathIndices } =
            await this.generateMerkleProof(contract, depositPair, deposit);

        // Prepare circuit input
        const input: CircuitInput = {
            // Public snark inputs
            root: root,
            nullifierHash: deposit.nullifierHash,
            recipient: bigInt(recipient),
            relayer: bigInt(relayerAddress),
            fee: bigInt(fee),
            refund: bigInt(refund),

            // Private snark inputs
            nullifier: deposit.nullifier,
            secret: deposit.secret,
            pathElements,
            pathIndices,
        };

        // Run prover worker
        const proof = await this.workerRunner.run({
            name: 'getProofData',
            data: { input } as Parameters<IProverWorker['getProofData']>[0],
        });

        const args = [
            toHex(input.root),
            toHex(input.nullifierHash),
            toHex(input.recipient, 20),
            toHex(input.relayer, 20),
            toHex(input.fee),
            toHex(input.refund),
        ];

        return { proof, args };
    }

    /**
     * getPreimageAndNullifier
     *
     * It extracts the secret and nullifier from the hashed key
     * using the hashedKey bytes
     *
     * @param hashedKey The hashed key
     * @returns The preimage, secret and nullifier
     */
    private getPreimageAndNullifier(hashedKey: Buffer) {
        // Extract the secrets (first 31 bytes for nullifier, last 31 bytes for secret)
        const nullifier = hashedKey.slice(0, 31);
        const secret = hashedKey.slice(hashedKey.length - 31);

        // Generate preimage
        const preImage = Buffer.concat([nullifier, secret]);

        return { preImage, nullifier, secret };
    }

    /**
     * Parses a deposit note or preimage
     */
    public async parseDeposit(note: string): Promise<{
        secret: any;
        nullifier: any;
        preImage: Buffer;
        commitment: any;
        commitmentHex: string;
        nullifierHash: any;
        nullifierHex: string;
    }> {
        const buf = Buffer.from(note, 'hex');

        const nullifier = bigInt.leBuff2int(buf.slice(0, 31));
        const secret = bigInt.leBuff2int(buf.slice(31, 62));
        const preImage = Buffer.concat([
            nullifier.leInt2Buff(31),
            secret.leInt2Buff(31),
        ]);

        const commitment = bigInt(
            await this.workerRunner.run({
                name: 'pedersenHash',
                data: preImage.toString('hex') as Parameters<
                    IProverWorker['pedersenHash']
                >[0],
            })
        ); //this.pedersenHash(preImage);
        const commitmentHex = toHex(commitment);

        const nullifierHash = bigInt(
            await this.workerRunner.run({
                name: 'pedersenHash',
                data: nullifier.leInt2Buff(31).toString('hex') as Parameters<
                    IProverWorker['pedersenHash']
                >[0],
            })
        ); // this.pedersenHash(nullifier.leInt2Buff(31));

        const nullifierHex = toHex(nullifierHash);

        return {
            secret,
            nullifier,
            preImage,
            commitment,
            commitmentHex,
            nullifierHash,
            nullifierHex,
        };
    }

    protected async createDeposit(
        depositIndex: number,
        chainId: number,
        pair: CurrencyAmountPair
    ): Promise<INoteDeposit> {
        // Get derived deposit key and its hash
        const derivedKey = this.getDerivedDepositKey(
            depositIndex,
            chainId,
            pair
        );

        const hashedKey = await this.getBlake3Hash(derivedKey);

        // Extract nullifier and secret from the hashedKey
        const { preImage, nullifier } = this.getPreimageAndNullifier(hashedKey);

        // Calculate commitment
        const commitment = bigInt(
            await this.workerRunner.run({
                name: 'pedersenHash',
                data: preImage.toString('hex') as Parameters<
                    IProverWorker['pedersenHash']
                >[0],
            })
        ); // const commitment = this.pedersenHash(preImage);

        const nullifierHash = bigInt(
            await this.workerRunner.run({
                name: 'pedersenHash',
                data: nullifier.toString('hex') as Parameters<
                    IProverWorker['pedersenHash']
                >[0],
            })
        ); // const nullifierHash = this.pedersenHash(nullifier);

        return {
            preImage,
            commitment,
            depositIndex,
            nullifierHash,
            commitmentHex: toHex(commitment),
            nullifierHex: toHex(nullifierHash),
        };
    }

    protected async getNextUnderivedDeposit(
        currencyAmountPairKey: string,
        numberOfDeposits = 0,
        isReconstruct = false,
        ignoreFetch = false,
        chainId: number = this._networkController.network.chainId
    ): Promise<{
        spent?: boolean;
        deposit: INoteDeposit;
        timestamp?: number;
        exists?: boolean;
        replacedFailedDeposit?: boolean;
    }> {
        let depositIndex = numberOfDeposits;

        if (!this.isRootPathSet()) {
            throw new Error(
                'The wallet has not been initialized or it is locked'
            );
        }

        // Get network
        const { name: network } =
            this._networkController.getNetworkFromChainId(chainId)!;

        // Get contract
        if (!this.contracts.has(currencyAmountPairKey)) {
            throw new Error('Contract not available!');
        }
        const { contract } = this.contracts.get(currencyAmountPairKey)!;

        // Get currency amount pair
        const currencyAmountPair = keyToCurrencyAmountPair(
            currencyAmountPairKey
        );

        // Check if there's a failed deposit to use that key first before deriving.
        const failedDeposits = await this.getFailedDeposits(currencyAmountPair);
        depositIndex =
            failedDeposits.length !== 0
                ? failedDeposits[0].depositIndex
                : depositIndex;

        // Derive deposit
        const deposit = await this.createDeposit(
            depositIndex,
            chainId,
            currencyAmountPair
        );

        // Drop failed deposit if deriving it again
        if (failedDeposits.length !== 0) {
            await this._blankDepositVault.dropFailedDeposit(
                failedDeposits[0].id
            );
        }

        // Check if commitment exist and if it's been spent
        try {
            // Try to pick the derived deposit from the events
            let depEv = await this._tornadoEventsDb.getDepositEventByCommitment(
                network as AvailableNetworks,
                currencyAmountPair,
                deposit.commitmentHex
            );

            // If ignoreFetch flag is not set, check again
            // after updating the deposit events
            if (!ignoreFetch) {
                if (!depEv) {
                    try {
                        // Update deposit events
                        await this.getDepositEvents(
                            contract!,
                            currencyAmountPair
                        );
                    } catch (err) {
                        if (isReconstruct) {
                            log.error(
                                'Unable to update the deposits events. Halting reconstruction',
                                err.message || err
                            );
                            throw err;
                        } else {
                            log.warn(
                                'Unable to update the deposits events, tree may be outdated',
                                err.message || err
                            );
                        }
                    }
                    depEv =
                        await this._tornadoEventsDb.getDepositEventByCommitment(
                            network as AvailableNetworks,
                            currencyAmountPair,
                            deposit.commitmentHex
                        );
                }
            }

            // Check if deposit exists
            if (depEv) {
                let spent: boolean | undefined;
                try {
                    spent = await this._tornadoEventsDb.isSpent(
                        network as AvailableNetworks,
                        currencyAmountPair,
                        deposit.nullifierHex
                    );

                    // If isSpent is false, update withdrawal events
                    // for checking whether the not has already been spent
                    if (!spent) {
                        await this.getWithdrawalEvents(
                            contract!,
                            currencyAmountPair
                        );
                        spent = await this._tornadoEventsDb.isSpent(
                            network as AvailableNetworks,
                            currencyAmountPair,
                            deposit.nullifierHex
                        );
                    }
                } catch (error) {
                    log.error('Unable to check if deposit has been spent');
                    spent = undefined;
                }

                // If deposits exists increment counter and yield it
                depositIndex++;
                const timestamp = Number(depEv.timestamp) * 1000;
                return {
                    spent,
                    deposit,
                    exists: true,
                    timestamp,
                };
            } else {
                // If deposits does not exist just yield it
                // Incrementation will be done in case the deposit is succesfully sent to Tornado
                return {
                    deposit,
                    exists: false,
                    replacedFailedDeposit: failedDeposits.length !== 0,
                };
            }
        } catch (error) {
            // If an error ocurred just yield the derived deposit
            log.error('Unable to check if deposit exists', error);
            return {
                deposit,
            };
        }
    }

    public async importNotes(
        unlockPhrase?: string,
        mnemonic?: string,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        // Unlock vault if unlockPhrase provided
        if (unlockPhrase) {
            await this._blankDepositVault.unlock(unlockPhrase);
        }

        const depositsPromise: () => Promise<{
            deposits: IBlankDeposit[];
            errors: string[];
            // eslint-disable-next-line no-async-promise-executor
        }> = async () => {
            try {
                // Reconstruct deposits
                const currentNetworkDepositsResult = await this.reconstruct(
                    mnemonic,
                    chainId
                );

                // Add fulfilled promises only and push errors for rejected ones
                let deposits: IBlankDeposit[] = [];
                const errors: string[] = [];
                for (const deposit of currentNetworkDepositsResult) {
                    if (deposit.status === 'fulfilled') {
                        const recovered = deposit.value.recoveredDeposits;
                        if (recovered) {
                            for (let i = 0; i < recovered.length; i++) {
                                if (!recovered[i].chainId) {
                                    recovered[i].chainId = chainId;
                                }
                            }
                            deposits = deposits.concat(recovered);
                        }
                    } else {
                        errors.push(deposit.reason.message || deposit.reason);
                    }
                }

                return { deposits, errors };
            } catch (error) {
                return error;
            }
        };

        return this._blankDepositVault.importDeposit(depositsPromise, chainId);
    }

    public async reconstruct(
        mnemonic?: string,
        chainId?: number
    ): Promise<PromiseSettledResult<NextDepositResult>[]> {
        const promises: Promise<NextDepositResult>[] = [];

        if (mnemonic) {
            await this.setRootPath(mnemonic);
        }

        for (const [key] of this.contracts) {
            // Init path
            const pair = keyToCurrencyAmountPair(key);

            if (!Object.keys(CurrencyAmountArray).includes(pair.currency)) {
                continue;
            }

            // Init generator from last number of deposit defaulting to zero index start
            promises.push(this.getNextFreeDeposit(pair, true, chainId));
        }

        return Promise.allSettled(promises);
    }

    public async getNextFreeDeposit(
        currencyAmountPair: CurrencyAmountPair,
        isReconstruct = false,
        chainId: number = this._networkController.network.chainId
    ): Promise<NextDepositResult> {
        // Get key for contracts map
        const currencyAmountPairKey =
            currencyAmountPairToMapKey(currencyAmountPair);
        if (!this.contracts.has(currencyAmountPairKey)) {
            throw new Error('Currency/pair not supported');
        }
        const { contract } = this.contracts.get(currencyAmountPairKey)!;
        if (!contract) {
            throw new Error('Unexpected error');
        }

        const network = this._networkController.getNetworkFromChainId(chainId);
        if (!network) {
            throw new Error('Unsupported network');
        }
        // Derivations forward interval for this chain
        const derivationsForward =
            network.tornadoIntervals?.derivationsForward || DERIVATIONS_FORWARD;

        let nextDeposit: any = {};
        const recoveredDeposits: IBlankDeposit[] = [];

        if (isReconstruct) {
            try {
                await Promise.all([
                    this.getDepositEvents(contract, currencyAmountPair, true),
                    this.getWithdrawalEvents(
                        contract,
                        currencyAmountPair,
                        true
                    ),
                ]);
            } catch (error) {
                throw new Error('Unable to make initial event fetch');
            }
        }

        // Reset next deposit index in vault to Zero
        let depositIndex = isReconstruct
            ? 0
            : await this._blankDepositVault.getDerivedDepositIndex(
                  currencyAmountPair,
                  chainId
              );

        // Disabled rule as needed to iterate through all the deposits
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // At this stage getNextDeposit will be initialized
            let deposit = await this.getNextUnderivedDeposit(
                currencyAmountPairKey,
                depositIndex,
                isReconstruct,
                isReconstruct,
                chainId
            );

            if (!(deposit instanceof Object))
                throw new Error('Internal error in generator');

            if (!deposit.exists) {
                if (typeof deposit.exists === 'undefined')
                    throw new Error(
                        'Unable to check if the next deposit already exists'
                    );

                // Check that there aren't any holes in the derivation chain
                let continueDerivating = false;
                for (let i = 1; i < derivationsForward; i++) {
                    const potentialDeposit = await this.getNextUnderivedDeposit(
                        currencyAmountPairKey,
                        depositIndex + i,
                        isReconstruct,
                        true,
                        chainId
                    );

                    if (typeof deposit.exists === 'undefined') {
                        throw new Error(
                            'Unable to check if the next deposit already exists'
                        );
                    }

                    if (potentialDeposit.exists) {
                        deposit = potentialDeposit;
                        continueDerivating = true;
                        break;
                    }
                }

                // If we have found a hole in the derivation chain,
                // we store the recovered deposit increment the index and continue
                if (continueDerivating) {
                    recoveredDeposits.push({
                        id: uuid(),
                        note: deposit.deposit.preImage.toString('hex'),
                        nullifierHex: deposit.deposit.nullifierHex,
                        pair: currencyAmountPair,
                        spent: deposit.spent,
                        timestamp: deposit.timestamp || new Date().getTime(),
                        status: DepositStatus.CONFIRMED,
                        depositIndex: deposit.deposit.depositIndex,
                    });

                    depositIndex = deposit.deposit.depositIndex + 1;
                    continue;
                }

                // Return the next free deposit
                nextDeposit = {
                    deposit: deposit.deposit,
                    pair: currencyAmountPair,
                    spent: false,
                    replacedFailedDeposit: deposit.replacedFailedDeposit,
                } as NextDepositResult['nextDeposit'];

                break;
            } else {
                recoveredDeposits.push({
                    id: uuid(),
                    note: deposit.deposit.preImage.toString('hex'),
                    nullifierHex: deposit.deposit.nullifierHex,
                    pair: currencyAmountPair,
                    spent: deposit.spent,
                    timestamp: deposit.timestamp || new Date().getTime(),
                    status: DepositStatus.CONFIRMED,
                    depositIndex: deposit.deposit.depositIndex,
                });

                // If we found recovered a deposit, increment index
                depositIndex = deposit.deposit.depositIndex + 1;
            }
        }

        return {
            nextDeposit,
            recoveredDeposits:
                recoveredDeposits.length === 0 ? undefined : recoveredDeposits,
        };
    }

    /**
     * It sets the tornado contract
     *
     * @param tornado The tornado contract
     */
    public setTornadoContracts(
        contracts: Map<
            string,
            {
                contract: ITornadoContract;
                decimals: number;
                tokenAddress?: string;
                depositCount: number;
            }
        >
    ): void {
        // Clear previous instances
        this.contracts = new Map();

        // Set instances contracts
        for (const [key, value] of contracts.entries()) {
            if (this.contracts.has(key)) {
                const contractObj = this.contracts.get(key)!;
                contractObj.contract = value.contract;
            } else {
                this.contracts.set(key, {
                    contract: value.contract,
                });
            }
        }
    }
}
