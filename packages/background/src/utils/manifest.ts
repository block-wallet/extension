export const isManifestV3 = () => {
    try {
        return chrome.runtime.getManifest().manifest_version === 3;
    } catch {
        return true;
    }
};
