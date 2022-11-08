import { compareAddresses } from "@block-wallet/background/controllers/transactions/utils/utils"

const native_token_address = "0x0"
const null_address = "0x0000000000000000000000000000000000000000"

export const isNativeTokenAddress = (address: string) => {
    if (!address) {
        return false
    }
    return (
        compareAddresses(address, null_address) ||
        compareAddresses(address, native_token_address)
    )
}
