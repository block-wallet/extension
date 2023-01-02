import { AvailableNetworks } from '../../../../controllers/privacy/types';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { INITIAL_NETWORKS } from '../../../../utils/constants/networks';
import { IMigration } from '../IMigration';
/**
 * Adds Gnosis to the networks list and update old networks order
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const newNetworks = {
            //Update old networks order
            ...Object.keys(
                persistedState.NetworkController.availableNetworks
            ).reduce((acc, networkKey) => {
                const updatedNetwork = {
                    ...persistedState.NetworkController.availableNetworks[
                        networkKey
                    ],
                };
                const defaultConfig = INITIAL_NETWORKS[networkKey];
                if (INITIAL_NETWORKS[networkKey]) {
                    updatedNetwork.order = defaultConfig.order;
                }
                return {
                    ...acc,
                    [networkKey]: updatedNetwork,
                };
            }, persistedState.NetworkController.availableNetworks),
            //Add xDAI network
            [AvailableNetworks.xDAI.toUpperCase()]:
                INITIAL_NETWORKS[AvailableNetworks.xDAI.toUpperCase()],
        };
        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: newNetworks,
            },
        };
    },
    version: '0.5.1',
} as IMigration;
