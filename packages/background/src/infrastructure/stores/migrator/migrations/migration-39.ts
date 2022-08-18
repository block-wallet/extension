import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { Networks } from '@block-wallet/background/utils/constants/networks';
import { IMigration } from '../IMigration';

const explorerNames: { [x: number]: string } = {
    1: 'Etherscan',
    3: 'Etherscan',
    4: 'Etherscan',
    5: 'Etherscan',
    10: 'Etherscan',
    42: 'Etherscan',
    56: 'Bscscan',
    97: 'Bscscan',
    137: 'Polygonscan',
    250: 'FTMScan',
    42161: 'Arbiscan',
    43114: 'Snowtrace',
    80001: 'Polygonscan',
};

/**
 * Initializes the nativelySupport flag and the explorerNames
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: Object.keys(
                    persistedState.NetworkController.availableNetworks
                ).reduce((acc: Networks, key: string) => {
                    return {
                        ...acc,
                        [key]: {
                            ...persistedState.NetworkController
                                .availableNetworks[key],
                            nativelySupported: true,
                            blockExplorerName:
                                persistedState.NetworkController
                                    .availableNetworks[key].chainId in
                                explorerNames
                                    ? explorerNames[
                                          persistedState.NetworkController
                                              .availableNetworks[key].chainId
                                      ]
                                    : 'Explorer',
                        },
                    };
                }, persistedState.NetworkController.availableNetworks),
            },
        };
    },
    version: '0.5.0',
} as IMigration;
