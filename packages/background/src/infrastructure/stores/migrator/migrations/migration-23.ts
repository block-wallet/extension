import { ITokens } from '@block-wallet/background/controllers/erc-20/Token';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { isValidAddress, toChecksumAddress } from '@ethereumjs/util';
import { IMigration } from '../IMigration';
/**
 * This migration updates user token's addresses from the user's token list
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        // checksum all token addresses
        const { userTokens, deletedUserTokens } =
            persistedState.TokenController;

        const updatedUserTokens = { ...userTokens };

        for (const userAddress in updatedUserTokens) {
            const ut = updatedUserTokens[userAddress];
            for (const sChainId in ut) {
                const cut = ut[parseInt(sChainId)];
                const _normalizedUserTokens: ITokens = {};

                for (const tokenAddress in cut) {
                    const token = cut[tokenAddress];
                    if (isValidAddress(token.address)) {
                        token.address = toChecksumAddress(token.address);
                    }
                    _normalizedUserTokens[token.address] = token;
                }

                updatedUserTokens[userAddress][parseInt(sChainId)] =
                    _normalizedUserTokens;
            }
        }

        const updatedDeletedUserTokens = { ...deletedUserTokens };

        for (const userAddress in updatedDeletedUserTokens) {
            const dut = updatedDeletedUserTokens[userAddress];
            for (const sChainId in dut) {
                const cdut = dut[parseInt(sChainId)];
                const _normalizedDeletedUserTokens: ITokens = {};

                for (const tokenAddress in cdut) {
                    const token = cdut[tokenAddress];
                    if (isValidAddress(token.address)) {
                        token.address = toChecksumAddress(token.address);
                    }
                    _normalizedDeletedUserTokens[token.address] = token;
                }

                updatedDeletedUserTokens[userAddress][parseInt(sChainId)] =
                    _normalizedDeletedUserTokens;
            }
        }

        return {
            ...persistedState,
            TokenController: {
                ...persistedState.TokenController,
                userTokens: { ...updatedUserTokens },
                deletedUserTokens: { ...updatedDeletedUserTokens },
            },
        };
    },
    version: '0.1.30',
} as IMigration;
