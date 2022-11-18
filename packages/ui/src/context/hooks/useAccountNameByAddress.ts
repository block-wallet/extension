import { useBlankState } from "../background/backgroundHooks"
import { useAddressBook } from "./useAddressBook"

export const useAccountNameByAddress = (
    address: string
): string | undefined => {
    const { accounts } = useBlankState()!
    const addressBook = useAddressBook()

    if (address in accounts) {
        return accounts[address].name
    }

    if (address in addressBook) {
        return addressBook[address].name
    }

    return undefined
}
