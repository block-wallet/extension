import type {
    BlankDepositController,
    BlankDepositControllerStoreState,
    BlankDepositControllerUIStoreState,
} from './BlankDepositController';
import type NetworkController from '../NetworkController';
import type { PreferencesController } from '../PreferencesController';
import type TransactionController from '../transactions/TransactionController';
import type { TokenOperationsController } from '../erc-20/transactions/Transaction';
import type { TokenController } from '../erc-20/TokenController';
import type { GasPricesController } from '../GasPricesController';
import type KeyringControllerDerivated from '../KeyringControllerDerivated';
import type BlockUpdatesController from '../block-updates/BlockUpdatesController';
import type { AvailableNetworks } from './types';
import type { Network } from '../../utils/constants/networks';
import { NetworkEvents } from '../NetworkController';
import { BaseController } from '../../infrastructure/BaseController';

export class PrivacyAsyncController extends BaseController<
    BlankDepositControllerStoreState,
    BlankDepositControllerUIStoreState
> {
    private readonly initialState: BlankDepositControllerStoreState;
    private readonly controllers: {
        networkController: NetworkController;
        preferencesController: PreferencesController;
        transactionController: TransactionController;
        tokenOperationsController: TokenOperationsController;
        tokenController: TokenController;
        gasPricesController: GasPricesController;
        keyringController: KeyringControllerDerivated;
        blockUpdatesController: BlockUpdatesController;
    };
    private _blankDepositController?: BlankDepositController;

    constructor(props: {
        networkController: NetworkController;
        preferencesController: PreferencesController;
        transactionController: TransactionController;
        tokenOperationsController: TokenOperationsController;
        tokenController: TokenController;
        gasPricesController: GasPricesController;
        keyringController: KeyringControllerDerivated;
        blockUpdatesController: BlockUpdatesController;
        state: BlankDepositControllerStoreState;
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
        this.controllers = {
            networkController: props.networkController,
            preferencesController: props.preferencesController,
            transactionController: props.transactionController,
            tokenOperationsController: props.tokenOperationsController,
            tokenController: props.tokenController,
            gasPricesController: props.gasPricesController,
            keyringController: props.keyringController,
            blockUpdatesController: props.blockUpdatesController,
        };
        this.initialState = props.state;

        props.networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            ({ name }: Network) => {
                if (!this._blankDepositController) {
                    if (name in props.state.pendingWithdrawals) {
                        this.UIStore.updateState({
                            pendingWithdrawals:
                                props.state.pendingWithdrawals[
                                    name as AvailableNetworks
                                ].pending,
                        });
                    }
                }
            }
        );
    }

    public async getBlankDepositController() {
        if (!this._blankDepositController) {
            const { BlankDepositController: PrivacyController } = await import(
                './BlankDepositController'
            );

            const { TornadoEventsService: PrivacyEventsService } = await import(
                './tornado/TornadoEventsService'
            );
            const tornadoConfig = (await import('./tornado/config/config'))
                .default;

            const tornadoEventsService = new PrivacyEventsService({
                ...tornadoConfig.tornadoEventsService,
                blockUpdatesController: this.controllers.blockUpdatesController,
            });

            this._blankDepositController = new PrivacyController({
                networkController: this.controllers.networkController,
                preferencesController: this.controllers.preferencesController,
                transactionController: this.controllers.transactionController,
                tokenOperationsController:
                    this.controllers.tokenOperationsController,
                tokenController: this.controllers.tokenController,
                gasPricesController: this.controllers.gasPricesController,
                tornadoEventsService,
                initialState: this.initialState,
            });

            this._blankDepositController.store.subscribe((s) => {
                this.store.setState(s);
            });

            this._blankDepositController.UIStore.subscribe((s) => {
                this.UIStore.setState(s);
            });

            await this.unlock();
            await this._blankDepositController.initialize();
        }

        return this._blankDepositController;
    }

    public async lock() {
        if (!this._blankDepositController) {
            return;
        }
        return this._blankDepositController.lock();
    }

    private async unlock() {
        // Unlock blank deposits vault
        if (!this._blankDepositController) {
            return;
        }

        //FIXME: Adapt vault unlocking below after new MV3 keyring changes

        const password = (this.controllers.keyringController as any).password;

        // Get seed phrase to unlock the blank deposit controller
        const seedPhrase =
            await this.controllers.keyringController.verifySeedPhrase(password);

        try {
            await this._blankDepositController.initializeVault(password);
        } catch {
            // empty
        }

        return this._blankDepositController.unlock(password, seedPhrase);
    }
}
