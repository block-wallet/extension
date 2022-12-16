import { expect } from 'chai';
import OnboardingController from '../../src/controllers/OnboardingController';
import { mockKeyringController } from '../mocks/mock-keyring-controller';

describe('Onboarding Controller', function () {
    let onboardingController: OnboardingController;

    beforeEach(function () {
        onboardingController = new OnboardingController(
            {
                isOnboarded: false,
                isSeedPhraseBackedUp: false,
            },
            mockKeyringController
        );
    });

    it('should set and get if seed phrase is backed up', async function () {
        expect(onboardingController.isSeedPhraseBackedUp).to.be.false;

        onboardingController.isSeedPhraseBackedUp = true;
        expect(onboardingController.isSeedPhraseBackedUp).to.be.true;

        onboardingController.isSeedPhraseBackedUp = false;
        expect(onboardingController.isSeedPhraseBackedUp).to.be.false;
    });

    it('should detect when the user is onboarded', async function () {
        let { isOnboarded } = onboardingController.store.getState();
        expect(isOnboarded).to.be.false;

        await mockKeyringController.createNewVaultAndKeychain('password');
        isOnboarded = onboardingController.store.getState().isOnboarded;
        expect(isOnboarded).to.be.true;
    });
});
