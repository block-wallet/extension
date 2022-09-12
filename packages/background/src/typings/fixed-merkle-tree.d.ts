/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module '@block-wallet/fixed-merkle-tree' {
    export = MerkleTree;
    /**
     * @callback hashFunction
     * @param left Left leaf
     * @param right Right leaf
     */
    /**
     * Merkle tree
     */
    declare class MerkleTree {
        /**
         * Deserialize data into a MerkleTree instance
         * Make sure to provide the same hashFunction as was used in the source tree,
         * otherwise the tree state will be invalid
         *
         * @param data
         * @param hashFunction
         * @returns {MerkleTree}
         */
        static deserialize(data: any, hashFunction: any): MerkleTree;
        /**
         * Constructor
         * @param {number} levels Number of levels in the tree
         * @param {Array} [elements] Initial elements
         * @param {Object} options
         * @param {hashFunction} [options.hashFunction] Function used to hash 2 leaves
         * @param [options.zeroElement] Value for non-existent leaves
         */
        constructor(
            levels: number,
            elements?: any[],
            {
                hashFunction,
                zeroElement,
            }?: {
                hashFunction?: hashFunction;
                zeroElement?: any;
            }
        );
        levels: number;
        capacity: number;
        zeroElement: any;
        _hash: (left: any, right: any) => any;
        _zeros: any[];
        _layers: any[][];
        _rebuild(): void;
        /**
         * Get tree root
         * @returns {*}
         */
        root(): any;
        /**
         * Insert new element into the tree
         * @param element Element to insert
         */
        insert(element: any): void;
        /**
         * Insert multiple elements into the tree. Tree will be fully rebuilt during this operation.
         * @param {Array} elements Elements to insert
         */
        bulkInsert(elements: any[]): void;
        /**
         * Change an element in the tree
         * @param {number} index Index of element to change
         * @param element Updated element value
         */
        update(index: number, element: any): void;
        /**
         * Get merkle path to a leaf
         * @param {number} index Leaf index to generate path for
         * @returns {{pathElements: Object[], pathIndex: number[]}} An object containing adjacent elements and left-right index
         */
        path(index: number): {
            pathElements: any[];
            pathIndices: number[];
        };
        /**
         * Find an element in the tree
         * @param element An element to find
         * @param comparator A function that checks leaf value equality
         * @returns {number} Index if element is found, otherwise -1
         */
        indexOf(element: any, comparator: any): number;
        /**
         * Returns a copy of non-zero tree elements
         * @returns {Object[]}
         */
        elements(): any[];
        /**
         * Serialize entire tree state including intermediate layers into a plain object
         * Deserializing it back will not require to recompute any hashes
         * Elements are not converted to a plain type, this is responsibility of the caller
         */
        serialize(): {
            levels: number;
            _zeros: any[];
            _layers: any[][];
        };
    }
    declare namespace MerkleTree {
        export { hashFunction };
    }
    type hashFunction = (left: any, right: any) => any;
}
