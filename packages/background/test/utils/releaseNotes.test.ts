import { generateReleaseNotesNews } from '../../src/utils/releaseNotes';
import { expect } from 'chai';
import { ReleaseNote } from '@block-wallet/background/controllers/PreferencesController';

const RELEASE_NOTES = [
    {
        version: '0.0.1',
        sections: [
            {
                title: 'Updates',
                notes: [
                    {
                        type: 'success',
                        message: 'Version 0.0.1 success 1',
                    },
                    {
                        type: 'success',
                        message: 'Version 0.0.1 success 2',
                    },
                    {
                        type: 'warn',
                        message: 'Version 0.0.1 warn 1',
                    },
                ],
            },
        ],
    },
    {
        version: '0.1.1',
        sections: {
            title: 'Updates',
            notes: [
                {
                    type: 'success',
                    message: 'Version 0.1.1 success 1',
                },
                {
                    type: 'warn',
                    message: 'Version 0.1.1 warn 1',
                },
                {
                    type: 'warn',
                    message: 'Version 0.1.1 warn 2',
                },
            ],
        },
    },
    {
        version: '2.1.0',
        sections: [
            {
                title: 'Updates',
                notes: [
                    {
                        type: 'success',
                        message: 'Version 2.1.0 success 1',
                    },
                    {
                        type: 'warn',
                        message: 'Version 2.1.0 warn 1',
                    },
                ],
            },
        ],
    },
] as ReleaseNote[];

describe('Release notes', () => {
    it('should generate an empty changelog from empty release notes', () => {
        expect(generateReleaseNotesNews([], '1.0.0')).to.deep.equal([]);
    });
    it('should return null on invalid version', () => {
        expect(generateReleaseNotesNews([], '1.zdsa.21.2.0')).to.deep.equal(
            null
        );
    });
    it('should geenrate an entire changelog if last version seen is not specified and user is in last version', () => {
        expect(generateReleaseNotesNews(RELEASE_NOTES, '3.0.0')).to.deep.equal(
            [...RELEASE_NOTES].reverse()
        );
    });
    it('should geenrate changelog until user current version and last version seen is not specified', () => {
        expect(generateReleaseNotesNews(RELEASE_NOTES, '0.1.1')).to.deep.equal([
            RELEASE_NOTES[1],
            RELEASE_NOTES[0],
        ]);
    });
    it('should remove from changelog already seen versions', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '0.1.1', {
                lastVersionSeen: '0.0.1',
            })
        ).to.deep.equal([RELEASE_NOTES[1]]);
    });
    it('should return an empty changelog if last version has been seen', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '2.1.0', {
                lastVersionSeen: '2.1.0',
            })
        ).to.deep.equal([]);
    });
    it('should not stack notes', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '2.1.0', {
                stackNotes: false,
            })
        ).to.deep.equal([RELEASE_NOTES[2]]);
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '0.1.1', {
                stackNotes: false,
            })
        ).to.deep.equal([RELEASE_NOTES[1]]);
    });
    it('should not stack notes and filter by last seen', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '2.1.0', {
                stackNotes: false,
                lastVersionSeen: '2.1.0',
            })
        ).to.deep.equal([]);
    });
    it('should get the specified release notes of the version', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '2.1.0', {
                stackNotes: false,
                lastVersionSeen: undefined,
                currentVersionOnly: true,
            })
        ).to.deep.equal([RELEASE_NOTES[2]]);
    });
    it('should return empty because the current version does not exist', () => {
        expect(
            generateReleaseNotesNews(RELEASE_NOTES, '6.6.6', {
                stackNotes: false,
                lastVersionSeen: undefined,
                currentVersionOnly: true,
            })
        ).to.deep.equal([]);
    });
});
