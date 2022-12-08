import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { toChecksumAddress } from "ethereumjs-util"

const CHAIN_IDS_REQUIRE_EIP1191 = [30, 31]

export const useSelectedAddressWithChainIdChecksum = (): string => {
    const { selectedAddress } = useBlankState()!
    const { chainId } = useSelectedNetwork()
    const eip1191ChainId = CHAIN_IDS_REQUIRE_EIP1191.includes(chainId)
        ? chainId
        : undefined
    return toChecksumAddress(selectedAddress, eip1191ChainId)
}
