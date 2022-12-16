import {
    AddressBookController,
    AddressBookControllerProps,
} from '../../src/controllers/AddressBookController';
import { expect } from 'chai';
import sinon from 'sinon';
import NetworkController from '../../src/controllers/NetworkController';
import { mockPreferencesController } from '../mocks/mock-preferences';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { mockedPermissionsController } from '../mocks/mock-permissions';
import { ActivityListController } from '@block-wallet/background/controllers/ActivityListController';
import { PendingWithdrawalsStore } from '@block-wallet/background/controllers/privacy/types';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import {
    TokenController,
    TokenControllerProps,
} from '@block-wallet/background/controllers/erc-20/TokenController';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { TransactionWatcherController } from '@block-wallet/background/controllers/TransactionWatcherController';
import { PrivacyAsyncController } from '@block-wallet/background/controllers/privacy/PrivacyAsyncController';
import BridgeController from '@block-wallet/background/controllers/BridgeController';
import TokenAllowanceController from '@block-wallet/background/controllers/erc-20/transactions/TokenAllowanceController';
import { AccountTrackerController } from '@block-wallet/background/controllers/AccountTrackerController';
import { mockKeyringController } from 'test/mocks/mock-keyring-controller';

describe('Address book controller implementation', function () {
    const accounts = {
        goerli: [
            {
                key: '7fe1315d0fa2f408dacddb41deacddec915e85c982e9cbdaacc6eedcb3f9793b',
                address: '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
            },
            {
                key: '4b95973deb96905fd605d765f31d1ce651e627d61c136fa2b8eb246a3c549ebe',
                address: '0xbda8C7b7B5d0579Eb18996D1f684A434E4fF701f',
            },
        ],
    };
    let addressBookController: AddressBookController;
    let networkController: NetworkController;
    let transactionController: TransactionController;
    let preferencesController: PreferencesController;
    let permissionsController: PermissionsController;
    let activityListController: ActivityListController;
    let privacyController: PrivacyAsyncController;
    let bridgeController: BridgeController;
    let tokenOperationsController: TokenOperationsController;
    let tokenController: TokenController;
    let blockFetchController: BlockFetchController;
    let blockUpdatesController: BlockUpdatesController;
    let transactionWatcherController: TransactionWatcherController;
    let tokenAllowanceController: TokenAllowanceController;
    let accountTrackerController: AccountTrackerController;

    this.beforeAll(() => {
        networkController = getNetworkControllerInstance();

        blockFetchController = new BlockFetchController(networkController, {
            blockFetchData: {},
        });

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            blockFetchController,
            { blockData: {} }
        );

        preferencesController = mockPreferencesController;
        permissionsController = mockedPermissionsController;

        const gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );

        tokenOperationsController = new TokenOperationsController({
            networkController: networkController,
        });
        tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
                cachedPopulatedTokens: {} as any,
            },
            {
                tokenOperationsController: tokenOperationsController,
                preferencesController: preferencesController,
                networkController: networkController,
            } as TokenControllerProps
        );

        transactionController = new TransactionController(
            networkController,
            preferencesController,
            permissionsController,
            gasPricesController,
            tokenController,
            blockUpdatesController,
            {
                transactions: [],
                txSignTimeout: 0,
            },
            async (ethTx: TypedTransaction) => {
                const privateKey = Buffer.from(accounts.goerli[0].key, 'hex');
                return Promise.resolve(ethTx.sign(privateKey));
            },
            { txHistoryLimit: 40 }
        );

        privacyController = new PrivacyAsyncController({
            networkController: networkController,
            state: {
                pendingWithdrawals: {} as PendingWithdrawalsStore,
                vaultState: { vault: '' },
            },
        });
        transactionWatcherController = new TransactionWatcherController(
            networkController,
            preferencesController,
            blockUpdatesController,
            tokenController,
            transactionController,
            {
                transactions: {},
            }
        );

        tokenAllowanceController = new TokenAllowanceController(
            networkController,
            preferencesController,
            tokenOperationsController,
            transactionController
        );

        accountTrackerController = new AccountTrackerController(
            mockKeyringController,
            networkController,
            tokenController,
            tokenOperationsController,
            preferencesController,
            blockUpdatesController,
            transactionWatcherController
        );

        bridgeController = new BridgeController(
            networkController,
            transactionController,
            tokenController,
            tokenAllowanceController,
            accountTrackerController,
            {
                bridgeReceivingTransactions: {},
                perndingBridgeReceivingTransactions: {},
            }
        );
        activityListController = new ActivityListController(
            transactionController,
            privacyController,
            preferencesController,
            networkController,
            transactionWatcherController,
            bridgeController
        );
    });
    beforeEach(() => {
        const addressBookControllerProps: AddressBookControllerProps = {
            initialState: {
                addressBook: {} as any,
                recentAddresses: {} as any,
            },
            networkController,
            activityListController,
            preferencesController,
        };
        addressBookController = new AddressBookController(
            addressBookControllerProps
        );
    });
    afterEach(function () {
        sinon.restore();
    });

    describe('clear', function () {
        it('Should clear the address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // get all
            let addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);

            //clear
            let clear_result = await addressBookController.clear();
            expect(clear_result).equal(true);

            // get all
            addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(0);

            //clear the clean
            clear_result = await addressBookController.clear();
            expect(clear_result).equal(false);
        });
    });

    describe('delete', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.delete('not a valid address');
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.delete(address);
            expect(result).equal(false);
        });
        it('Should delete a entry in the address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // delete the first
            let delete_result = await addressBookController.delete(
                '0x2231234435344D865C8966f4945844843EDAff91'
            );
            expect(delete_result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(true);

            // delete the first
            delete_result = await addressBookController.delete(
                '0x2231234435344D865C8966f4945844843EDAff91'
            );
            expect(delete_result).equal(false);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(false);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407'
            );
            expect(delete_result).equal(true);
        });
    });

    describe('set', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.set(
                    'not a valid address',
                    'test entry',
                    'note'
                );
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.set(
                address,
                'test entry',
                'note'
            );
            expect(result).equal(false);
        });
        it('Should add a new entry to the address book', async () => {
            // add the first
            const address_1 = '0x2231234435344D865C8966f4945844843EDAff91';
            const name_1 = 'test entry';
            const note_1 = 'note';
            let result = await addressBookController.set(
                address_1,
                name_1,
                note_1
            );
            expect(result).equal(true);

            // add the second
            const address_2 = '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407';
            const name_2 = 'test entry 2';
            const note_2 = 'note 2';
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get all
            const addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);

            // get the first
            const entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            const entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);
        });
    });

    describe('get', function () {
        it('Should get the whole address book', async () => {
            // add the first
            let result = await addressBookController.set(
                '0x2231234435344D865C8966f4945844843EDAff91',
                'name 1'
            );
            expect(result).equal(true);

            // get all
            let addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(1);

            // add the second
            result = await addressBookController.set(
                '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407',
                'name 2'
            );
            expect(result).equal(true);

            // get all
            addresses = await addressBookController.get();
            expect(addresses).to.be.not.null;
            expect(addresses).to.be.not.undefined;
            expect(Object.keys(addresses).length).equal(2);
        });
    });

    describe('getByAddress', function () {
        it('Should validate an invalid address', async () => {
            try {
                // invalid hexa
                await addressBookController.getByAddress('not a valid address');
            } catch (e: any) {
                expect(e.message).equal(
                    'This method only supports 0x-prefixed hex strings but input was: not a valid address'
                );
            }

            // invalid address
            const address = '0x22312345C8966f4945844843EDAff91';
            const result = await addressBookController.getByAddress(address);
            expect(result).to.be.undefined;
        });
        it('Should add a new entry to the address book', async () => {
            // add the first
            const address_1 = '0x2231234435344D865C8966f4945844843EDAff91';
            const name_1 = 'test entry';
            const note_1 = 'note';
            let result = await addressBookController.set(
                address_1,
                name_1,
                note_1
            );
            expect(result).equal(true);

            // add the second
            const address_2 = '0x2231234435312DaBBD9a1A21B6111cc8Bb3aA407';
            const name_2 = 'test entry 2';
            const note_2 = 'note 2';
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get the first
            let entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            let entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);

            // delete the first
            let delete_result = await addressBookController.delete(address_1);
            expect(delete_result).equal(true);

            // delete the second
            delete_result = await addressBookController.delete(address_2);
            expect(delete_result).equal(true);

            // get the first
            entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.undefined;

            // get the second
            entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.undefined;

            // add the first
            result = await addressBookController.set(address_1, name_1, note_1);
            expect(result).equal(true);

            // add the second
            result = await addressBookController.set(address_2, name_2, note_2);
            expect(result).equal(true);

            // get the first
            entry_1 = await addressBookController.getByAddress(address_1);
            expect(entry_1).to.be.not.null;
            expect(entry_1).to.be.not.undefined;
            expect(entry_1!.name).equal(name_1);
            expect(entry_1!.note).equal(note_1);

            // get the second
            entry_2 = await addressBookController.getByAddress(address_2);
            expect(entry_2).to.be.not.null;
            expect(entry_2).to.be.not.undefined;
            expect(entry_2!.name).equal(name_2);
            expect(entry_2!.note).equal(note_2);
        });
    });
});
