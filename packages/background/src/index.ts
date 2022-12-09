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

// Initialize Block State Store
const blankStateStore = new BlankStorageStore();

/**
 * Load state from persistence
 *
 * @returns persisted state or initial state
 */
const getPersistedState = new Promise<BlankAppState>((resolve) => {
    const getStateAndVersion = async () => {
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
        chrome.browserAction.setBadgeBackgroundColor({ color: '#1673FF' }); // BlockWallet primary color
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

if (isManifestV3()) {
    // this keeps alive the service worker.
    // when it goes 'inactive' it is restarted.
    chrome.alarms.create({ delayInMinutes: 0.5, periodInMinutes: 0.05 });
    chrome.alarms.onAlarm.addListener(() => {
        fetch(chrome.runtime.getURL('keep-alive'));
    });
}
