import { ReleaseNote } from '@block-wallet/background/controllers/PreferencesController';
import { expect } from 'chai';
import sinon from 'sinon';
import * as userPreferences from '../../src/utils/userPreferences';

describe('userPreferences tests', () => {
    describe('rebuild preferences after the user updates the wallet', () => {
        const sandbox = sinon.createSandbox();
        after(() => {
            sandbox.restore();
        });
        before(() => {
            sandbox.stub(userPreferences, 'getReleaseNotes').returns(
                new Promise((resolve) =>
                    resolve([
                        {
                            version: '1.0.0',
                            sections: [
                                {
                                    title: 'Updates',
                                    notes: [
                                        {
                                            message: 'a message',
                                            type: 'success',
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            version: '2.0.0',
                            sections: [
                                {
                                    title: 'Updates',
                                    notes: [
                                        {
                                            message: 'a message2',
                                            type: 'warn',
                                        },
                                    ],
                                },
                            ],
                        },
                    ] as ReleaseNote[])
                )
            );
        });
        it('Should return empty release notes if user is not subscribed to release notes', async () => {
            const newPreferences =
                await userPreferences.resolvePreferencesAfterWalletUpdate(
                    {
                        settings: {
                            subscribedToReleaseaNotes: false,
                            subscribedToNotifications: true,
                            hideAddressWarning: false,
                            hideSendToContractWarning: false,
                            hideSendToNullWarning: false,
                            useAntiPhishingProtection: true,
                            defaultBrowserWallet: true,
                            hideEstimatedGasExceedsThresholdWarning: false,
                            hideDepositsExternalAccountsWarning: false,
                            hideBridgeInsufficientNativeTokenWarning: false,
                        },
                    },
                    '2.0.0'
                );
            expect(
                newPreferences.releaseNotesSettings?.latestReleaseNotes
            ).to.deep.equal([]);
            expect(
                newPreferences.releaseNotesSettings?.lastVersionUserSawNews
            ).to.be.equal('2.0.0');
        });
        it('Should return empty release notes if user has nothing new to see', async () => {
            const newPreferences =
                await userPreferences.resolvePreferencesAfterWalletUpdate(
                    {
                        settings: {
                            subscribedToReleaseaNotes: true,
                            subscribedToNotifications: true,
                            hideAddressWarning: false,
                            hideSendToContractWarning: false,
                            hideSendToNullWarning: false,
                            useAntiPhishingProtection: true,
                            defaultBrowserWallet: true,
                            hideEstimatedGasExceedsThresholdWarning: false,
                            hideDepositsExternalAccountsWarning: false,
                            hideBridgeInsufficientNativeTokenWarning: false,
                        },
                        releaseNotesSettings: {
                            lastVersionUserSawNews: '2.0.0',
                            latestReleaseNotes: [],
                        },
                    },
                    '2.0.0'
                );
            expect(
                newPreferences.releaseNotesSettings?.latestReleaseNotes
            ).to.deep.equal([]);
            expect(
                newPreferences.releaseNotesSettings?.lastVersionUserSawNews
            ).to.be.equal('2.0.0');
        });
        it('Should return release notes', async () => {
            const newPreferences =
                await userPreferences.resolvePreferencesAfterWalletUpdate(
                    {
                        settings: {
                            subscribedToReleaseaNotes: true,
                            subscribedToNotifications: true,
                            hideAddressWarning: false,
                            hideSendToContractWarning: false,
                            hideSendToNullWarning: false,
                            useAntiPhishingProtection: true,
                            defaultBrowserWallet: true,
                            hideEstimatedGasExceedsThresholdWarning: false,
                            hideDepositsExternalAccountsWarning: false,
                            hideBridgeInsufficientNativeTokenWarning: false,
                        },
                        releaseNotesSettings: {
                            lastVersionUserSawNews: '1.0.0',
                            latestReleaseNotes: [],
                        },
                    },
                    '2.0.0'
                );
            expect(
                newPreferences.releaseNotesSettings?.latestReleaseNotes
            ).to.be.have.length(1);
            expect(
                newPreferences.releaseNotesSettings?.lastVersionUserSawNews
            ).to.be.equal('1.0.0');
        });
        it('Should return the specified release notes according to the ondemand version', async () => {
            const releaseNotes =
                await userPreferences.generateOnDemandReleaseNotes('2.0.0');
            expect(releaseNotes).to.be.have.length(1);
            expect(releaseNotes[0].version).to.be.equal('2.0.0');
        });
        it('Should return an empty array because the ondemand version does not exist', async () => {
            const releaseNotes =
                await userPreferences.generateOnDemandReleaseNotes('6.6.6');
            expect(releaseNotes).to.be.have.length(0);
            expect(releaseNotes).to.be.eql([]);
        });
    });
});
