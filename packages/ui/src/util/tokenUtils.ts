const NATIVE_TOKEN_ADDRESS = "0x0"
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

export const isNativeTokenAddress = (address: string) => {
    if (!address) {
        return false
    }
    return [NULL_ADDRESS, NATIVE_TOKEN_ADDRESS].includes(address)
}
