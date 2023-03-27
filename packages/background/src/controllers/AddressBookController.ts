import { isValidAddress, toChecksumAddress } from '@ethereumjs/util';
import { BaseController } from '../infrastructure/BaseController';
import { compareAddresses, normalizeEnsName } from './transactions/utils/utils';
import NetworkController from './NetworkController';
import { ActivityListController } from './ActivityListController';
import {
    TransactionCategories,
    TransactionMeta,
} from './transactions/utils/types';
import { PreferencesController } from './PreferencesController';
import { isEqual } from 'lodash';
import { isNativeTokenAddress } from '../utils/token';

/**
 * @type AddressBookControllerProps
 *
 * Props for the AddressBookController class
 *
 * @property address - Hex address of a recipient account
 * @property name - Nickname associated with this address
 * @property note - User's note about address
 * @property isEns - is the entry an ENS name
 */
export interface AddressBookControllerProps {
    initialState: AddressBookControllerMemState;
    networkController: NetworkController;
    activityListController: ActivityListController;
    preferencesController: PreferencesController;
}

/**
 * @type AddressBookState
 *
 * Address book controller state
 *
 * @property addressBook - AddressBook
 */
export interface AddressBookControllerMemState {
    addressBook: AddressBook;
    recentAddresses: AddressBook;
}

/**
 * @type AddressBook
 *
 * Contains the address book by network.
 * Array of contact entry objects
 */
export type AddressBook = {
    [networkName: string]: NetworkAddressBook;
};

/**
 * @type NetworkAddressBook
 *
 * Book entries by its addresses.
 */
export interface NetworkAddressBook {
    [address: string]: AddressBookEntry;
}

/**
 * @type AddressBookEntry
 *
 * AddressBookEntry representation
 *
 * @property address - Hex address of a recipient account
 * @property name - Nickname associated with this address
 * @property note - User's note about address
 * @property isEns - is the entry an ENS name
 */
export interface AddressBookEntry {
    address: string;
    name: string;
    note: string;
    isEns: boolean;
}

/**
 * @class AddressBookController
 *
 * Contains the methods to manage the Address Book by network.
 * The Address Book is stored mem state.
 */
export class AddressBookController extends BaseController<AddressBookControllerMemState> {
    private readonly _networkController: NetworkController;
    private readonly _activityListController: ActivityListController;
    private readonly _preferencesController: PreferencesController;

    constructor(props: AddressBookControllerProps) {
        super(props.initialState);

        this._networkController = props.networkController;
        this._activityListController = props.activityListController;
        this._preferencesController = props.preferencesController;

        this._activityListController.store.subscribe(this.onStoreUpdate);
    }

    /**
     * Triggers on UI store update
     */
    private onStoreUpdate = () => {
        this.getRecentAddresses();
    };

    /**
     * Remove all entries in the book
     *
     */
    public async clear(): Promise<boolean> {
        const network = this._getCurrentNetworkKeyName();

        if (!this.store.getState().addressBook[network]) {
            return false;
        }

        const addressBook = Object.assign(
            {},
            this.store.getState().addressBook
        );
        delete addressBook[network];

        this.store.setState({ ...this.store.getState(), addressBook });
        return true;
    }

    /**
     * Remove a contract entry by address
     *
     * @param address - Recipient address to delete
     */
    public async delete(address: string): Promise<boolean> {
        const network = this._getCurrentNetworkKeyName();

        address = toChecksumAddress(address);

        if (
            !isValidAddress(address) ||
            !this.store.getState().addressBook[network] ||
            !this.store.getState().addressBook[network][address]
        ) {
            return false;
        }

        const addressBook = Object.assign(
            {},
            this.store.getState().addressBook
        );
        delete addressBook[network][address];

        if (Object.keys(addressBook[network]).length === 0) {
            delete addressBook[network];
        }

        this.store.setState({ ...this.store.getState(), addressBook });
        return true;
    }

    /**
     * Add or update a contact entry by address
     *
     * @param address - Recipient address to add or update
     * @param name - Nickname to associate with this address
     * @param note - User's note about address
     * @returns - Boolean indicating if the address was successfully set
     */
    public async set(
        address: string,
        name: string,
        note = ''
    ): Promise<boolean> {
        const network = this._getCurrentNetworkKeyName();

        address = toChecksumAddress(address);
        if (!isValidAddress(address)) {
            return false;
        }

        const entry: AddressBookEntry = {
            address,
            isEns: false,
            note,
            name,
        };

        const ensName = normalizeEnsName(name);
        if (ensName) {
            entry.name = ensName;
            entry.isEns = true;
        }

        this.store.setState({
            ...this.store.getState(),
            addressBook: {
                ...this.store.getState().addressBook,
                [network]: {
                    ...this.store.getState().addressBook[network],
                    [address]: entry,
                },
            },
        });

        return true;
    }

    /**
     * Get the contacts
     *
     * @returns - A map with the entries
     */
    public async get(): Promise<NetworkAddressBook> {
        const network = this._getCurrentNetworkKeyName();

        if (!this.store.getState().addressBook[network]) {
            return {};
        }
        return this.store.getState().addressBook[network];
    }

    /**
     * Get the contacts
     *
     * @param address - Recipient address to search
     *
     * @returns - A address book entry
     */
    public async getByAddress(
        address: string
    ): Promise<AddressBookEntry | undefined> {
        const network = this._getCurrentNetworkKeyName();

        address = toChecksumAddress(address);
        if (!isValidAddress(address)) {
            return undefined;
        }

        if (!this.store.getState().addressBook[network]) {
            return undefined;
        }
        return this.store.getState().addressBook[network][address];
    }

    /**
     * Get the recent addresses with which the wallet has interacted
     *
     * @param limit - Optional. The maximun number of recent address to return.
     *
     * @returns - A map with the entries
     */
    public async getRecentAddresses(limit = 10): Promise<NetworkAddressBook> {
        const network = this._getCurrentNetworkKeyName();

        const {
            activityList: { confirmed, pending },
        } = this._activityListController.store.getState();

        const transactions = [...confirmed, ...pending].sort(
            (a, b) => b.time - a.time
        );

        const selectedAddress =
            this._preferencesController.getSelectedAddress();

        const isTheSelectedAddress = (address?: string) =>
            compareAddresses(address, selectedAddress);

        const recentAddresses: NetworkAddressBook = {};

        for (let i = 0; i < transactions.length; i++) {
            const transaction: TransactionMeta = transactions[i];
            let address: string | undefined;

            switch (transaction.transactionCategory) {
                // Deposits, swaps, contract interations and tokens approvals are avoided because the destination is the contract.
                // Also incoming transactions are avoided.
                case TransactionCategories.BLANK_DEPOSIT:
                case TransactionCategories.CONTRACT_DEPLOYMENT:
                case TransactionCategories.CONTRACT_INTERACTION:
                case TransactionCategories.TOKEN_METHOD_APPROVE:
                case TransactionCategories.EXCHANGE:
                case TransactionCategories.INCOMING:
                    continue;
                case TransactionCategories.BLANK_WITHDRAWAL:
                case TransactionCategories.SENT_ETHER:
                    // If the destination is my address the process should avoid it
                    if (
                        isTheSelectedAddress(transaction.transactionParams.to)
                    ) {
                        continue;
                    }

                    address = transaction.transactionParams.to;
                    break;
                case TransactionCategories.TOKEN_METHOD_TRANSFER:
                case TransactionCategories.TOKEN_METHOD_TRANSFER_FROM:
                    // If the destination is my address the process should avoid it
                    if (isTheSelectedAddress(transaction.transferType?.to)) {
                        continue;
                    }

                    address = transaction.transferType?.to;
                    break;
                default:
                    continue;
            }

            if (!address || isNativeTokenAddress(address)) {
                continue;
            }

            address = toChecksumAddress(address);

            let entry: AddressBookEntry = {
                address,
                isEns: false,
                name: `Account (...${address.slice(address.length - 4)})`,
                note: '',
            };

            // If it is already on the recent addresses this should continue
            if (entry.address in recentAddresses) {
                continue;
            }

            // If it exists in the address book populate its data.
            const contact = await this.getByAddress(entry.address);
            if (contact) {
                entry = { ...contact };
            }

            // Add it to the recent addresses list
            recentAddresses[entry.address] = entry;

            // If 'limit' is defined and the recent addresses list is higher than it the search should stop.
            if (limit) {
                if (Object.keys(recentAddresses).length > limit) {
                    break;
                }
            }
        }

        if (
            !isEqual(
                recentAddresses,
                this.store.getState().recentAddresses[network] || {}
            )
        ) {
            this.store.setState({
                ...this.store.getState(),
                recentAddresses: {
                    ...this.store.getState().recentAddresses,
                    [network]: {
                        ...recentAddresses,
                    },
                },
            });
        }

        return recentAddresses;
    }

    /**
     * Get the current network name
     *
     * @returns - The current network name.
     */
    private _getCurrentNetworkKeyName(): string {
        return this._networkController.selectedNetwork.toUpperCase();
    }
}
