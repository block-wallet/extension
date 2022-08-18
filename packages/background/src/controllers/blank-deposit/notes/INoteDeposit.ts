export interface INoteDeposit {
    preImage: Buffer;
    commitment: Buffer;
    nullifierHash: Buffer;
    commitmentHex: string;
    nullifierHex: string;
    depositIndex: number;
}
