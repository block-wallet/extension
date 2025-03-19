/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import BlankController, {
    BlankControllerEvents,
} from './controllers/BlankController';
import BlankStorageStore from './infrastructure/stores/BlankStorageStore';
import initialState, { BlankAppState } from './utils/constants/initialState';
import reconcileState from './infrastructure/stores/migrator/reconcileState';
import compareVersions from 'compare-versions';
import { getVersion, openExtensionInBrowser } from './utils/window';
import { setupConnection } from './infrastructure/connection';
import { migrator } from './infrastructure/stores/migrator/migrator';
import { DeepPartial } from './utils/types/helpers';
import log, { LogLevelDesc } from 'loglevel';
import { resolvePreferencesAfterWalletUpdate } from './utils/userPreferences';
import { CONTENT } from './utils/types/communication';
import { isManifestV3 } from './utils/manifest';
import { Devices } from './utils/types/hardware';

// Set log level
log.setLevel(process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

// Initialize Block State Store
const blankStateStore = new BlankStorageStore();

/**
 * Ensures storage API is available before proceeding
 * @returns Promise that resolves when storage is available
 */
const ensureStorageAvailable = async (): Promise<void> => {
    try {
        await blankStateStore.ensureStorageAvailable();
        log.info('Storage API is available');
    } catch (error) {
        log.error('Storage API not available, using initial state', error);
    }
};

/**
 * Load state from persistence
 *
 * @returns persisted state or initial state
 */
const getPersistedState = new Promise<BlankAppState>((resolve) => {
    const getStateAndVersion = async () => {
        try {
            // Ensure storage is available before proceeding
            await ensureStorageAvailable();

            const packageVersion = require('../package.json').version;
            let version = await blankStateStore.getVersion();

            // If version is not set (i.e. First install) set the current package.json version
            if (!version) {
                version = packageVersion as string;
                await blankStateStore.setVersion(version);
            }

            // State retrieval callback
            const handleStoredState = async (storedState: BlankAppState) => {
                if (storedState === undefined) {
                    resolve(initialState);
                } else {
                    // Check if version has changed and reconcile the state
                    if (compareVersions(packageVersion, version!)) {
                        let reconciledState = reconcileState(
                            storedState,
                            initialState
                        );

                        // Run migrations
                        reconciledState = await migrator(
                            version!,
                            reconciledState as DeepPartial<BlankAppState>
                        );

                        // Update persisted store version to newly one
                        await blankStateStore.setVersion(packageVersion!);

                        const manifestVersion = getVersion();

                        //calculate release notes here
                        const { releaseNotesSettings } =
                            await resolvePreferencesAfterWalletUpdate(
                                reconciledState.PreferencesController,
                                manifestVersion
                            );
                        reconciledState.PreferencesController.releaseNotesSettings =
                            releaseNotesSettings!;

                        // Persist reconciled state
                        blankStateStore.set('blankState', reconciledState);

                        resolve(reconciledState);
                    } else {
                        resolve(storedState);
                    }
                }
            };

            // Get persisted state
            blankStateStore.get('blankState', handleStoredState);
        } catch (error) {
            log.error('Error retrieving persisted state', error);
            resolve(initialState);
        }
    };

    getStateAndVersion();
});

const getDevTools = () => {
    const withDevTools =
        process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined' &&
        (window as any).devToolsExtension;

    return withDevTools
        ? (window as any).devToolsExtension.connect()
        : undefined;
};

/**
 * updates the extension badge
 */
const updateExtensionBadge = (label: string) => {
    if (isManifestV3()) {
        chrome.action.setBadgeText({ text: label });
        chrome.action.setBadgeBackgroundColor({ color: '#1673FF' }); // BlockWallet primary color
    } else {
        chrome.browserAction.setBadgeText({ text: label });
        chrome.browserAction.setBadgeBackgroundColor({
            color: '#1673FF',
        }); // BlockWallet primary color
    }
};

/**
 * Initializes block wallet
 *
 */
const initBlockWallet = async () => {
    // Get persisted state
    const initState = await getPersistedState;

    // Check if devTools are available
    const devTools = getDevTools();

    // Initialize block controller
    const blankController = new BlankController({
        initState,
        blankStateStore,
        devTools,
    });

    // After initializing blankController, restore hardware wallet connections if needed
    if (isManifestV3()) {
        // Run immediately and don't wait for promises to complete
        // This ensures restoration happens as early as possible
        log.info('Starting hardware wallet state restoration...');
        setTimeout(() => {
            restoreHardwareWalletConnections(blankController).catch(error => {
                log.error('Failed to restore hardware wallet connections:', error);
            });
        }, 0);
    }

    // Clear badge on init
    updateExtensionBadge('');

    blankController.on(
        BlankControllerEvents.EXTERNAL_REQUESTS_AMOUNT_CHANGE,
        (dappRequestsAmount: number) => {
            let label = '';

            if (dappRequestsAmount > 10) {
                label = '10+';
            } else if (dappRequestsAmount > 0) {
                label = String(dappRequestsAmount);
            }

            updateExtensionBadge(label);
        }
    );

    // Setup connection
    chrome.runtime.onConnect.addListener((port) => {
        setupConnection(port, blankController);
    });

    // Set isBlankInitialized response and should inject response
    chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
        if (request.message === 'isBlankInitialized') {
            sendResponse({ isBlankInitialized: true });
        } else if (request.message === CONTENT.SHOULD_INJECT) {
            sendResponse({ shouldInject: blankController.shouldInject() });
        } else if (request.message === CONTENT.SW_KEEP_ALIVE) {
            sendResponse();
        }
    });

    // Setting the default log level:
    /*
    | 'trace'
    | 'debug'
    | 'info'
    | 'warn'
    | 'error'
    | 'silent'
    */
    log.setLevel((process.env.LOG_LEVEL as LogLevelDesc) || 'error');
};

// Start block wallet
initBlockWallet().catch((error) => {
    log.error(error.message || error);
});

// On install, open onboarding tab
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.runtime.setUninstallURL('https://forms.gle/g4RghfndrhwPS6L76');
        openExtensionInBrowser();
    }

    // For existing users, when the extension gets updated we also set the uninstall form.
    if (reason === 'update') {
        chrome.runtime.setUninstallURL('https://forms.gle/g4RghfndrhwPS6L76');
    }
});

// Register content script installation more robustly with retry logic
const registerBlankProviderContentScript = async () => {
    const MAX_RETRIES = 3;
    let retries = 0;

    const attemptRegistration = async (): Promise<boolean> => {
        try {
            // Check if the content script API is available
            if (
                !chrome.scripting ||
                typeof chrome.scripting.registerContentScripts !== 'function'
            ) {
                console.warn(
                    'Chrome scripting API is not available in this browser/environment'
                );
                return false;
            }

            // Safe check for getRegisteredContentScripts
            if (
                typeof chrome.scripting.getRegisteredContentScripts ===
                'function'
            ) {
                try {
                    const existingScripts =
                        await chrome.scripting.getRegisteredContentScripts({
                            ids: ['blankProvider'],
                        });

                    // If already registered, no need to register again
                    if (existingScripts && existingScripts.length > 0) {
                        console.log(
                            'blankProvider content script is already registered'
                        );
                        return true;
                    }
                } catch (checkErr) {
                    console.warn(
                        'Error checking for registered scripts:',
                        checkErr
                    );
                }
            }

            // Register the content script if not already registered or if we couldn't check
            await chrome.scripting.registerContentScripts([
                {
                    id: 'blankProvider',
                    matches: ['file://*/*', 'http://*/*', 'https://*/*'],
                    js: ['blankProvider.js'],
                    runAt: 'document_start',
                    world: 'MAIN',
                    persistAcrossSessions: true, // Ensure script registration persists
                },
            ]);
            console.log('Successfully registered blankProvider content script');
            return true;
        } catch (err) {
            retries++;
            if (retries >= MAX_RETRIES) {
                console.warn(
                    `Failed to register blankProvider content script after ${MAX_RETRIES} attempts. ${err}`
                );
                return false;
            }

            console.log(
                `Retrying content script registration (${retries}/${MAX_RETRIES})...`
            );
            // Exponential backoff for retries
            await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, retries - 1))
            );
            return attemptRegistration();
        }
    };

    return attemptRegistration();
};

/**
 * Helper function to persist critical state data
 */
function persistCriticalState() {
    chrome.storage.session.set({
        lastActiveTimestamp: Date.now(),
        controllerStatus: 'active',
        // Add other critical keys if needed
    });
}

// Handle service worker lifecycle events specifically for MV3
if (isManifestV3()) {
    // Improve service worker startup by handling the install event
    chrome.runtime.onInstalled.addListener((details) => {
        // Perform one-time setup tasks that should happen on install
        if (details.reason === 'install') {
            // Cache essential resources during installation
            console.log('Caching essential resources for BlockWallet');
            // Set initial state in storage for quick access on service worker startup
            chrome.storage.local.set({
                serviceWorkerLastStartup: Date.now(),
                serviceWorkerInstalled: true,
            });
        }

        // Handle update events
        if (details.reason === 'update') {
            // Perform any migration tasks needed after an update
            chrome.storage.local.set({
                serviceWorkerLastUpdate: Date.now(),
                serviceWorkerVersion: chrome.runtime.getManifest().version,
            });
        }
    });

    // Service worker keep-alive implementation
    // Using a more reasonable interval that balances functionality with resource usage
    // 5 minutes is more aligned with Chrome's recommendations
    // Added small initial delay to speed up the first ping after installation
    try {
        if (chrome?.alarms?.create) {
            chrome.alarms.create('keepAlive', {
                periodInMinutes: 5,
                delayInMinutes: 0.1,
            });
            log.info('Keep-alive alarm created successfully');
        } else {
            log.warn(
                'chrome.alarms.create not available, skipping keep-alive setup'
            );
        }
    } catch (error) {
        log.error('Error creating keep-alive alarm:', error);
    }

    try {
        if (chrome?.alarms?.onAlarm?.addListener) {
            chrome.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name === 'keepAlive') {
                    // Only fetch the keep-alive URL when needed
                    try {
                        fetch(chrome.runtime.getURL('keep-alive'))
                            .catch((error) => {
                                log.warn('Keep-alive fetch failed:', error);
                            })
                            .finally(() => {
                                // Persist critical state regardless of fetch outcome
                                persistCriticalState();
                            });
                    } catch (error) {
                        log.error('Error during keep-alive fetch:', error);
                        // Still try to persist state even if fetch fails
                        persistCriticalState();
                    }
                }
            });
            log.info('Alarm listener added successfully');
        } else {
            log.warn(
                'chrome.alarms.onAlarm.addListener not available, skipping listener setup'
            );
        }
    } catch (error) {
        log.error('Error adding alarm listener:', error);
    }

    // Use the storage API to persist important state between service worker restarts
    // This helps make the extension resilient to service worker terminations
    chrome.storage.session.onChanged.addListener((changes) => {
        // Respond to storage changes to restore state when the service worker restarts
        console.log('Session storage changes detected', changes);
    });

    registerBlankProviderContentScript();
}

/**
 * Restores hardware wallet connections from session storage after service worker restarts.
 */
async function restoreHardwareWalletConnections(blankController: BlankController): Promise<void> {
    try {
        if (!chrome.storage?.session) return;

        // Get all hardware wallet states from session storage
        const result = await chrome.storage.session.get(null);
        const hwKeyringKeys = Object.keys(result).filter(key =>
            key.startsWith('hw_keyring_'));

        if (hwKeyringKeys.length === 0) {
            log.debug('No hardware wallet states to restore');
            return;
        }

        log.info(`Found ${hwKeyringKeys.length} hardware wallet states to restore`);

        // Restore each hardware wallet connection
        for (const key of hwKeyringKeys) {
            const hwState = result[key];
            const deviceName = key.replace('hw_keyring_', '').toUpperCase();

            try {
                await blankController.restoreHardwareWalletState({
                    device: deviceName,
                    state: hwState
                });
                log.info(`Successfully restored ${deviceName} hardware wallet state`);

                // After restoration, make sure the keyring is unlocked and ready to use
                try {
                    const keyringController = blankController['keyringController'];
                    if (keyringController) {
                        const keyring = await keyringController.getKeyringFromDevice(deviceName as Devices);
                        if (keyring && typeof keyring.unlock === 'function') {
                            log.debug(`Unlocking restored ${deviceName} keyring`);
                            await keyring.unlock();
                        }
                    }
                } catch (unlockError) {
                    log.warn(`Failed to unlock restored ${deviceName} keyring:`, unlockError);
                    // Continue even if unlock fails - we'll retry later
                }
            } catch (error) {
                log.error(`Failed to restore ${deviceName} hardware wallet state:`, error);
            }
        }
    } catch (error) {
        log.error('Error in restoreHardwareWalletConnections:', error);
    }
}
