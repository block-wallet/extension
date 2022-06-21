import { useSelectedNetwork } from "./useSelectedNetwork"
import { useBlankState } from "../background/backgroundHooks"
import { NetworkAddressBook } from "@block-wallet/background/controllers/AddressBookController"

export const useAddressBook = () => {
    const { name } = useSelectedNetwork()
    const { addressBook } = useBlankState()!

    if (!addressBook) {
        return {} as NetworkAddressBook
    }

    return addressBook[name.toUpperCase()] || ({} as NetworkAddressBook)
}

const defaultParams = {
    filterContacts: false,
}

export const useAddressBookRecentAddresses = ({
    filterContacts,
}: { filterContacts: boolean } = defaultParams) => {
    const { name } = useSelectedNetwork()
    const addressBook = useAddressBook()
    const { recentAddresses } = useBlankState()!

    if (!recentAddresses) {
        return {} as NetworkAddressBook
    }

    const recentNetworkAddresses =
        recentAddresses[name.toUpperCase()] || ({} as NetworkAddressBook)

    if (!filterContacts) {
        return recentNetworkAddresses
    }

    return Object.keys(recentNetworkAddresses)
        .filter((key) => {
            return !addressBook[key]
        })
        .reduce(
            (acc, key) => ({
                ...acc,
                [key]: recentNetworkAddresses[key],
            }),
            {}
        )
}
