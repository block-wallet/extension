import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { toChecksumAddress } from '@ethereumjs/util';
/**
 * This migration removes a spam token from the user's token
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        // remove spam token
        const { userTokens } = persistedState.TokenController;
        const updatedUserTokens = { ...userTokens };

        // remove spam token "XETA" from every address on BSC
        for (const userAddress in updatedUserTokens) {
            if (56 in updatedUserTokens[userAddress]) {
                if (
                    toChecksumAddress(
                        '0x179960442Ece8dE9f390011b7f7c9b56C74e4D0a'
                    ) in updatedUserTokens[userAddress][56]
                ) {
                    delete updatedUserTokens[userAddress][56][
                        toChecksumAddress(
                            '0x179960442Ece8dE9f390011b7f7c9b56C74e4D0a'
                        )
                    ];
                }
            }
        }

        return {
            ...persistedState,
            TokenController: {
                ...persistedState.TokenController,
                userTokens: { ...updatedUserTokens },
            },
        };
    },
    version: '0.1.31',
} as IMigration;
