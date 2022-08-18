/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type * as blake3 from 'blake3/esm/browser';
import * as WebsnarkUtils from 'websnark/src/utils';
import buildGroth16 from 'websnark/src/groth16';
import MerkleTree from 'fixed-merkle-tree';
import { babyJub, pedersenHash } from 'circomlib';

import { CircuitInput } from './types';
import { IProverWorker } from './IProverWorker';
import { DepositsEventsDbKey } from './stores/ITornadoEventsDB';
import { isBrowser } from '../../../utils/isBrowser';
import log from 'loglevel';

const MERKLE_TREE_HEIGHT = 20;
type Blake3 = typeof blake3;

export class ProverWorker {
    private groth16: any;
    private withdrawCircuit: any;
    private withdrawProvingKey: ArrayBuffer | undefined;
    private merkleTree: Map<DepositsEventsDbKey, MerkleTree>;
    private _blake3: Blake3 | undefined;

    constructor() {
        this.merkleTree = new Map();
    }

    /**
     * Initializes withdrawal circuit & proving key
     */
    public async init(
        provingKeyUrl: string,
        withdrawCircuitUrl: string
    ): Promise<void> {
        try {
            const fetchWithdrawCircuitAndProvingKey = async () => {
                // We check if we are on the extension or in a node env
                // to fetch the withdraw files for testing and portability purposes

                this.withdrawCircuit = await (
                    await fetch(withdrawCircuitUrl)
                ).json();
                this.withdrawProvingKey = await (
                    await fetch(provingKeyUrl)
                ).arrayBuffer();
            };

            // Fetch the withdrawal proving key and circuit files
            await fetchWithdrawCircuitAndProvingKey();

            // Instantiate groth16 proving system
            this.groth16 = await buildGroth16();
        } catch (error) {
            log.error(
                'Error initializing websnark requirements.',
                error.message || error
            );
        }

        try {
            if (!this._blake3) {
                this._blake3 = isBrowser()
                    ? await import('blake3/browser')
                    : ((await import('blake3')) as unknown as Blake3);
            }
        } catch (error) {
            log.error(
                'Error initializing blake3 hasher.',
                error.message || error
            );
        }
    }

    /**
     * It returns a 64-byte blake3 hash of the provided data
     * @param data The data to hash
     */
    public async getBlake3Hash(data: Buffer): Promise<Buffer> {
        // Throw if blake3 hasn't been initialized
        if (!this._blake3) {
            throw new Error('Blake3 has not been initialized yet');
        }

        return Buffer.from(
            this._blake3.createHash().update(data).digest({ length: 64 })
        );
    }

    /**
     * It generates a proof given the specified input
     *
     * @param input The circuit input
     * @returns The proof data
     */
    public async getProofData(input: CircuitInput): Promise<any> {
        // Generate proof
        const proofData = await WebsnarkUtils.genWitnessAndProve(
            this.groth16,
            input,
            this.withdrawCircuit,
            this.withdrawProvingKey
        );

        // Return solidity input
        const { proof } = WebsnarkUtils.toSolidityInput(proofData);
        return proof;
    }

    /**
     * It updates the merkle tree to the current leaves and network
     *
     * @param leaves The tree leaves
     * @param network The network name
     * @returns The tree root
     */
    public async updateMerkleTree(
        key: DepositsEventsDbKey,
        leaves: string[],
        forceUpdate = false
    ): Promise<any> {
        // Create or update the instance merkle tree
        let tree: MerkleTree;
        if (!this.merkleTree.has(key) || forceUpdate) {
            this.merkleTree.set(
                key,
                new MerkleTree(MERKLE_TREE_HEIGHT, leaves)
            );
            tree = this.merkleTree.get(key)!;
        } else {
            tree = this.merkleTree.get(key)!;
            leaves.forEach((l) => tree.insert(l));
        }
        return tree.root();
    }

    /**
     * Generate merkle tree proof for a deposit.
     * @param key The db key
     */
    public async generateMerkleProof(
        key: DepositsEventsDbKey,
        depositLeafIndex: number
    ): Promise<{ root: any; pathElements: any[]; pathIndices: number[] }> {
        // Validate that our data is correct
        const tree = this.merkleTree.get(key);
        if (!tree) {
            throw new Error('Merkle tree must be initialized first!');
        }

        // Compute merkle proof of our commitment
        const { pathElements, pathIndices } = tree.path(depositLeafIndex);
        const root = tree.root();
        return { root, pathElements, pathIndices };
    }

    /**
     * isMerkleTreeInitialized
     *
     * @param key The db key
     * @returns Whether the Merkle tree has already been initialized for this instance
     */
    public isMerkleTreeInitialized(key: DepositsEventsDbKey): boolean {
        return this.merkleTree.has(key);
    }

    /**
     * getLastLeafIndex
     *
     * @param key The db key
     * @returns The instance tree last leaf index
     */
    public getLastLeafIndex(key: DepositsEventsDbKey): number | undefined {
        const tree = this.merkleTree.get(key);
        if (!tree) {
            return undefined;
        }

        return tree.elements().length - 1;
    }
}

// Instantiate the prover class
const proofWorker = new ProverWorker();

// eslint-disable-next-line
const ctx: Worker = self as any;
ctx.onmessage = async ({
    data,
}: MessageEvent<{
    id: string;
    name: keyof IProverWorker;
    payload: Parameters<IProverWorker[keyof IProverWorker]>[0];
}>) => {
    try {
        switch (data.name) {
            case 'init': {
                // Init worker
                const { provingKeyUrl, withdrawCircuitUrl } =
                    data.payload as Parameters<IProverWorker['init']>[0];
                await proofWorker.init(provingKeyUrl, withdrawCircuitUrl);
                ctx.postMessage({ id: data.id, response: true });
                break;
            }
            case 'getProofData': {
                // Generate proof and post message when completed
                const { input } = data.payload as Parameters<
                    IProverWorker['getProofData']
                >[0];
                const proof = await proofWorker.getProofData(input);
                ctx.postMessage({ id: data.id, response: proof });
                break;
            }
            case 'isMerkleTreeInitialized': {
                const { key } = data.payload as Parameters<
                    IProverWorker['isMerkleTreeInitialized']
                >[0];
                const isInitialized = proofWorker.isMerkleTreeInitialized(key);
                ctx.postMessage({ id: data.id, response: isInitialized });
                break;
            }
            case 'updateMerkleTree': {
                const {
                    key: dbKey,
                    leaves,
                    forceUpdate,
                } = data.payload as Parameters<
                    IProverWorker['updateMerkleTree']
                >[0];
                const root = await proofWorker.updateMerkleTree(
                    dbKey,
                    leaves,
                    forceUpdate
                );
                ctx.postMessage({ id: data.id, response: root });
                break;
            }
            case 'generateMerkleProof': {
                const { key: key2, depositLeafIndex } =
                    data.payload as Parameters<
                        IProverWorker['generateMerkleProof']
                    >[0];
                const merkleProof = await proofWorker.generateMerkleProof(
                    key2,
                    depositLeafIndex
                );
                ctx.postMessage({ id: data.id, response: merkleProof });
                break;
            }
            case 'getLastLeafIndex': {
                const { key: key3 } = data.payload as Parameters<
                    IProverWorker['getLastLeafIndex']
                >[0];
                const leafIndex = proofWorker.getLastLeafIndex(key3);
                ctx.postMessage({ id: data.id, response: leafIndex });
                break;
            }
            case 'pedersenHash': {
                const bufferedData = Buffer.from(
                    data.payload as Parameters<
                        IProverWorker['pedersenHash']
                    >[0],
                    'hex'
                );
                const hashedData = babyJub.unpackPoint(
                    pedersenHash.hash(bufferedData)
                )[0];
                ctx.postMessage({
                    id: data.id,
                    response: hashedData,
                });
                break;
            }
            case 'blake3': {
                const dataToHash = Buffer.from(
                    data.payload as Parameters<IProverWorker['blake3']>[0],
                    'hex'
                );
                const blakeHashedData = await proofWorker.getBlake3Hash(
                    dataToHash
                );
                ctx.postMessage({ id: data.id, response: blakeHashedData });
                break;
            }
            default:
                break;
        }
    } catch (error) {
        // If throw return error message
        ctx.postMessage({ id: data.id, error: error.message || error });
    }
};
