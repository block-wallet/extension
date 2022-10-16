import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { Networks } from '@block-wallet/background/utils/constants/networks';
import { IMigration } from '../IMigration';

/**
 * This migration reorder networks and separates order of testnets and mainnets each starting from zero
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const currentNetworks =
            persistedState.NetworkController.availableNetworks;

        // Sort the current networks based on their order property
        const orderedNetworks = Object.entries(currentNetworks)
            .sort(
                ([, networkValue1], [, networkValue2]) =>
                    networkValue1.order - networkValue2.order
            )
            .reduce(
                (r, [networkKey, networkValue]) => ({
                    ...r,
                    [networkKey]: networkValue,
                }),
                {}
            ) as Networks;

        // Adjust order property number to remove gaps
        let mainnetsCount = 0;
        let testnetsCount = 0;
        Object.keys(orderedNetworks).forEach((networkKey) => {
            if (orderedNetworks[networkKey].test) {
                orderedNetworks[networkKey].order = testnetsCount;
                testnetsCount++;
            } else {
                orderedNetworks[networkKey].order = mainnetsCount;
                mainnetsCount++;
            }
        });

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...orderedNetworks },
            },
        };
    },
    version: '0.7.2',
} as IMigration;
