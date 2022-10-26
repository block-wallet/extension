import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration fixes the symbol and RPC url of BSC Testnet
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    hideBridgeInsufficientNativeTokenWarning:
                        persistedState.PreferencesController.settings
                            .hideBridgeInsufficientNativeTokenWarning ?? false,
                },
            },
        };
    },
    version: '0.7.3',
} as IMigration;
