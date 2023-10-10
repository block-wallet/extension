import browser from 'webextension-polyfill';

export const isManifestV3 = () => {
    return browser.runtime.getManifest().manifest_version === 3;
};
