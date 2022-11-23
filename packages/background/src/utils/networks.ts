import NetworkController from '@block-wallet/background/controllers/NetworkController';
import { Network, Networks } from './constants/networks';

/**
 * normalizeNetworksOrder
 *
 * Sorts the networks by order and then normalize the order properties
 *
 * @param networks - The networks to sort
 *
 * @returns The networks sorted by order and normalized
 */
export const normalizeNetworksOrder = (networks: Networks): Networks => {
    // Sort the current networks based on their current order property
    const orderedNetworks = Object.entries(networks)
        .sort(
            ([, networkValue1], [, networkValue2]) =>
                networkValue1.order - networkValue2.order
        )
        .reduce(
            (previousNetworksValue, [networkKey, networkValue]) => ({
                ...previousNetworksValue,
                [networkKey]: networkValue,
            }),
            {}
        ) as Networks;

    // Adjust order property number to remove gaps
    let mainnetsCount = 1;
    let testnetsCount = 1;
    Object.keys(orderedNetworks).forEach((networkKey) => {
        if (orderedNetworks[networkKey].test) {
            orderedNetworks[networkKey].order = testnetsCount;
            testnetsCount++;
        } else {
            orderedNetworks[networkKey].order = mainnetsCount;
            mainnetsCount++;
        }
    });

    return orderedNetworks;
};

/**
 * addNetworkWithPreviousUserValues
 *
 * Adds a new network and in case it already existed some previous values defined by the user will be added
 *
 * @param networkName - The new network name to be added
 * @param newNetwork - The new network
 * @param networks - All the network the user has
 * @param networkController - The network controller
 *
 * @returns The networks updated
 */
export const addNetworkWithPreviousUserValues = (
    networkName: string,
    newNetwork: Network,
    networks: Networks,
    networkController: NetworkController
): Networks => {
    const key = networkController.getNonNativeNetworkKey(newNetwork.chainId);
    const oldNetwork = networks[key];
    networks[networkName] = {
        ...newNetwork,
        desc: oldNetwork?.desc || newNetwork.desc,
        order: oldNetwork?.order || newNetwork.order,
        blockExplorerUrls:
            oldNetwork?.blockExplorerUrls || newNetwork.blockExplorerUrls,
    };
    delete networks[key];
    return networks;
};
