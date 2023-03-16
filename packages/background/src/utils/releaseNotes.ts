import { ReleaseNote } from '../controllers/PreferencesController';
import { compareVersions, validate } from 'compare-versions';
interface Options {
    lastVersionSeen?: string;
    stackNotes?: boolean;
    currentVersionOnly?: boolean;
}

const defaultOptions: Options = {
    stackNotes: true,
    currentVersionOnly: false,
};

const generateReleaseNotesNews = (
    releasesNotes: ReleaseNote[],
    userCurrentVersion: string,
    options: Options = defaultOptions
): ReleaseNote[] | null => {
    if (!validate(userCurrentVersion)) {
        return null;
    }
    const safeOptions = {
        ...defaultOptions,
        ...options,
    };
    let sortedNotes = [...releasesNotes].sort((r1, r2) =>
        compareVersions(r2.version, r1.version)
    );

    if (safeOptions.lastVersionSeen) {
        sortedNotes = sortedNotes.filter(
            ({ version }) =>
                compareVersions(version, safeOptions.lastVersionSeen || '') > 0
        );
    }

    const filteredNotes = sortedNotes.filter(({ version }) => {
        const result = compareVersions(userCurrentVersion, version);
        if (safeOptions.currentVersionOnly) {
            return result === 0;
        }
        return result > -1;
    });

    //keep last version only
    if (filteredNotes.length && !safeOptions.stackNotes) {
        return [filteredNotes[0]];
    }

    return filteredNotes;
};

export { generateReleaseNotesNews };
