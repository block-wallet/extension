import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import NetworkController from '../../../../controllers/NetworkController';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import {
    normalizeNetworksOrder,
    addNetworkUsingValuesDefinedByTheUser,
} from '../../../../utils/networks';

/**
 * This migration adds RSK Mainnet and RSK Testnet and also updates ZKsync endpoint
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        let updatedNetworks = { ...availableNetworks };
        const networkController = new NetworkController(
            persistedState.NetworkController
        );

        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            rpcUrls: INITIAL_NETWORKS.ZKSYNC_ALPHA_TESTNET.rpcUrls,
        };

        const rskNonNativeKey = networkController.getNonNativeNetworkKey(
            INITIAL_NETWORKS.RSK.chainId
        );
        updatedNetworks = addNetworkUsingValuesDefinedByTheUser(
            'RSK',
            rskNonNativeKey,
            INITIAL_NETWORKS.RSK,
            updatedNetworks
        );

        updatedNetworks.LOCALHOST = {
            ...updatedNetworks.LOCALHOST,
            order: updatedNetworks.LOCALHOST.order + 1,
        };

        const orderedNetworks = normalizeNetworksOrder(updatedNetworks);

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '0.8.4',
} as IMigration;
