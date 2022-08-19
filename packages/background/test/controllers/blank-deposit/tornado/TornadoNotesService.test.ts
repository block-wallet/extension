import sinon from 'sinon';
import { expect } from 'chai';
import { babyJub, pedersenHash } from 'circomlib';

import HDKey from 'ethereumjs-wallet/dist/hdkey';

import { TornadoNotesService } from '../../../../src/controllers/blank-deposit/tornado/TornadoNotesService';
import { INoteDeposit } from '../../../../src/controllers/blank-deposit/notes/INoteDeposit';
import {
    AvailableNetworks,
    CurrencyAmountPair,
    KnownCurrencies,
} from '../../../../src/controllers/blank-deposit/types';

import {
    DepositEventsMock,
    WithdrawalEventsMock,
} from './mocks/EventsMock.mock';
import { BigNumber } from 'ethers';
import { TornadoEventsDB } from '../../../../src/controllers/blank-deposit/tornado/stores/TornadoEventsDB';
import { TornadoEvents } from '../../../../src/controllers/blank-deposit/tornado/config/ITornadoContract';
import mockIndexedDB from './mocks/mockIndexedDB';
import NetworkController from '../../../../src/controllers/NetworkController';
import { createHash } from 'blake3';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';
import { NextDepositResult } from '@block-wallet/background/controllers/blank-deposit/notes/INotesService';
import { BlankDepositVault } from '@block-wallet/background/controllers/blank-deposit/BlankDepositVault';
import mockEncryptor from 'test/mocks/mock-encryptor';
import { currencyAmountPairToMapKey } from '@block-wallet/background/controllers/blank-deposit/tornado/utils';

describe('TornadoNotesService', () => {
    let mnemonic =
        'reject hood palace sad female review depth camp clown peace social real behave rib ability cereal grab illness settle process gate lizard uniform glimpse';

    let networkController: NetworkController;
    let tornadoNotesService: TornadoNotesService;
    let tornadoEventsDb: TornadoEventsDB;
    let blankDepositVault: BlankDepositVault;

    beforeEach(async () => {
        if (typeof process === 'object') {
            mockIndexedDB();
        }
        tornadoEventsDb = new TornadoEventsDB('test-db');
        await tornadoEventsDb.createStoreInstances();

        networkController = getNetworkControllerInstance();

        blankDepositVault = new BlankDepositVault({
            networkController: networkController,
            vault: '',
            encryptor: mockEncryptor,
        });

        tornadoNotesService = new TornadoNotesService(
            networkController,
            tornadoEventsDb,
            blankDepositVault,
            async (
                type: TornadoEvents,
                currencyAmountPair: CurrencyAmountPair
            ) => {
                const events =
                    type === TornadoEvents.DEPOSIT
                        ? {
                              type,
                              events: DepositEventsMock.events.map((e) => ({
                                  blockNumber: e.blockNumber,
                                  transactionHash: e.transactionHash,
                                  ...e.args,
                              })),
                          }
                        : {
                              type,
                              events: WithdrawalEventsMock.events.map((e) => ({
                                  blockNumber: e.blockNumber,
                                  transactionHash: e.transactionHash,
                                  nullifierHex: e.args.nullifierHash,
                                  fee: e.args.fee as unknown as BigNumber,
                                  to: e.args.to,
                              })),
                          };

                await tornadoEventsDb.updateEvents(
                    AvailableNetworks.GOERLI,
                    currencyAmountPair,
                    events
                );
            },
            () => Promise.resolve([])
        );

        // set contract info for eth-1
        const keys = ['eth-1', 'eth-10', 'dai-100'];
        const contracts = new Map<
            string,
            {
                contract: any;
                rootPath?: HDKey;
                getNextDeposit?: AsyncGenerator<
                    {
                        spent?: boolean;
                        deposit: INoteDeposit;
                        exists?: boolean;
                        timestamp?: number;
                    },
                    void,
                    unknown
                >;
            }
        >();

        for (let n = 0; n < keys.length; n++) {
            contracts.set(keys[n], {
                contract: { isKnownRoot: () => true },
                getNextDeposit: (
                    tornadoNotesService as any
                ).getNextUnderivedDeposit(keys[n], 0),
            });
        }

        tornadoNotesService['workerRunner'] = {
            run: async ({ name, data }: { name: string; data: string }) => {
                if (name === 'pedersenHash') {
                    return babyJub.unpackPoint(
                        pedersenHash.hash(Buffer.from(data, 'hex'))
                    )[0];
                } else if (name === 'blake3') {
                    return createHash()
                        .update(Buffer.from(data, 'hex'))
                        .digest({ length: 64 });
                }
            },
        } as any;

        (tornadoNotesService as any).contracts = contracts;

        await (tornadoNotesService as any)._blankDepositVault.initializeVault(
            mnemonic
        );

        await (tornadoNotesService as any)._blankDepositVault.unlock(mnemonic);

        // Init root path
        await tornadoNotesService.initRootPath(mnemonic);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should derive different keys for the same deposit index on different networks', async () => {
        const commitmentHex = [
            '0x0b163d894eae5bfd8923c0c877cc5106ab23b07ce353759d4de2ace32f5a8ca4',
            '0x0fe63af3c134c31a5fb9f55a3373a1dd79ca42711723b8977923d030ea498911',
        ];

        const nullifierHex = [
            '0x1c3369e637592d99c3a7f0fdc379693a27ce4c1bcb80e411084dd58677b85fb5',
            '0x11a3732258da283e880f8ea1e2ac529190d69322b2d0f49976ae2f120da27fdc',
        ];

        const testDeposit = async (index: number) => {
            // Get next free deposit
            const { nextDeposit, recoveredDeposits } =
                await tornadoNotesService.getNextFreeDeposit({
                    amount: '1',
                    currency: KnownCurrencies.ETH,
                });

            expect(nextDeposit.deposit.commitmentHex).to.be.equal(
                commitmentHex[index]
            );
            expect(nextDeposit.deposit.nullifierHex).to.be.equal(
                nullifierHex[index]
            );
            expect(typeof recoveredDeposits).to.be.equal('undefined');
        };

        testDeposit(0);

        // Change network
        await networkController.setNetwork('mainnet');

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                testDeposit(1);
                resolve();
            }, 1000);
        });
    }).timeout(60000);

    it('Should get the next free deposits for eth-1 and dai-100 instances and no recovered deposits correctly', async () => {
        const commitmentHex = [
            '0x1dd718ff5da836c6ae9c8a997c4a11dfded226f4c7bbabb6ba05436361407195',
            '0x05065264dba30f84624104ace9bce7757af9cb65ad901f21e5a5d5074ccfae8e',
        ];

        const nullifierHex = [
            '0x0b57f04e919e4cbb77caf60e5e9da054dd927f0dc52e034baad275d5f031ede5',
            '0x1dfa30c4e871904cf273ee94d966332821eaa812e5c4cbaa0cb98950f017d120',
        ];

        // Get next free deposit
        let { nextDeposit, recoveredDeposits } =
            await tornadoNotesService.getNextFreeDeposit({
                amount: '1',
                currency: KnownCurrencies.ETH,
            });

        expect(nextDeposit.deposit.commitmentHex).to.be.equal(commitmentHex[0]);
        expect(nextDeposit.deposit.nullifierHex).to.be.equal(nullifierHex[0]);
        expect(typeof recoveredDeposits).to.be.equal('undefined');

        // Get next free deposit
        ({ nextDeposit, recoveredDeposits } =
            await tornadoNotesService.getNextFreeDeposit({
                amount: '100',
                currency: KnownCurrencies.DAI,
            }));

        expect(nextDeposit.deposit.commitmentHex).to.be.equal(commitmentHex[1]);
        expect(nextDeposit.deposit.nullifierHex).to.be.equal(nullifierHex[1]);
        expect(typeof recoveredDeposits).to.be.equal('undefined');
    }).timeout(60000);

    it('Should get the next free deposit for eth-1 instance and a recovered unspent deposit', async () => {
        // Add the first derivation deposit to the deposits events but not to the withdrawal's
        tornadoEventsDb.putValue('deposits-goerli-eth-1', {
            blockNumber: 123312,
            transactionHash: '',
            commitment:
                '0x1dd718ff5da836c6ae9c8a997c4a11dfded226f4c7bbabb6ba05436361407195',
            leafIndex: 230,
            timestamp: BigNumber.from('0x6032b002').toString(),
        });

        const expectedDeposits = {
            restored: {
                commitment:
                    '0x1dd718ff5da836c6ae9c8a997c4a11dfded226f4c7bbabb6ba05436361407195',
                nullifier:
                    '0x0b57f04e919e4cbb77caf60e5e9da054dd927f0dc52e034baad275d5f031ede5',
                note: '0e48ed202d10aa4aab2bd7f63040baebbb3c90f1d75cfcd0f8d9a4ddb84dfe2291d0ce09fc706ea5d88814e649ccfa82a0e9d3f7fadef47b9a2e4cba86dd',
            },
            new: {
                commitment:
                    '0x248e447e4515c2884a8eb67271a26626d7e252dde584728f9e3d5046d42fc4eb',
                nullifier:
                    '0x07a19b5dc06e6134f2339ef85d6fa5ffbab2a40bca8cca3dba63d32264388a00',
            },
        };

        // Get next free deposit
        const { nextDeposit, recoveredDeposits } =
            await tornadoNotesService.getNextFreeDeposit({
                amount: '1',
                currency: KnownCurrencies.ETH,
            });

        // Check if the new deposit is correct
        expect(nextDeposit.deposit.commitmentHex).to.be.equal(
            expectedDeposits.new.commitment
        );
        expect(nextDeposit.deposit.nullifierHex).to.be.equal(
            expectedDeposits.new.nullifier
        );

        // Check if the restored deposit is ok
        expect(recoveredDeposits?.length).to.be.equal(1);
        expect(recoveredDeposits![0].note).to.be.equal(
            expectedDeposits.restored.note
        );
        expect(recoveredDeposits![0].spent).to.be.equal(false);
    }).timeout(60000);

    it('Should restore the deposits from the mnemonic', async () => {
        tornadoEventsDb.putValue('deposits-goerli-eth-1', {
            blockNumber: 123312,
            transactionHash: '',
            commitment:
                '0x1dd718ff5da836c6ae9c8a997c4a11dfded226f4c7bbabb6ba05436361407195',
            leafIndex: 229,
            timestamp: BigNumber.from('0x6032b002').toString(),
        });

        tornadoEventsDb.putValue('deposits-goerli-eth-1', {
            blockNumber: 123315,
            transactionHash: '',
            commitment:
                '0x248e447e4515c2884a8eb67271a26626d7e252dde584728f9e3d5046d42fc4eb',
            leafIndex: 230,
            timestamp: BigNumber.from('0x6032b002').toString(),
        });

        const expectedDeposits = [
            {
                note: '0e48ed202d10aa4aab2bd7f63040baebbb3c90f1d75cfcd0f8d9a4ddb84dfe2291d0ce09fc706ea5d88814e649ccfa82a0e9d3f7fadef47b9a2e4cba86dd',
            },
            {
                note: 'e7f679fa7fb1faf02a525424f273ee3dbfca89ba8ee52d9914cbcff440437eda1ed116bac8e7c7282a4d3d64ef85735de3932dca1c216b097c2680a027e2',
            },
        ];

        // Reconstruct
        const depositsResult = await tornadoNotesService.reconstruct(mnemonic);

        // Test if deposits were reconstructed correctly
        // ETH-1
        let deposit = depositsResult[0];
        expect(deposit.status).to.be.equal('fulfilled');

        let item = (deposit as PromiseFulfilledResult<NextDepositResult>).value;

        let recovered = item.recoveredDeposits;
        expect(recovered).to.not.be.undefined;
        expect(recovered![0].note).to.be.equal(expectedDeposits[0].note);
        expect(recovered![1].note).to.be.equal(expectedDeposits[1].note);

        // ETH-10
        deposit = depositsResult[1];
        expect(deposit.status).to.be.equal('fulfilled');

        item = (deposit as PromiseFulfilledResult<NextDepositResult>).value;
        recovered = item.recoveredDeposits;
        expect(recovered).to.be.undefined;
    }).timeout(60000);

    it('Should obtain 5 free deposit keys from the mnemonic without completing the iterator', async () => {
        mnemonic =
            'plastic monster service bird give curve taxi melt rule aspect umbrella shrimp hundred nuclear basic assume affair jungle divert wall volume will wisdom grace';

        // Init root path
        await tornadoNotesService.initRootPath(mnemonic);

        let last = { deposit: { commitmentHex: '' } };
        for (let i = 0; i < 5; i++) {
            const nextDeposit = await (
                tornadoNotesService as any
            ).getNextUnderivedDeposit(
                currencyAmountPairToMapKey({
                    amount: '1',
                    currency: KnownCurrencies.ETH,
                }),
                i
            );

            expect(typeof nextDeposit).not.to.be.equal('undefined');
            expect(nextDeposit.deposit.commitmentHex).not.to.be.equal(
                last.deposit.commitmentHex
            );
            last = nextDeposit;
        }
    }).timeout(60000);

    it('Should parse a note correctly', async () => {
        const { nextDeposit } = await tornadoNotesService.getNextFreeDeposit({
            amount: '1',
            currency: KnownCurrencies.ETH,
        });

        const note = nextDeposit.deposit.preImage.toString('hex');
        const parsedNote = await tornadoNotesService.parseDeposit(note);

        expect(parsedNote.commitmentHex).to.be.equal(
            nextDeposit.deposit.commitmentHex
        );
        expect(parsedNote.nullifierHex).to.be.equal(
            nextDeposit.deposit.nullifierHex
        );
    }).timeout(60000);
});
