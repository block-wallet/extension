import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { BigNumber } from '@ethersproject/bignumber';
import { IMigration } from '../IMigration';

/**
 * This migration updates the network list including:
 *   - remove deprecated networks
 *   - update l2 networks properties
 *   - renaming/refactor 'isCustomNetwork'
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        // remove deprecated networks
        delete updatedNetworks['ROPSTEN'];
        delete updatedNetworks['KOVAN'];
        delete updatedNetworks['RINKEBY'];

        // update l2 networks properties
        updatedNetworks.OPTIMISM = {
            ...updatedNetworks.OPTIMISM,
            enable: true,
            gasLowerCap: {
                gasPrice: BigNumber.from('1000000'),
            },
        };
        updatedNetworks.XDAI = {
            ...updatedNetworks.XDAI,
            enable: true,
        };
        updatedNetworks.ZKSYNC_ALPHA_TESTNET = {
            ...updatedNetworks.ZKSYNC_ALPHA_TESTNET,
            showGasLevels: false,
        };

        updatedNetworks.SCROLL_L2_TESTNET = {
            ...updatedNetworks.SCROLL_L2_TESTNET,
            showGasLevels: false,
        };

        // renaming/refactor 'isCustomNetwork'
        for (const networkName in updatedNetworks) {
            const isCustomNetwork =
                ((updatedNetworks[networkName] as any)[
                    'isCustomNetwork'
                ] as boolean) ?? true;

            updatedNetworks[networkName] = {
                ...updatedNetworks[networkName],
                hasFixedGasCost: !isCustomNetwork,
            };
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
        };
    },
    version: '0.8.3',
} as IMigration;
