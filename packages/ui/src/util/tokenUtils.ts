const native_token_address_reduced = "0x0"
const native_token_address = "0x0000000000000000000000000000000000000000"

/**
 * compareAddresses
 *
 * Compares two addresses
 *
 * @param a First address
 * @param b Second address
 * @returns Whether or not the provided addresses are equal
 */
export const compareAddresses = (
    a: string | undefined,
    b: string | undefined
): boolean => {
    if (!a || !b) {
        return false
    }

    return a.toLowerCase() === b.toLowerCase()
}

export const isNativeTokenAddress = (address: string) => {
    if (!address) {
        return false
    }
    return (
        compareAddresses(address, native_token_address_reduced) ||
        compareAddresses(address, native_token_address)
    )
}
