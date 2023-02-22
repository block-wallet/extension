import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import CACHED_INCOMPATIBLE_SITES from '@block-wallet/remote-configs/provider/incompatible_sites.json';

const initialConifg = {
    provider: {
        incompatibleSites: CACHED_INCOMPATIBLE_SITES,
    },
};

/**
 * Remotes config initialization
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const remoteConfig =
            persistedState.RemoteConfigsController || initialConifg;
        return {
            ...persistedState,
            RemoteConfigsController: {
                ...remoteConfig,
                provider: {
                    ...remoteConfig.provider,
                    incompatibleSites: CACHED_INCOMPATIBLE_SITES,
                },
            },
        };
    },
    version: '0.8.5',
} as IMigration;
