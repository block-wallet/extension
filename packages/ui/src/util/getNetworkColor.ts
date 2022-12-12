import { Network } from "@block-wallet/background/utils/constants/networks"
import { ethers } from "ethers"
import { getAccountColor } from "./getAccountColor"

//We generate network color always with name, it is to unify criteria.
export const getNetworkColor = (network: Network) => {
    const networkName = network.name

    return getAccountColor(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(networkName))
    )
}
