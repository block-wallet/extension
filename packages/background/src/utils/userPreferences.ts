import {
    PreferencesControllerState,
    ReleaseNote,
} from '../controllers/PreferencesController';
import { generateReleaseNotesNews } from './releaseNotes';
import browser from 'webextension-polyfill';
interface ReleaseNotesFile {
    releaseNotes: ReleaseNote[];
}
export const getReleaseNotes = async (): Promise<ReleaseNote[]> => {
    const url = browser.runtime.getURL('/release-notes.json');
    try {
        const response = await fetch(url);
        const parsedFile: ReleaseNotesFile = await response.json();
        return parsedFile.releaseNotes;
    } catch (e) {
        return [];
    }
};

export const generateOnDemandReleaseNotes = async (
    version: string
): Promise<ReleaseNote[]> => {
    const releaseNotesData = await getReleaseNotes();
    const data = generateReleaseNotesNews(releaseNotesData, version, {
        lastVersionSeen: undefined,
        stackNotes: false,
        currentVersionOnly: true,
    });
    return data || [];
};

export const resolvePreferencesAfterWalletUpdate = async (
    userPreferences: Partial<PreferencesControllerState>,
    newManifestVersion: string
): Promise<Partial<PreferencesControllerState>> => {
    const { releaseNotesSettings, settings } = userPreferences;
    const releaseNotesData = await getReleaseNotes();
    let releaseNotes: ReleaseNote[] | null = [];
    if (settings?.subscribedToReleaseaNotes) {
        releaseNotes = generateReleaseNotesNews(
            releaseNotesData,
            newManifestVersion,
            {
                stackNotes: true,
                lastVersionSeen: releaseNotesSettings?.lastVersionUserSawNews,
            }
        );
    }
    const userHasNews = !!releaseNotes?.length;
    const lastVersionUserSawNews =
        releaseNotesSettings?.lastVersionUserSawNews || '';
    return {
        ...userPreferences,
        releaseNotesSettings: {
            ...userPreferences.releaseNotesSettings,
            lastVersionUserSawNews: userHasNews
                ? lastVersionUserSawNews
                : newManifestVersion,
            latestReleaseNotes: releaseNotes || [],
        },
    };
};
