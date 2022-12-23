import { Network } from "@block-wallet/background/utils/constants/networks"
import { keccak256 } from "@ethersproject/keccak256"
import { toUtf8Bytes } from "@ethersproject/strings"
import { getAccountColor } from "./getAccountColor"

//We generate network color always with name, it is to unify criteria.
export const getNetworkColor = (network: Network) => {
    const networkName = network.name

    return getAccountColor(keccak256(toUtf8Bytes(networkName)))
}
