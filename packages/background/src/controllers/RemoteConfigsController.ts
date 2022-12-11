import { BaseController } from '../infrastructure/BaseController';
import { fetchIncompatibleSites } from '../utils/remoteConfigs';
import log from 'loglevel';
import { HOUR } from '../utils/constants/time';

const REFRESH_REMOTE_CONIFGURATION_INTERVAL = 12 * HOUR;

interface ProviderConfigs {
    incompatibleSites: string[];
}

export interface RemoteConfigsControllerState {
    provider: ProviderConfigs;
}

export class RemoteConfigsController extends BaseController<RemoteConfigsControllerState> {
    private _refreshTimer: ReturnType<typeof setInterval> | null;

    constructor(initialState: RemoteConfigsControllerState) {
        super(initialState);
        this._refreshTimer = null;
        this._init();
    }

    private _init() {
        //clean previous intervals
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
        }

        //refetch config
        this._refreshConfig();

        //refresh configuration every 5 minutes
        this._refreshTimer = setInterval(() => {
            this._refreshConfig();
        }, REFRESH_REMOTE_CONIFGURATION_INTERVAL);
    }

    /**
     * _refreshConfig()
     *  Refetches the remote configuration from github.
     *  So far, we only have the incompatible sites configuration to refresh.
     */
    private async _refreshConfig() {
        let incompatibleSites: string[] | undefined;
        try {
            incompatibleSites = await fetchIncompatibleSites();
        } catch (e) {
            log.warn('Unable to update remote configuration', e);
        }

        if (incompatibleSites) {
            this.store.updateState({
                provider: {
                    incompatibleSites,
                },
            });
        }
    }

    public get config() {
        return this.store.getState();
    }

    public get providerConfig() {
        return this.store.getState().provider;
    }
}

export default RemoteConfigsController;
