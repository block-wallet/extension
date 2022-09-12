/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as WebsnarkUtils from '@block-wallet/websnark/src/utils';
import buildGroth16 from '@block-wallet/websnark/src/groth16';
import MerkleTree from '@block-wallet/fixed-merkle-tree';

import { CircuitInput } from './types';
import { DepositsEventsDbKey } from './stores/ITornadoEventsDB';
import log from 'loglevel';

const MERKLE_TREE_HEIGHT = 20;

export class CircuitProver {
    private groth16: any;
    private withdrawCircuit: any;
    private withdrawProvingKey: ArrayBuffer | undefined;
    private merkleTree: Map<DepositsEventsDbKey, MerkleTree>;

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
