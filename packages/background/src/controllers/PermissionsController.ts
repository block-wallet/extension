import { toChecksumAddress } from 'ethereumjs-util';
import { BaseController } from '../infrastructure/BaseController';
import {
    PreferencesController,
    PreferencesControllerState,
} from './PreferencesController';
import { SiteMetadata } from '@block-wallet/provider/types';
import { v4 as uuid } from 'uuid';
import { Handlers } from '../utils/types/communication';
import { ProviderError } from '../utils/types/ethereum';
import { providerInstances } from '../infrastructure/connection';

export interface GetPermissionResponse {
    invoker: string;
    parentCapability?: string;
    caveats?: Record<string, unknown>[];
}

export interface SitePermission {
    accounts: string[];
    activeAccount: string;
    data: SiteMetadata;
    origin: string;
}

export interface PermissionRequest {
    origin: string;
    siteMetadata: SiteMetadata;
    time: number;
    originId: string;
}

export interface PermissionsControllerState {
    permissions: {
        [origin: string]: SitePermission;
    };
    permissionRequests: {
        [id: string]: PermissionRequest;
    };
}

/**
 * Accounts permissions controller
 *
 */
export default class PermissionsController extends BaseController<PermissionsControllerState> {
    private _handlers: Handlers;

    constructor(
        initState: PermissionsControllerState,
        private readonly _preferencesController: PreferencesController
    ) {
        super({ permissions: initState.permissions, permissionRequests: {} });

        this._handlers = {};

        this._preferencesController.store.subscribe(this._updateActiveAccounts);
    }

    /**
     * Handles connection request
     *
     * @param portId Request origin port id
     */
    public connectionRequest = async (portId: string): Promise<string[]> => {
        const { origin, siteMetadata } = providerInstances[portId];

        const currentPermissions = this.getAccounts(origin);

        if (currentPermissions.length) {
            return currentPermissions;
        }

        const sitePermissions = await this._submitPermissionRequest(portId);

        if (!sitePermissions) {
            throw new Error(ProviderError.USER_REJECTED_REQUEST);
        }

        const newPermissions = this.addNewSite(
            origin,
            siteMetadata,
            sitePermissions
        );

        return [newPermissions.activeAccount];
    };

    /**
     * Returns active account
     *
     * @param origin Site origin
     */
    public getAccounts = (origin: string): string[] => {
        const permissions = this.store.getState().permissions[origin];

        // Return if the site has no permissions
        if (!permissions) {
            return [];
        }

        return [permissions.activeAccount];
    };

    /**
     * Creates a new site with permissions
     *
     */
    public addNewSite = (
        origin: string,
        siteMetadata: SiteMetadata,
        accounts: string[]
    ): SitePermission => {
        const permissions = this.store.getState().permissions;

        if (permissions[origin]) {
            throw new Error(`${origin} is already logged`);
        }

        const validPermissions = this._validateActiveAccount({
            accounts,
            activeAccount: accounts[0],
            data: siteMetadata,
            origin,
        });

        permissions[origin] = validPermissions;

        this.store.updateState({
            permissions,
        });

        return validPermissions;
    };

    /**
     * Updates permissions for a specific site
     * If accounts is an empty array or null, deletes the site.
     *
     */
    public updateSite = (origin: string, accounts: string[] | null): void => {
        const permissions = this.store.getState().permissions;

        if (!permissions[origin].accounts) {
            throw new Error(`No permissions have been found for ${origin}`);
        }

        if (accounts === null || accounts.length < 1) {
            delete permissions[origin];
        } else {
            permissions[origin].accounts = accounts;

            const validPermissions = this._validateActiveAccount(
                permissions[origin]
            );

            permissions[origin] = validPermissions;
        }

        this.store.updateState({
            permissions,
        });
    };

    /**
     * Remove account from a single site
     * If the site has no accounts left, then deletes the site
     *
     */
    public removeAccount = (origin: string, account: string): void => {
        const permissions = this.store.getState().permissions;
        const accounts = permissions[origin].accounts;

        if (!accounts) {
            throw new Error(`No permissions have been found for ${origin}`);
        }

        const accountIndex = accounts.indexOf(account);

        if (accountIndex < 0) {
            throw new Error(
                `The account ${account} has no permissions for this site`
            );
        } else {
            accounts.splice(accountIndex, 1);

            if (accounts.length < 1) {
                delete permissions[origin];
            } else {
                permissions[origin].accounts = accounts;

                const validPermissions = this._validateActiveAccount(
                    permissions[origin]
                );

                permissions[origin] = validPermissions;
            }

            this.store.updateState({
                permissions,
            });
        }
    };

    /**
     * Removes one specific account from all sites' permissions
     *
     */
    public removeAllPermissionsOfAccount = (account: string): void => {
        const permissions = this.store.getState().permissions;
        const sites = Object.keys(permissions);

        if (!permissions) {
            return;
        }

        sites.forEach((site) => {
            const sitePermission = permissions[site];
            const accounts = sitePermission.accounts;
            if (accounts.includes(account)) {
                this.removeAccount(site, account);
            }
        });
    };

    /**
     * Returns the sites the account is allowed to connect to
     *
     */
    public getAccountPermissions = (account: string): string[] | null => {
        const permissions = this.store.getState().permissions;
        const sitesWithPermissions: string[] = [];

        const sites = Object.keys(permissions);

        sites.forEach((site) => {
            const accountIndex = permissions[site].accounts.indexOf(account);
            if (accountIndex > -1) {
                sitesWithPermissions.push(site);
            }
        });

        if (sitesWithPermissions.length > 0) {
            return sitesWithPermissions;
        } else {
            return null;
        }
    };

    /**
     * Returns if the given account has permission for the given site
     *
     */
    public accountHasPermissions = (
        origin: string,
        account: string
    ): boolean => {
        // Checksum address
        account = toChecksumAddress(account);

        // Get site info
        const siteInfo = this.store.getState().permissions[origin];

        if (!siteInfo) {
            return false;
        }

        const accountIndex = siteInfo.accounts.indexOf(account);
        if (accountIndex > -1) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * Returns site's permissions or null if undefined
     *
     * @param origin site
     */
    public getSitePermissions = (origin: string): SitePermission | null => {
        const sitePermissions = this.store.getState().permissions[origin];

        // Return null if the site has no permissions
        if (!sitePermissions) {
            return null;
        }

        return sitePermissions;
    };

    /**
     * Permission request handle
     *
     */
    public handlePermissionRequest = (
        id: string,
        accounts: string[] | null
    ): void => {
        const handler = this._handlers[id];

        if (!handler) {
            throw new Error(`Unable to confirm permissions - id: ${id}`);
        }

        delete this._handlers[id];

        // Get current requests
        const requests = this.store.getState().permissionRequests;

        // Delete submitted request
        delete requests[id];

        this.store.updateState({
            permissionRequests: requests,
        });

        handler.resolve(accounts);
    };

    /**
     * Rejects all pending permission requests
     */
    public rejectAllRequests = (): void => {
        const handlers = this._handlers;

        for (const handlerId in handlers) {
            handlers[handlerId].reject(
                new Error(ProviderError.USER_REJECTED_REQUEST)
            );
        }

        this._handlers = {};

        this.store.updateState({
            permissionRequests: {},
        });
    };

    /**
     * Submits a new permission request.
     * Throws if there is an existent one from the same origin
     *
     */
    private _submitPermissionRequest = async (
        portId: string
    ): Promise<string[] | null> => {
        return new Promise((resolve, reject): void => {
            const { origin, siteMetadata } = providerInstances[portId];

            // Get current requests
            const requests = this.store.getState().permissionRequests;

            // Check if there currently is a pending permission request from that origin
            for (const request in requests) {
                if (requests[request].origin === origin) {
                    //update timestampt to focus the extension window.
                    this._updatePermissionRequestTimestamp(request);
                    //return error to keep interface consitent with the dApp
                    throw new Error(ProviderError.RESOURCE_UNAVAILABLE);
                }
            }

            // Generate ID
            const id = uuid();

            // Add request to state
            requests[id] = {
                origin,
                siteMetadata,
                time: Date.now(),
                originId: portId,
            };

            this.store.updateState({
                permissionRequests: requests,
            });

            // Add response handler
            this._handlers[id] = { reject, resolve };
        });
    };

    private _updatePermissionRequestTimestamp = async (id: string) => {
        const requests = { ...this.store.getState().permissionRequests };
        const currentRequest = requests[id];

        if (!currentRequest) {
            throw new Error('The request no longer exist.');
        }

        // Update timestamp
        requests[id] = {
            ...currentRequest,
            time: Date.now(),
        };

        this.store.updateState({
            permissionRequests: requests,
        });
    };

    /**
     * Method to handle selected address updates from the account tracker.
     *
     */
    private _updateActiveAccounts = ({
        selectedAddress,
    }: PreferencesControllerState) => {
        const permissions = this.store.getState().permissions;

        // Check if the selected address has permissions on each site
        for (const site in permissions) {
            // If it does, then update active account
            if (this.accountHasPermissions(site, selectedAddress)) {
                permissions[site].activeAccount = selectedAddress;

                this.store.updateState({
                    permissions,
                });
            }
        }
    };

    /**
     * Validates current active account - To use before updating state
     *
     */
    private _validateActiveAccount = (
        sitePermission: SitePermission
    ): SitePermission => {
        const accounts = sitePermission.accounts;
        const selectedAddress =
            this._preferencesController.store.getState().selectedAddress;

        // Check if the selected address has permission
        const selectedAddressIndex = accounts.indexOf(selectedAddress);

        // If so, set it to active just in case and return
        if (selectedAddressIndex > -1) {
            sitePermission.activeAccount = selectedAddress;
            return sitePermission;
        }

        // Check if the current active account has permission
        const activeAccountIndex = accounts.indexOf(
            sitePermission.activeAccount
        );

        // If it does not, set to active the first account in the array
        if (activeAccountIndex < 0) {
            sitePermission.activeAccount = accounts[0];
        }

        return sitePermission;
    };
}
