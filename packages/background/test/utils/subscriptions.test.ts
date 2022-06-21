import {
    parseBlock,
    validateLogSubscriptionRequest,
} from '@block-wallet/background/utils/subscriptions';
import { Block } from '@block-wallet/background/utils/types/ethereum';
import { expect } from 'chai';

describe('Subscriptions utils', async () => {
    describe('validateLogSubscriptionRequest', async () => {
        it('Should validate a log subscription parameters and throw due to invalid type', () => {
            try {
                validateLogSubscriptionRequest({} as any);
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request'
                );
            }
        });

        it('Should validate a log subscription parameters and throw due to an invalid address', () => {
            try {
                validateLogSubscriptionRequest({ address: '', topics: [] });
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request (Invalid address)'
                );
            }
        });

        it('Should validate a log subscription parameters and throw due to "params" null or undefined', () => {
            try {
                validateLogSubscriptionRequest({
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    topics: null,
                } as any);
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request (Invalid topics)'
                );
            }
        });

        it('Should validate a log subscription parameters and throw due to params not an array', () => {
            try {
                validateLogSubscriptionRequest({
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    topics: {},
                } as any);
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request (Invalid topics)'
                );
            }
        });

        it('Should validate a log subscription parameters and throw due to non hex "params" values', () => {
            try {
                validateLogSubscriptionRequest({
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    topics: ['123', '456', 'fffw'],
                });
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request (Invalid topics)'
                );
            }
        });

        it('Should validate a log subscription parameters and throw due to non hex "params" array values', () => {
            try {
                validateLogSubscriptionRequest({
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    topics: [['123', '456', 'fffw']],
                });
            } catch (error) {
                expect(error.message).to.be.equal(
                    'Invalid eth_subscription request (Invalid topics)'
                );
            }
        });
        it('Should validate a log subscription parameters correctly', () => {
            validateLogSubscriptionRequest({
                address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                topics: [['0xf', '0xa', '0xb']],
            });
        });
    });
    describe('parseBlock', async () => {
        it('Should parse a block', () => {
            expect(
                parseBlock({
                    parentHash:
                        '0x181ee60a790818988417e6922813df001d810d354ef5a0e25c2998a0cf257fde',
                    sha3Uncles:
                        '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
                    miner: '0x0000000000000000000000000000000000000000',
                    stateRoot:
                        '0xf0896ece17cb8b6b2cde71f581fb298ad5d02fbc57cb2b9f6c33b2d0bd01653c',
                    transactionsRoot:
                        '0xb74c8eeb05feb14c87b7624d8d881ce6e377b121b5ac02a7ba7f306181c68a2a',
                    receiptsRoot:
                        '0xc68c2c4de03d589a0cc0daa72ec509b9825413fa6c793b1074128b952bcf8e84',
                    logsBloom:
                        '0x08000000040800000000000000400000080000104000200000000100000000000040001000030080000002000480000000010000000008000002000080200420000400000000005020002008000a0080000082000000000004000008000100040102000002020000200000800001380000000000010000088200009040008c01401000000200000020004000000000200000000000082820001100002000c0000200000000a000100000002000054000000000c02000000000000000008800400010000a100000000000200000804200004000000008002000002100000030004210000002080040080000008000000000000000000800000000000000000000',
                    difficulty: '0x1',
                    number: '0x5e71a7',
                    gasLimit: '0x1c9c364',
                    gasUsed: '0x148099',
                    timestamp: '0x61df387d',
                    extraData:
                        '0xd883010a0d846765746888676f312e31372e32856c696e7578000000000000006ac007716fe483610aab82fea452789b01d5339a7d16208c8adcd6b03ca540c3241fa7e9c731d52561ba74565cb24afd99993f9b395974993614ff7034edb8c101',
                    mixHash:
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                    nonce: '0x0000000000000000',
                    baseFeePerGas: '0x7',
                    hash: '0x6661feef910a7dbd342369b64f13f09250548de2c86c1c9ee15859f53ae8449c',
                })
            ).deep.equal({
                parentHash:
                    '0x181ee60a790818988417e6922813df001d810d354ef5a0e25c2998a0cf257fde',
                sha3Uncles:
                    '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
                miner: '0x0000000000000000000000000000000000000000',
                stateRoot:
                    '0xf0896ece17cb8b6b2cde71f581fb298ad5d02fbc57cb2b9f6c33b2d0bd01653c',
                transactionsRoot:
                    '0xb74c8eeb05feb14c87b7624d8d881ce6e377b121b5ac02a7ba7f306181c68a2a',
                receiptsRoot:
                    '0xc68c2c4de03d589a0cc0daa72ec509b9825413fa6c793b1074128b952bcf8e84',
                logsBloom:
                    '0x08000000040800000000000000400000080000104000200000000100000000000040001000030080000002000480000000010000000008000002000080200420000400000000005020002008000a0080000082000000000004000008000100040102000002020000200000800001380000000000010000088200009040008c01401000000200000020004000000000200000000000082820001100002000c0000200000000a000100000002000054000000000c02000000000000000008800400010000a100000000000200000804200004000000008002000002100000030004210000002080040080000008000000000000000000800000000000000000000',
                difficulty: '0x1',
                number: '0x5e71a7',
                gasLimit: '0x1c9c364',
                gasUsed: '0x148099',
                timestamp: '0x61df387d',
                extraData:
                    '0xd883010a0d846765746888676f312e31372e32856c696e7578000000000000006ac007716fe483610aab82fea452789b01d5339a7d16208c8adcd6b03ca540c3241fa7e9c731d52561ba74565cb24afd99993f9b395974993614ff7034edb8c101',
                mixHash:
                    '0x0000000000000000000000000000000000000000000000000000000000000000',
                nonce: '0x0000000000000000',
                baseFeePerGas: '0x7',
                hash: '0x6661feef910a7dbd342369b64f13f09250548de2c86c1c9ee15859f53ae8449c',
            } as Block);
        });
    });
});
