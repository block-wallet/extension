export const isManifestV3 = () => {
    return chrome.runtime.getManifest().manifest_version === 3;
};
