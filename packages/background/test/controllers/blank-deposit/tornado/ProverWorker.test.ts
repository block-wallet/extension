import sinon from 'sinon';
import { expect } from 'chai';
import { bigInt } from '@block-wallet/snarkjs';

describe('ProverWorker', () => {
    beforeEach(async () => {
        if (typeof global !== 'undefined') {
            const { readFileSync } = await import('fs');
            global.fetch = ((fileName: string) =>
                Promise.resolve({
                    json: () =>
                        Promise.resolve(
                            JSON.parse(readFileSync(fileName, 'utf8'))
                        ),
                    arrayBuffer: () =>
                        Promise.resolve(readFileSync(fileName).buffer),
                })) as any;
        }
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should generate a proof correctly', async () => {
        (window as any) = undefined;
        const ProverWorker = (
            await import(
                '../../../../src/controllers/blank-deposit/tornado/ProverWorker'
            )
        ).ProverWorker;
        let proverWorker = new ProverWorker();

        await proverWorker.init(
            './src/controllers/blank-deposit/tornado/config/circuits/tornadoProvingKey.bin',
            './src/controllers/blank-deposit/tornado/config/circuits/tornado.json'
        );

        await proverWorker.updateMerkleTree('deposits-goerli-eth-1', [
            '11254121380933402652013216655814861392564622474190656564071004062369389602552',
        ]);

        const { pathElements, pathIndices, root } =
            await proverWorker.generateMerkleProof('deposits-goerli-eth-1', 0);

        const proof = await proverWorker.getProofData({
            root,
            nullifierHash: bigInt(
                '0x54435e9e7b21cd7ac035b189beb9502f2a4bbf07e330e2c04041736a8a23efc'
            ),
            recipient: bigInt('0x905C54440D62be37D4773B08E5E11eC01Dff14Ee'),
            relayer: bigInt('0x599315f53081b21E0a3DAEdaCb374cE5afAAa2bc'),
            fee: bigInt('100'),
            refund: bigInt(0),
            // Private
            nullifier: bigInt(
                '0x47fcfef4156821aac6c28221235fa3923344e35a3e0362ce11441d45cbc65c'
            ),
            secret: bigInt(
                '0x9e13bd2f67bd80fac52a4973c1f39f30ed500f2d28e720c81a8b176b4d5cb8'
            ),
            pathElements,
            pathIndices,
        });

        expect(typeof proof).not.to.be.equal('undefined');
    }).timeout(100000);
});
