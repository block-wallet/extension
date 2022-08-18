import {
    checkScriptLoad,
    isCompatible,
} from '@block-wallet/provider/utils/site';
import { expect } from 'chai';

describe('Provider Setup', function () {
    // Cleanup function to reset the dom
    let cleanup: () => void = () => {};

    afterEach(function () {
        cleanup();
    });

    it('Should detect compatible site', function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://uniswap.org/',
        });

        expect(isCompatible()).to.be.true;

        cleanup = require('jsdom-global')(``, {
            url: 'https://blockwallet-opensea.io/',
        });

        expect(isCompatible()).to.be.true;

        cleanup = require('jsdom-global')(``, {
            url: 'https://opensea.io.blockwallet.io',
        });

        expect(isCompatible()).to.be.true;
    });

    it('Should detect incompatible site', function () {
        cleanup = require('jsdom-global')(``, {
            url: 'https://opensea.io/',
        });

        expect(isCompatible()).to.be.false;
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
