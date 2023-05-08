import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { normalizeNetworksOrder } from '../../../../utils/networks';

/**
 * Fixes Polygon Mumbai network block explorer Name
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        updatedNetworks.POLYGON_TESTNET_MUMBAI = {
            ...updatedNetworks.POLYGON_TESTNET_MUMBAI,
            blockExplorerName:
                INITIAL_NETWORKS.POLYGON_TESTNET_MUMBAI.blockExplorerName,
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
    version: '1.1.8',
} as IMigration;
