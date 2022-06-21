import { PreferencesController } from '../../src/controllers/PreferencesController';
import { mockPreferencesController } from '../mocks/mock-preferences';
import { expect } from 'chai';

describe('Preferences Controller', function () {
    let preferencesController: PreferencesController;

    beforeEach(function () {
        preferencesController = mockPreferencesController;
    });

    it('should get and set selected address', async function () {
        expect(preferencesController.getSelectedAddress()).to.equal(
            '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1'
        );

        preferencesController.setSelectedAddress(
            '0xbda8c7b7b5d0579eb18996d1f684a434e4ff701f' // not checksummed
        );

        expect(preferencesController.getSelectedAddress()).to.equal(
            '0xbda8C7b7B5d0579Eb18996D1f684A434E4fF701f' // checksummed
        );
    });

    it('should get and set locale info', async function () {
        expect(preferencesController.localeInfo).to.equal('en-US');

        preferencesController.localeInfo = 'de-DE';

        expect(preferencesController.localeInfo).to.equal('de-DE');
    });

    it('should get and set nativeCurrency', async function () {
        expect(preferencesController.nativeCurrency).to.equal('usd');

        preferencesController.nativeCurrency = 'eur';

        expect(preferencesController.nativeCurrency).to.equal('eur');
    });

    it('get and set show test networks', async function () {
        expect(preferencesController.showTestNetworks).to.be.true;

        preferencesController.showTestNetworks = false;

        expect(preferencesController.showTestNetworks).to.be.false;
    });

    it('get and set user settings', async function () {
        expect(preferencesController.settings).to.not.null;

        preferencesController.settings.hideAddressWarning = false;
        expect(preferencesController.settings.hideAddressWarning).to.be.false;
    });

    it('get and set show welcome message', async function () {
        expect(preferencesController.showWelcomeMessage).to.be.false;

        preferencesController.showWelcomeMessage = true;
        expect(preferencesController.showWelcomeMessage).to.be.true;
    });
});
