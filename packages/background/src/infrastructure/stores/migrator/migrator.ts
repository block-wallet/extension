import { compareVersions } from 'compare-versions';
import migrations from './migrations';

import { BlankAppState } from '../../../utils/constants/initialState';
import { DeepPartial } from '../../../utils/types/helpers';
import log from 'loglevel';

export const migrator = async (
    version: string,
    persistedState: DeepPartial<BlankAppState>
): Promise<BlankAppState> => {
    let newState = persistedState;
    for (const migration of migrations()) {
        if (compareVersions(migration.version, version) > 0) {
            try {
                newState = await migration.migrate(newState);
            } catch (error) {
                // This will catch any potential migration errors and continue the process so the extension can remain usable.
                // Previously, the exception remained unhandled, breaking the initialization process.
                log.error(
                    `Could not apply migration ${migration.version} - `,
                    error
                );
            }
        }
    }
    return newState as BlankAppState;
};
