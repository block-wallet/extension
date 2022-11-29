export const isManifestV3 = () => {
    if (!chrome || !chrome.runtime || !chrome.runtime.getManifest()) {
        return chrome.runtime.getManifest().manifest_version === 3;
    }
};
