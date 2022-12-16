import type NetworkController from '../NetworkController';

import type { Network } from '../../utils/constants/networks';
import { NetworkEvents } from '../NetworkController';
import { BaseController } from '../../infrastructure/BaseController';
import {
    AvailableNetworks,
    PrivacyControllerStoreState,
    PrivacyControllerUIStoreState,
} from './types';

export class PrivacyAsyncController extends BaseController<
    PrivacyControllerStoreState,
    PrivacyControllerUIStoreState
> {
    constructor(props: {
        networkController: NetworkController;
        state: PrivacyControllerStoreState;
    }) {
        super(props.state, {
            previousWithdrawals: [],
            pendingDeposits: {},
            depositsCount: {},
            pendingWithdrawals:
                props.networkController.network.name in
                props.state.pendingWithdrawals
                    ? props.state.pendingWithdrawals[
                          props.networkController.network
                              .name as AvailableNetworks
                      ].pending
                    : [],
            isVaultInitialized: false,
            isImportingDeposits: false,
            importingErrors: [],
            areDepositsPending: false,
            areWithdrawalsPending: false,
        });

        props.networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            ({ name }: Network) => {
                if (name in props.state.pendingWithdrawals) {
                    this.UIStore.updateState({
                        pendingWithdrawals:
                            props.state.pendingWithdrawals[
                                name as AvailableNetworks
                            ].pending,
                    });
                }
            }
        );
    }
}
