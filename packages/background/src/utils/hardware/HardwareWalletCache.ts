import { Devices } from '../types/hardware';
import log from 'loglevel';

/**
 * Types for different cache categories
 */
export interface DeviceInfo {
    deviceId: string;
    firmware: string;
    model: string;
    appVersion?: string;
    capabilities: string[];
    lastSeen: number;
    connectionCount: number;
}

export interface ConnectionState {
    device: Devices;
    connected: boolean;
    appOpen: boolean;
    transportType: 'webhid' | 'webusb' | undefined;
    lastConnection: number;
    lastAppCheck: number;
    hdPath: string;
    sessionId: string;
}

export interface AddressCache {
    device: Devices;
    hdPath: string;
    derivedAddresses: Map<number, string>; // index -> address
    lastDerivation: number;
    derivationCount: number;
}

export interface AppStatusCache {
    device: Devices;
    appOpen: boolean;
    appVersion?: string;
    lastCheck: number;
    checkCount: number;
    consecutiveFailures: number;
}

/**
 * Cache configuration with optimized TTL values
 */
export interface CacheConfig {
    deviceInfoTTL: number;        // 24 hours - device info rarely changes
    connectionStateTTL: number;   // 5 minutes - connection state moderate TTL
    addressCacheTTL: number;      // 12 hours - addresses are deterministic
    appStatusTTL: number;         // 30 seconds - app status changes frequently
    maxAddressesPerDevice: number; // Memory limit
    maxCacheSize: number;         // Overall memory limit in bytes
}

/**
 * Hardware Wallet Cache Manager
 * Provides intelligent caching for hardware wallet operations to reduce connection overhead
 */
export class HardwareWalletCache {
    private static instance: HardwareWalletCache | null = null;

    // Cache stores
    private deviceInfoCache = new Map<string, DeviceInfo>();
    private connectionStateCache = new Map<Devices, ConnectionState>();
    private addressCaches = new Map<string, AddressCache>(); // key: `${device}_${hdPath}`
    private appStatusCache = new Map<Devices, AppStatusCache>();

    // Cache statistics
    private cacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSize: 0
    };

    // Cleanup timer
    private cleanupTimer: NodeJS.Timeout | null = null;

    private readonly config: CacheConfig = {
        deviceInfoTTL: 24 * 60 * 60 * 1000,    // 24 hours
        connectionStateTTL: 5 * 60 * 1000,      // 5 minutes
        addressCacheTTL: 12 * 60 * 60 * 1000,   // 12 hours
        appStatusTTL: 30 * 1000,                 // 30 seconds
        maxAddressesPerDevice: 100,              // Limit memory usage
        maxCacheSize: 10 * 1024 * 1024,         // 10MB limit
    };

    private constructor() {
        this.startPeriodicCleanup();
        log.debug('HardwareWalletCache initialized');
    }

    /**
     * Singleton instance getter
     */
    public static getInstance(): HardwareWalletCache {
        if (!HardwareWalletCache.instance) {
            HardwareWalletCache.instance = new HardwareWalletCache();
        }
        return HardwareWalletCache.instance;
    }

    /**
     * DEVICE INFO CACHING
     */

    /**
     * Cache device information
     */
    public cacheDeviceInfo(deviceId: string, info: Omit<DeviceInfo, 'lastSeen' | 'connectionCount'>): void {
        const existing = this.deviceInfoCache.get(deviceId);
        const deviceInfo: DeviceInfo = {
            ...info,
            lastSeen: Date.now(),
            connectionCount: (existing?.connectionCount || 0) + 1
        };

        this.deviceInfoCache.set(deviceId, deviceInfo);
        this.updateCacheSize();
        log.debug(`Cached device info for ${deviceId}`);
    }

    /**
     * Get cached device information
     */
    public getCachedDeviceInfo(deviceId: string): DeviceInfo | null {
        const info = this.deviceInfoCache.get(deviceId);
        if (!info) {
            this.cacheStats.misses++;
            return null;
        }

        if (this.isExpired(info.lastSeen, this.config.deviceInfoTTL)) {
            this.deviceInfoCache.delete(deviceId);
            this.cacheStats.evictions++;
            return null;
        }

        this.cacheStats.hits++;
        return info;
    }

    /**
     * CONNECTION STATE CACHING
     */

    /**
     * Cache connection state
     */
    public cacheConnectionState(state: ConnectionState): void {
        state.lastConnection = Date.now();
        state.sessionId = this.generateSessionId();

        this.connectionStateCache.set(state.device, state);
        this.updateCacheSize();
        log.debug(`Cached connection state for ${state.device}`);
    }

    /**
     * Get cached connection state
     */
    public getCachedConnectionState(device: Devices): ConnectionState | null {
        const state = this.connectionStateCache.get(device);
        if (!state) {
            this.cacheStats.misses++;
            return null;
        }

        if (this.isExpired(state.lastConnection, this.config.connectionStateTTL)) {
            this.connectionStateCache.delete(device);
            this.cacheStats.evictions++;
            return null;
        }

        this.cacheStats.hits++;
        return state;
    }

    /**
     * Invalidate connection state (call when connection changes)
     */
    public invalidateConnectionState(device: Devices): void {
        this.connectionStateCache.delete(device);
        log.debug(`Invalidated connection state for ${device}`);
    }

    /**
     * ADDRESS CACHING
     */

    /**
     * Cache derived address
     */
    public cacheAddress(device: Devices, hdPath: string, index: number, address: string): void {
        const cacheKey = `${device}_${hdPath}`;
        let cache = this.addressCaches.get(cacheKey);

        if (!cache) {
            cache = {
                device,
                hdPath,
                derivedAddresses: new Map(),
                lastDerivation: Date.now(),
                derivationCount: 0
            };
            this.addressCaches.set(cacheKey, cache);
        }

        // Enforce memory limits
        if (cache.derivedAddresses.size >= this.config.maxAddressesPerDevice) {
            // Remove oldest entries (simple LRU approximation)
            const sortedEntries = Array.from(cache.derivedAddresses.entries());
            const toRemove = sortedEntries.slice(0, 10); // Remove 10 oldest
            toRemove.forEach(([idx]) => cache!.derivedAddresses.delete(idx));
            this.cacheStats.evictions += toRemove.length;
        }

        cache.derivedAddresses.set(index, address);
        cache.lastDerivation = Date.now();
        cache.derivationCount++;

        this.updateCacheSize();
        log.debug(`Cached address for ${device} at ${hdPath}/${index}`);
    }

    /**
     * Get cached address
     */
    public getCachedAddress(device: Devices, hdPath: string, index: number): string | null {
        const cacheKey = `${device}_${hdPath}`;
        const cache = this.addressCaches.get(cacheKey);

        if (!cache) {
            this.cacheStats.misses++;
            return null;
        }

        if (this.isExpired(cache.lastDerivation, this.config.addressCacheTTL)) {
            this.addressCaches.delete(cacheKey);
            this.cacheStats.evictions++;
            return null;
        }

        const address = cache.derivedAddresses.get(index);
        if (!address) {
            this.cacheStats.misses++;
            return null;
        }

        this.cacheStats.hits++;
        return address;
    }

    /**
     * Get all cached addresses for a device/path combination
     */
    public getCachedAddresses(device: Devices, hdPath: string): Map<number, string> | null {
        const cacheKey = `${device}_${hdPath}`;
        const cache = this.addressCaches.get(cacheKey);

        if (!cache || this.isExpired(cache.lastDerivation, this.config.addressCacheTTL)) {
            return null;
        }

        return new Map(cache.derivedAddresses);
    }

    /**
     * APP STATUS CACHING
     */

    /**
     * Cache app status
     */
    public cacheAppStatus(device: Devices, appOpen: boolean, appVersion?: string): void {
        const existing = this.appStatusCache.get(device);
        const status: AppStatusCache = {
            device,
            appOpen,
            appVersion,
            lastCheck: Date.now(),
            checkCount: (existing?.checkCount || 0) + 1,
            consecutiveFailures: appOpen ? 0 : (existing?.consecutiveFailures || 0) + 1
        };

        this.appStatusCache.set(device, status);
        this.updateCacheSize();
        log.debug(`Cached app status for ${device}: ${appOpen ? 'open' : 'closed'}`);
    }

    /**
     * Get cached app status
     */
    public getCachedAppStatus(device: Devices): AppStatusCache | null {
        const status = this.appStatusCache.get(device);
        if (!status) {
            this.cacheStats.misses++;
            return null;
        }

        // Use adaptive TTL based on consecutive failures
        const adaptiveTTL = this.getAdaptiveAppStatusTTL(status.consecutiveFailures);

        if (this.isExpired(status.lastCheck, adaptiveTTL)) {
            this.appStatusCache.delete(device);
            this.cacheStats.evictions++;
            return null;
        }

        this.cacheStats.hits++;
        return status;
    }

    /**
     * CACHE MANAGEMENT UTILITIES
     */

    /**
     * Get adaptive TTL for app status based on failure count
     */
    private getAdaptiveAppStatusTTL(consecutiveFailures: number): number {
        // Reduce TTL as failures increase to check more frequently
        const baseTTL = this.config.appStatusTTL;
        const reductionFactor = Math.min(consecutiveFailures * 0.2, 0.8); // Max 80% reduction
        return Math.max(baseTTL * (1 - reductionFactor), 5000); // Min 5 seconds
    }

    /**
     * Check if cache entry has expired
     */
    private isExpired(timestamp: number, ttl: number): boolean {
        return Date.now() - timestamp > ttl;
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `hw_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Update total cache size estimate
     */
    private updateCacheSize(): void {
        // Rough estimate of cache size
        const deviceInfoSize = this.deviceInfoCache.size * 1024; // ~1KB per device
        const connectionStateSize = this.connectionStateCache.size * 512; // ~512B per state
        const addressCacheSize = Array.from(this.addressCaches.values())
            .reduce((total, cache) => total + cache.derivedAddresses.size * 64, 0); // ~64B per address
        const appStatusSize = this.appStatusCache.size * 256; // ~256B per status

        this.cacheStats.totalSize = deviceInfoSize + connectionStateSize + addressCacheSize + appStatusSize;

        // Enforce overall cache size limit
        if (this.cacheStats.totalSize > this.config.maxCacheSize) {
            this.evictOldestEntries();
        }
    }

    /**
     * Evict oldest entries when cache size limit is reached
     */
    private evictOldestEntries(): void {
        log.debug('Cache size limit reached, evicting oldest entries');

        // Evict oldest device info entries
        const sortedDeviceInfo = Array.from(this.deviceInfoCache.entries())
            .sort(([, a], [, b]) => a.lastSeen - b.lastSeen);

        for (let i = 0; i < Math.min(5, sortedDeviceInfo.length); i++) {
            this.deviceInfoCache.delete(sortedDeviceInfo[i][0]);
            this.cacheStats.evictions++;
        }

        // Evict oldest address caches
        const sortedAddressCaches = Array.from(this.addressCaches.entries())
            .sort(([, a], [, b]) => a.lastDerivation - b.lastDerivation);

        for (let i = 0; i < Math.min(3, sortedAddressCaches.length); i++) {
            this.addressCaches.delete(sortedAddressCaches[i][0]);
            this.cacheStats.evictions++;
        }

        this.updateCacheSize();
    }

    /**
     * Start periodic cleanup of expired entries
     */
    private startPeriodicCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, 5 * 60 * 1000); // Cleanup every 5 minutes
    }

    /**
     * Perform cleanup of expired cache entries
     */
    private performCleanup(): void {
        const now = Date.now();
        let cleanedCount = 0;

        // Clean device info cache
        for (const [deviceId, info] of this.deviceInfoCache.entries()) {
            if (this.isExpired(info.lastSeen, this.config.deviceInfoTTL)) {
                this.deviceInfoCache.delete(deviceId);
                cleanedCount++;
            }
        }

        // Clean connection state cache
        for (const [device, state] of this.connectionStateCache.entries()) {
            if (this.isExpired(state.lastConnection, this.config.connectionStateTTL)) {
                this.connectionStateCache.delete(device);
                cleanedCount++;
            }
        }

        // Clean address caches
        for (const [key, cache] of this.addressCaches.entries()) {
            if (this.isExpired(cache.lastDerivation, this.config.addressCacheTTL)) {
                this.addressCaches.delete(key);
                cleanedCount++;
            }
        }

        // Clean app status cache
        for (const [device, status] of this.appStatusCache.entries()) {
            const adaptiveTTL = this.getAdaptiveAppStatusTTL(status.consecutiveFailures);
            if (this.isExpired(status.lastCheck, adaptiveTTL)) {
                this.appStatusCache.delete(device);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.cacheStats.evictions += cleanedCount;
            this.updateCacheSize();
            log.debug(`Cleaned up ${cleanedCount} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     */
    public getStats(): {
        hits: number;
        misses: number;
        evictions: number;
        totalSize: number;
        deviceInfoEntries: number;
        connectionStateEntries: number;
        addressCacheEntries: number;
        appStatusEntries: number;
        hitRate: number;
    } {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        return {
            ...this.cacheStats,
            deviceInfoEntries: this.deviceInfoCache.size,
            connectionStateEntries: this.connectionStateCache.size,
            addressCacheEntries: this.addressCaches.size,
            appStatusEntries: this.appStatusCache.size,
            hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0
        };
    }

    /**
     * Clear all caches
     */
    public clearAll(): void {
        this.deviceInfoCache.clear();
        this.connectionStateCache.clear();
        this.addressCaches.clear();
        this.appStatusCache.clear();

        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalSize: 0
        };

        log.debug('Cleared all hardware wallet caches');
    }

    /**
     * Clear cache for specific device
     */
    public clearDeviceCache(device: Devices): void {
        // Clear connection state
        this.connectionStateCache.delete(device);

        // Clear app status
        this.appStatusCache.delete(device);

        // Clear address caches for this device
        for (const [key, cache] of this.addressCaches.entries()) {
            if (cache.device === device) {
                this.addressCaches.delete(key);
            }
        }

        log.debug(`Cleared cache for device ${device}`);
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.clearAll();
        log.debug('HardwareWalletCache cleanup completed');
    }
}

// Export singleton instance
export const hardwareWalletCache = HardwareWalletCache.getInstance();
