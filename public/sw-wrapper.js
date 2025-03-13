// Service Worker Wrapper
// This script safely initializes the service worker and handles API availability

// Set up global error handler
self.onerror = function (message, source, lineno, colno, error) {
    console.error('SW Error:', error?.message || message, 'at', source, lineno, colno);
    return true; // Prevents the default error handling
};

// Safe API access helper
const safeApiAccess = {
    // Safe chrome API access
    chrome: {
        storage: {
            local: {
                get: function (key, callback) {
                    if (chrome?.storage?.local?.get) {
                        try {
                            return chrome.storage.local.get(key).then(callback);
                        } catch (e) {
                            console.error('Error accessing chrome.storage.local.get', e);
                            callback({});
                            return Promise.resolve({});
                        }
                    } else {
                        console.warn('chrome.storage.local.get not available');
                        callback({});
                        return Promise.resolve({});
                    }
                },
                set: function (data, callback) {
                    if (chrome?.storage?.local?.set) {
                        try {
                            return chrome.storage.local.set(data).then(function () {
                                callback && callback();
                            });
                        } catch (e) {
                            console.error('Error accessing chrome.storage.local.set', e);
                            callback && callback();
                            return Promise.resolve();
                        }
                    } else {
                        console.warn('chrome.storage.local.set not available');
                        callback && callback();
                        return Promise.resolve();
                    }
                }
            }
        },
        alarms: {
            create: function (name, alarmInfo) {
                if (chrome?.alarms?.create) {
                    try {
                        chrome.alarms.create(name, alarmInfo);
                        return true;
                    } catch (e) {
                        console.error('Error creating alarm', e);
                        return false;
                    }
                } else {
                    console.warn('chrome.alarms.create not available');
                    return false;
                }
            },
            onAlarm: {
                addListener: function (callback) {
                    if (chrome?.alarms?.onAlarm?.addListener) {
                        try {
                            chrome.alarms.onAlarm.addListener(callback);
                            return true;
                        } catch (e) {
                            console.error('Error adding alarm listener', e);
                            return false;
                        }
                    } else {
                        console.warn('chrome.alarms.onAlarm.addListener not available');
                        return false;
                    }
                }
            }
        }
    }
};

// Initialize service worker state
const initServiceWorker = () => {
    // Set initial state
    safeApiAccess.chrome.storage.local.set({
        serviceWorkerStarted: true,
        serviceWorkerTimestamp: Date.now()
    }, () => {
        console.log('Service worker initialized');
    });

    // Set up keep-alive mechanism (only if alarms API is available)
    if (safeApiAccess.chrome.alarms.create) {
        safeApiAccess.chrome.alarms.create('keepAlive', {
            periodInMinutes: 5,
            delayInMinutes: 0.1
        });
    }
};

// Setup alarm listeners safely
if (safeApiAccess.chrome.alarms.onAlarm.addListener) {
    safeApiAccess.chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'keepAlive') {
            console.log('Keep-alive ping');
            // Update active state
            safeApiAccess.chrome.storage.local.set({
                serviceWorkerLastPing: Date.now()
            });

            // Fetch keep-alive resource if available
            if (self.fetch && chrome?.runtime?.getURL) {
                try {
                    fetch(chrome.runtime.getURL('keep-alive'))
                        .catch(error => {
                            console.warn('Keep-alive fetch failed:', error);
                        });
                } catch (e) {
                    console.error('Error during keep-alive fetch', e);
                }
            }
        }
    });
}

// Initialize when ready
self.addEventListener('install', (event) => {
    console.log('Service worker installing...');
    self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
    console.log('Service worker activated');
    event.waitUntil(clients.claim()); // Take control of clients immediately

    // Initialize after activation
    initServiceWorker();
});

// Handle messages safely
self.addEventListener('message', (event) => {
    console.log('Service worker received message:', event.data);
});

// Import the actual background script
// Make sure it runs in a try-catch to prevent fatal errors
try {
    self.importScripts('background.js');
    console.log('Background script loaded successfully');
} catch (error) {
    console.error('Failed to load background script:', error);
    // Continue to keep service worker alive even if background script fails
    initServiceWorker();
} 