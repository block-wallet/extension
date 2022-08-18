import { KeyringControllerState } from 'eth-keyring-controller';
import { BaseController } from '../infrastructure/BaseController';
import KeyringControllerDerivated from './KeyringControllerDerivated';

export interface OnboardingControllerState {
    isOnboarded: boolean;
    isSeedPhraseBackedUp: boolean;
}

/**
 * Controller responsible for maintaining
 * state related to onboarding
 */
export default class OnboardingController extends BaseController<OnboardingControllerState> {
    constructor(
        initState: OnboardingControllerState,
        private readonly keyringController: KeyringControllerDerivated
    ) {
        super(initState);

        this.keyringController.store.subscribe(this.setOnboarding);
    }

    /**
     * Checks if the user has backed up the seed phrase
     */
    public get isSeedPhraseBackedUp(): boolean {
        return this.store.getState().isSeedPhraseBackedUp;
    }

    /**
     * Set if the user has backed up the seed phrase
     * @param v is seed phrase backed up
     */
    public set isSeedPhraseBackedUp(v: boolean) {
        this.store.updateState({ isSeedPhraseBackedUp: v });
    }

    /**
     * Set onboarding on vault update
     * @param state keyring controller state
     */
    private setOnboarding = () => {
        const { vault } =
            this.keyringController.store.getState() as KeyringControllerState;

        const isOnboarded = Boolean(vault);

        this.store.updateState({ isOnboarded: isOnboarded });
    };
}
