import { FunctionComponent } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import AccountDisplay from "../../components/account/AccountDisplay"
import { AccountInfo } from "../../../../background/src/controllers/AccountTrackerController"
import { addressBookDelete, postSlackMessage } from "../../context/commActions"
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
        } catch (error) {
            // TODO: show error
            //  setError(error.message)
        }
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Address Book"
                    onBack={() => history.push("/settings")}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-5 text-sm text-primary-grey-dark">
                <ActionButton
                    icon={accountAdd}
                    label="Create New Contact"
                    to="/settings/addressBook/add"
                    state={{ editMode: false, contact: null }}
                />
                {Object.keys(addressBook).length !== 0 && (
                    <AccountsList title="CURRENT CONTACTS">
                        {Object.values(addressBook).map((entry) => (
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
                )}
                {Object.keys(recentAddresses).length !== 0 && (
                    <AccountsList title="RECENT ADDRESSES">
                        {Object.values(recentAddresses).map((entry) => (
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
                                                className="flex flex-row justify-start items-center p-1 cursor-pointer text-primary-black-default hover:bg-gray-100 hover:rounded-t-md w-36"
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
                                                <div className="pr-2">
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
                )}
                {!Object.keys(addressBook).length &&
                    !Object.keys(recentAddresses).length && (
                        <span className="text-sm text-primary-grey-dark">
                            No contacts.
                        </span>
                    )}
            </div>
        </PopupLayout>
    )
}

export default AddressBookPage
