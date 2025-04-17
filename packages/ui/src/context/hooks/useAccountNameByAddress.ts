import { useBlankState } from "../background/backgroundHooks"
import { useAddressBook } from "./useAddressBook"

/**
 * Gets the name of an account by its address
 * @param address The address to get the name of
 */
export const useAccountNameByAddress = (
    address: string
): string | undefined => {
    const { accounts } = useBlankState()!
    const addressBook = useAddressBook()

    // Normalize address for accounts lookup
    const normalizedAddress = address.toLowerCase()

    if (normalizedAddress in accounts) {
        return accounts[normalizedAddress].name
    }

    if (address in addressBook) {
        return addressBook[address].name
    }

    return undefined
}
