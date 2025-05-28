import log from 'loglevel';
import { hardwareWalletCache } from './hardware/HardwareWalletCache';

export interface ResourceConfig {
    maxMemoryThreshold: number; // MB
    cleanupInterval: number; // milliseconds
    keepAliveInterval: number; // minutes
    hardwareWalletTimeout: number; // milliseconds
}

export interface PerformanceMetrics {
    memoryUsage: number;
    uptime: number;
    hardwareWalletOperations: number;
    storageOperations: number;
    lastCleanup: number;
    hardwareWalletCacheStats?: {
        hits: number;
        misses: number;
        hitRate: number;
        totalEntries: number;
    };
}

/**
 * ServiceWorkerResourceManager optimizes resource usage and lifecycle management
 * for the BlockWallet extension service worker (Manifest V3).
 */
export class ServiceWorkerResourceManager {
    private static instance: ServiceWorkerResourceManager;

    private config: ResourceConfig = {
        maxMemoryThreshold: 50, // 50MB max memory
        cleanupInterval: 300000, // 5 minutes
        keepAliveInterval: 10, // 10 minutes (more conservative)
        hardwareWalletTimeout: 30000, // 30 seconds
    };

    private metrics: PerformanceMetrics = {
        memoryUsage: 0,
        uptime: Date.now(),
        hardwareWalletOperations: 0,
        storageOperations: 0,
        lastCleanup: Date.now(),
    };

    private timers: Set<NodeJS.Timeout> = new Set();
    private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();
    private hardwareWalletQueue: Map<string, Promise<any>> = new Map();
    private storageCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

    private constructor() {
        this.initializeResourceManager();
    }

    public static getInstance(): ServiceWorkerResourceManager {
        if (!ServiceWorkerResourceManager.instance) {
            ServiceWorkerResourceManager.instance = new ServiceWorkerResourceManager();
        }
        return ServiceWorkerResourceManager.instance;
    }

    /**
     * Initialize resource management with optimized settings
     */
    private initializeResourceManager(): void {
        // Set up periodic cleanup
        this.scheduleCleanup();

        // Monitor memory usage
        this.startMemoryMonitoring();

        // Setup graceful shutdown handlers
        this.setupShutdownHandlers();

        log.info('ServiceWorkerResourceManager initialized');
    }

    /**
     * Schedule periodic resource cleanup
     */
    private scheduleCleanup(): void {
        const cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval);

        this.timers.add(cleanupTimer);
    }

    /**
     * Monitor memory usage and trigger cleanup when needed
     */
    private startMemoryMonitoring(): void {
        const memoryTimer = setInterval(() => {
            this.updateMemoryMetrics();

            if (this.metrics.memoryUsage > this.config.maxMemoryThreshold) {
                log.warn(`Memory usage (${this.metrics.memoryUsage}MB) exceeds threshold, triggering cleanup`);
                this.performAggressiveCleanup();
            }
        }, 60000); // Check every minute

        this.timers.add(memoryTimer);
    }

    /**
     * Update memory usage metrics
     */
    private updateMemoryMetrics(): void {
        if (typeof performance !== 'undefined' && (performance as any).memory) {
            const memory = (performance as any).memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        }
    }

    /**
     * Perform routine resource cleanup
     */
    public performCleanup(): void {
        const now = Date.now();

        // Clean expired storage cache
        this.cleanExpiredCache();

        // Clean completed hardware wallet operations
        this.cleanHardwareWalletQueue();

        // Remove old event listeners
        this.cleanEventListeners();

        // Hardware wallet cache doesn't need explicit cleanup (has auto cleanup)
        // But we'll log its stats for monitoring
        try {
            const hwCacheStats = hardwareWalletCache.getStats();
            log.debug(`Hardware wallet cache stats - Entries: ${hwCacheStats.deviceInfoEntries + hwCacheStats.connectionStateEntries + hwCacheStats.addressCacheEntries}, Hit rate: ${hwCacheStats.hitRate.toFixed(1)}%`);
        } catch (error) {
            log.warn('Failed to get hardware wallet cache stats:', error);
        }

        this.metrics.lastCleanup = now;
        log.debug('Resource cleanup completed');
    }

    /**
     * Perform aggressive cleanup when memory threshold exceeded
     */
    public performAggressiveCleanup(): void {
        // Clear all cache
        this.storageCache.clear();

        // Clear pending hardware wallet operations
        this.hardwareWalletQueue.clear();

        // Force garbage collection if available
        if (typeof globalThis.gc === 'function') {
            globalThis.gc();
        }

        log.info('Aggressive cleanup performed');
    }

    /**
     * Clean expired cache entries
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.storageCache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => this.storageCache.delete(key));

        if (expiredKeys.length > 0) {
            log.debug(`Cleaned ${expiredKeys.length} expired cache entries`);
        }
    }

    /**
     * Clean completed hardware wallet operations
     */
    private cleanHardwareWalletQueue(): void {
        const completedOperations: string[] = [];

        for (const [key, promise] of this.hardwareWalletQueue.entries()) {
            // Check if promise is settled
            Promise.race([promise, Promise.resolve('timeout')])
                .then(result => {
                    if (result === 'timeout') {
                        // Promise is still pending, keep it
                        return;
                    }
                    completedOperations.push(key);
                })
                .catch(() => {
                    // Promise rejected, remove it
                    completedOperations.push(key);
                });
        }

        completedOperations.forEach(key => this.hardwareWalletQueue.delete(key));
    }

    /**
     * Clean up old event listeners
     */
    private cleanEventListeners(): void {
        // Remove listeners that haven't been used recently
        // This is a placeholder - actual implementation would depend on specific event tracking
        const now = Date.now();
        const staleThreshold = 600000; // 10 minutes

        // Implementation would track listener usage and remove stale ones
        log.debug('Event listener cleanup completed');
    }

    /**
     * Optimized hardware wallet operation with resource management
     */
    public async manageHardwareWalletOperation<T>(
        operationKey: string,
        operation: () => Promise<T>
    ): Promise<T> {
        // Check if operation is already in progress
        if (this.hardwareWalletQueue.has(operationKey)) {
            log.debug(`Hardware wallet operation '${operationKey}' already in progress, reusing`);
            return this.hardwareWalletQueue.get(operationKey) as Promise<T>;
        }

        // Create operation with timeout
        const operationPromise = Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Hardware wallet operation timeout'));
                }, this.config.hardwareWalletTimeout);
            })
        ]);

        // Track operation
        this.hardwareWalletQueue.set(operationKey, operationPromise);
        this.metrics.hardwareWalletOperations++;

        try {
            const result = await operationPromise;
            return result;
        } finally {
            // Clean up after operation completes
            setTimeout(() => {
                this.hardwareWalletQueue.delete(operationKey);
            }, 5000); // Keep for 5 seconds in case of retry
        }
    }

    /**
     * Optimized storage operation with caching
     */
    public async manageStorageOperation<T>(
        cacheKey: string,
        operation: () => Promise<T>,
        ttl = 300000 // 5 minutes default TTL
    ): Promise<T> {
        // Check cache first
        const cached = this.storageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            log.debug(`Storage cache hit for key: ${cacheKey}`);
            return cached.data;
        }

        // Perform operation
        const result = await operation();
        this.metrics.storageOperations++;

        // Cache result
        this.storageCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl
        });

        log.debug(`Storage operation completed and cached: ${cacheKey}`);
        return result;
    }

        /**
     * Register event listener with cleanup tracking
     */
    public registerEventListener(
        eventType: string,
        listener: (...args: any[]) => void,
        target: EventTarget = globalThis as any
    ): void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }

        this.eventListeners.get(eventType)!.push(listener);
        target.addEventListener(eventType as any, listener as any);

        log.debug(`Registered event listener for: ${eventType}`);
    }

    /**
     * Setup graceful shutdown handlers
     */
    private setupShutdownHandlers(): void {
        // Chrome extension specific lifecycle events
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onSuspend?.addListener(() => {
                log.info('Service worker suspending, performing cleanup');
                this.performCleanup();
            });

            chrome.runtime.onSuspendCanceled?.addListener(() => {
                log.info('Service worker suspend canceled');
            });
        }
    }

    /**
     * Optimized keep-alive mechanism
     */
    public setupOptimizedKeepAlive(): void {
        if (typeof chrome !== 'undefined' && chrome.alarms) {
            try {
                // Use longer interval to reduce resource usage
                chrome.alarms.create('optimizedKeepAlive', {
                    periodInMinutes: this.config.keepAliveInterval,
                    delayInMinutes: 1, // Initial delay
                });

                chrome.alarms.onAlarm.addListener((alarm) => {
                    if (alarm.name === 'optimizedKeepAlive') {
                        // Minimal keep-alive action
                        this.performLightweightKeepAlive();
                    }
                });

                log.info(`Optimized keep-alive setup with ${this.config.keepAliveInterval}min interval`);
            } catch (error) {
                log.error('Failed to setup optimized keep-alive:', error);
            }
        }
    }

    /**
     * Lightweight keep-alive action
     */
    private performLightweightKeepAlive(): void {
        // Only persist critical state, avoid heavy operations
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            chrome.storage.session.set({
                lastKeepAlive: Date.now(),
                serviceWorkerActive: true,
            }).catch(error => {
                log.warn('Keep-alive storage failed:', error);
            });
        }

        // Update metrics
        this.updateMemoryMetrics();

        log.debug('Lightweight keep-alive performed');
    }

    /**
     * Check if hardware wallet operations should be deferred
     */
    public shouldDeferHardwareWalletOperation(): boolean {
        // Defer if memory usage is high or if too many operations are queued
        return (
            this.metrics.memoryUsage > this.config.maxMemoryThreshold * 0.8 ||
            this.hardwareWalletQueue.size > 5
        );
    }

    /**
     * Get current performance metrics
     */
    public getMetrics(): PerformanceMetrics {
        this.updateMemoryMetrics();

        // Include hardware wallet cache statistics
        let hardwareWalletCacheStats;
        try {
            const cacheStats = hardwareWalletCache.getStats();
            hardwareWalletCacheStats = {
                hits: cacheStats.hits,
                misses: cacheStats.misses,
                hitRate: cacheStats.hitRate,
                totalEntries: cacheStats.deviceInfoEntries + cacheStats.connectionStateEntries +
                             cacheStats.addressCacheEntries + cacheStats.appStatusEntries
            };
        } catch (error) {
            log.warn('Failed to get hardware wallet cache stats for metrics:', error);
        }

        return {
            ...this.metrics,
            hardwareWalletCacheStats
        };
    }

    /**
     * Cleanup all resources
     */
    public cleanup(): void {
        // Clear all timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Clear all caches
        this.storageCache.clear();
        this.hardwareWalletQueue.clear();

        // Remove event listeners
        this.eventListeners.clear();

        // Cleanup hardware wallet cache
        try {
            hardwareWalletCache.cleanup();
            log.debug('Hardware wallet cache cleaned up');
        } catch (error) {
            log.warn('Failed to cleanup hardware wallet cache:', error);
        }

        log.info('ServiceWorkerResourceManager cleanup completed');
    }
}

// Export singleton instance
export const resourceManager = ServiceWorkerResourceManager.getInstance();
