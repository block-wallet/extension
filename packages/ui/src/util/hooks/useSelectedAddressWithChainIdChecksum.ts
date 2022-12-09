import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { toChecksumAddress } from "ethereumjs-util"

const CHAIN_IDS_REQUIRE_EIP1191 = [30, 31]

export const useSelectedAddressWithChainIdChecksum = (): string => {
    const { selectedAddress } = useBlankState()!
    return useAddressWithChainIdChecksum(selectedAddress)
}

export const useAddressWithChainIdChecksum = (address: string): string => {
    const { chainId } = useSelectedNetwork()
    const eip1191ChainId = CHAIN_IDS_REQUIRE_EIP1191.includes(chainId)
        ? chainId
        : undefined
    return toChecksumAddress(address, eip1191ChainId)
}
