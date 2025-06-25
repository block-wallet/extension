import { FunctionComponent } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import AccountDisplay from "../../components/account/AccountDisplay"
import { AccountInfo } from "../../../../background/src/controllers/AccountTrackerController"
import { addressBookDelete } from "../../context/commActions"
import {
    useAddressBook,
    useAddressBookRecentAddresses,
} from "../../context/hooks/useAddressBook"
import { ActionButton } from "../../components/button/ActionButton"
import accountAdd from "../../assets/images/icons/account_add.svg"
import { useHistory } from "react-router-dom"
import { AccountMenuOptionType } from "../../components/account/AccountDisplayMenu"
import AccountsList from "../../components/account/AccountsList"
import Icon, { IconName } from "../../components/ui/Icon"
import { BsPersonPlus, BsBook, BsClock, BsInfoCircle, BsSearch } from "react-icons/bs"

const AddressBookPage: FunctionComponent<{
    addresses: AccountInfo[]
}> = () => {
    const history = useHistory()
    const addressBook = useAddressBook()
    const recentAddresses = useAddressBookRecentAddresses({
        filterContacts: true,
    })

    const removeContact = async (address: string) => {
        try {
            await addressBookDelete(address)
        } catch {
            // TODO: show error
            //  setError(error.message)
        }
    }

    const hasContacts = Object.keys(addressBook).length > 0
    const hasRecentAddresses = Object.keys(recentAddresses).length > 0
    const isEmpty = !hasContacts && !hasRecentAddresses

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Address Book"
                    onBack={() => history.push("/settings")}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                {/* Header Information */}
                <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <BsBook className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Manage Your Contacts
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                Save frequently used addresses with custom names for easy access.
                                Your address book makes sending transactions faster and more secure.
                            </p>
                        </div>
                    </div>

                    {/* Create New Contact Button */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <ActionButton
                            icon={<BsPersonPlus className="w-5 h-5 text-green-600 dark:text-green-400" />}
                            label="Create New Contact"
                            to="/settings/addressBook/add"
                            state={{ editMode: false, contact: null }}
                            className="w-full bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {/* Current Contacts Section */}
                    {hasContacts && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <BsBook className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Saved Contacts
                                </h3>
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
                                    {Object.keys(addressBook).length}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <AccountsList title="">
                                    {Object.values(addressBook).map((entry: any) => (
                                        <AccountDisplay
                                            key={entry.address}
                                            account={
                                                {
                                                    address: entry.address,
                                                    name: entry.name,
                                                } as AccountInfo
                                            }
                                            selected={false}
                                            showAddress
                                            copyAddressToClipboard
                                            menu={[
                                                {
                                                    optionType: AccountMenuOptionType.EDIT,
                                                    handler: () =>
                                                        history.push({
                                                            pathname:
                                                                "/settings/addressBook/add",
                                                            state: {
                                                                editMode: true,
                                                                contact: {
                                                                    address: entry.address,
                                                                    name: entry.name,
                                                                } as AccountInfo,
                                                            },
                                                        }),
                                                },
                                                {
                                                    optionType:
                                                        AccountMenuOptionType.REMOVE_CONTACT,
                                                    handler: removeContact,
                                                },
                                            ]}
                                        />
                                    ))}
                                </AccountsList>
                            </div>
                        </div>
                    )}

                    {/* Recent Addresses Section */}
                    {hasRecentAddresses && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <BsClock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Recent Addresses
                                </h3>
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
                                    {Object.keys(recentAddresses).length}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Addresses you've recently interacted with. Click the + icon to save them as contacts.
                                </p>

                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <AccountsList title="">
                                        {Object.values(recentAddresses).map((entry: any) => (
                                            <AccountDisplay
                                                key={entry.address}
                                                account={
                                                    {
                                                        address: entry.address,
                                                        name: entry.name,
                                                    } as AccountInfo
                                                }
                                                selected={false}
                                                truncateName={false}
                                                showAddress
                                                copyAddressToClipboard
                                                menu={[
                                                    {
                                                        optionType:
                                                            AccountMenuOptionType.CUSTOM,
                                                        component: () => (
                                                            <div
                                                                className="flex flex-row justify-start items-center p-1 cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-t-md w-36"
                                                                onClick={() =>
                                                                    history.push({
                                                                        pathname:
                                                                            "/settings/addressBook/add",
                                                                        state: {
                                                                            contact: {
                                                                                address:
                                                                                    entry.address,
                                                                            },
                                                                        },
                                                                    })
                                                                }
                                                            >
                                                                <div className="pr-2 text-gray-600 dark:text-gray-400">
                                                                    <Icon
                                                                        name={IconName.PLUS}
                                                                    />
                                                                </div>
                                                                <span>Add Contact</span>
                                                            </div>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </AccountsList>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {isEmpty && (
                        <div className="text-center py-8">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <BsBook className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            No Contacts Yet
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                            Your address book is empty. Add contacts to save frequently used
                                            addresses with custom names for easier transactions.
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={() => history.push({
                                                pathname: "/settings/addressBook/add",
                                                state: { editMode: false, contact: null }
                                            })}
                                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <BsPersonPlus className="w-4 h-4" />
                                            <span>Add Your First Contact</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tips Section */}
                    {(hasContacts || hasRecentAddresses) && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                    <BsInfoCircle className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                                    Address Book Tips
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                    <p>• <span className="font-medium">Quick Access:</span> Saved contacts appear in send transaction address selection</p>
                                    <p>• <span className="font-medium">Safety:</span> Double-check addresses before saving to prevent mistakes</p>
                                    <p>• <span className="font-medium">Organization:</span> Use descriptive names to easily identify contacts</p>
                                    <p>• <span className="font-medium">Recent History:</span> Recent addresses are automatically tracked for convenience</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default AddressBookPage
