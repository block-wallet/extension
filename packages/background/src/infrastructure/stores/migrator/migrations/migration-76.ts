import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration updates network enable status to show only specific networks:
 *
 * MAINNETS (keep enabled):
 * - Ethereum Mainnet
 * - Arbitrum Mainnet
 * - Optimism Mainnet
 * - BNB Chain Mainnet
 * - Polygon Mainnet
 * - Avalanche Network
 *
 * TESTNETS (keep enabled):
 * - Goerli Testnet
 * - BNB Chain Testnet
 * - Polygon Mumbai
 * - Helios Testnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        const enabledMainnets = new Set([
            'MAINNET',
            'ARBITRUM',
            'OPTIMISM',
            'BSC',
            'POLYGON',
            'AVALANCHEC',
        ]);

        const enabledTestnets = new Set([
            'GOERLI',
            'BSC_TESTNET',
            'POLYGON_TESTNET_MUMBAI',
            'HELIOS_TESTNET',
        ]);

        Object.keys(updatedNetworks).forEach((key) => {
            if (enabledMainnets.has(key) || enabledTestnets.has(key)) {
                updatedNetworks[key] = {
                    ...updatedNetworks[key],
                    enable: true,
                };
            } else {
                updatedNetworks[key] = {
                    ...updatedNetworks[key],
                    enable: false,
                };
            }
        });

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '1.1.26',
} as IMigration;
