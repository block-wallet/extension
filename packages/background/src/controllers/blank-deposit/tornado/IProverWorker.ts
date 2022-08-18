import { DepositsEventsDbKey } from './stores/ITornadoEventsDB';
import { CircuitInput } from './types';

export interface IProverWorker {
    init: (data: { provingKeyUrl: string; withdrawCircuitUrl: string }) => void;
    getProofData: (data: { input: CircuitInput }) => any;
    isMerkleTreeInitialized: (data: { key: DepositsEventsDbKey }) => boolean;
    generateMerkleProof: (data: {
        key: DepositsEventsDbKey;
        depositLeafIndex: number;
    }) => {
        root: any;
        pathElements: any;
        pathIndices: any;
    };
    updateMerkleTree: (data: {
        key: DepositsEventsDbKey;
        leaves: string[];
        forceUpdate?: boolean;
    }) => any;
    getLastLeafIndex: (data: {
        key: DepositsEventsDbKey;
    }) => number | undefined;
    pedersenHash: (hexData: string) => any;
    blake3: (hexData: string) => Buffer;
}
