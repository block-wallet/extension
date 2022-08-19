import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { NetworkAddressBook } from "@block-wallet/background/controllers/AddressBookController"
import { useAddressBook } from "./useAddressBook"


export const useAddressBookAccounts = () => {
    const addressBook: NetworkAddressBook = useAddressBook()
    const addresses = Object.values(addressBook)
    const accountArray = addresses
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => {
            return { name: a.name, address: a.address } as AccountInfo
        })
    return accountArray
}