const NATIVE_TOKEN_ADDRESS = "0x0"

export const isNativeTokenAddress = (address: string) => {
    return address === NATIVE_TOKEN_ADDRESS
}
