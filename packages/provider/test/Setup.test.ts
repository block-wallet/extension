import {
    checkScriptLoad,
    isCompatible,
} from '@block-wallet/provider/utils/site';
import { expect } from 'chai';

const INCOMPATIBLE_SITES_MOCK = ['opensea.io'];

describe('Provider Setup', function () {
    // Cleanup function to reset the dom
    let cleanup: () => void = () => {};

    afterEach(function () {
        cleanup();
    });

    it('Should detect compatible site', async function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://uniswap.org/',
        });

        expect(await isCompatible(INCOMPATIBLE_SITES_MOCK)).to.be.true;

        cleanup = require('jsdom-global')(``, {
            url: 'https://blockwallet-opensea.io/',
        });

        expect(await isCompatible(INCOMPATIBLE_SITES_MOCK)).to.be.true;

        cleanup = require('jsdom-global')(``, {
            url: 'https://opensea.io.blockwallet.io',
        });

        expect(await isCompatible(INCOMPATIBLE_SITES_MOCK)).to.be.true;
    });

    it('Should detect incompatible site', async function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://opensea.io/',
        });

        expect(await isCompatible(INCOMPATIBLE_SITES_MOCK)).to.be.false;
    });

    it('Should allow the script to be injected', function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://uniswap.org/',
        });

        expect(checkScriptLoad()).to.be.true;
    });

    it('Should detect unallowed file extension', function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://opensea.io/metrics.pdf',
        });

        expect(checkScriptLoad()).to.be.false;
    });
});
