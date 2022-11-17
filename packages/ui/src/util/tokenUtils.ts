const NATIVE_TOKEN_ADDRESS_REDUCED = "0x0"
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"

export const isNativeTokenAddress = (address: string) => {
    return address === NATIVE_TOKEN_ADDRESS || address === NATIVE_TOKEN_ADDRESS_REDUCED;
}
