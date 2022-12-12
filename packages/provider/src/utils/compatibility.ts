import { isCompatible } from './site';
import CACHED_INCOMPATIBLE_SITES from '@block-wallet/remote-configs/provider/incompatible_sites.json';

interface CompatibilityCache {
    isBlockWallet: boolean;
}

const BLOCKWALLET_COMPATIBLITY_KEY = '__BlockWallet_compatibility__';

function getCompatibility(): CompatibilityCache | null {
    const cache = window.localStorage.getItem(BLOCKWALLET_COMPATIBLITY_KEY);
    if (cache) {
        return JSON.parse(cache);
    }
    return null;
}

function setCompatibility(isBlockWallet: boolean) {
    return window.localStorage.setItem(
        BLOCKWALLET_COMPATIBLITY_KEY,
        JSON.stringify({ isBlockWallet })
    );
}

export function getBlockWalletCompatibility(): CompatibilityCache {
    const compatibility = getCompatibility();
    if (compatibility) {
        return compatibility;
    }
    return updateBlockWalletCompatibility(CACHED_INCOMPATIBLE_SITES);
}

export function updateBlockWalletCompatibility(
    incompatibleSites: string[] = CACHED_INCOMPATIBLE_SITES
): CompatibilityCache {
    const isBlockWallet = isCompatible(incompatibleSites);
    setCompatibility(isBlockWallet);
    return { isBlockWallet };
}
