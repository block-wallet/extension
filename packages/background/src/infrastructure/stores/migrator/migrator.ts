import { compareVersions } from 'compare-versions';
import migrations from './migrations';

import { BlankAppState } from '../../../utils/constants/initialState';
import { DeepPartial } from '../../../utils/types/helpers';

export const migrator = async (
    version: string,
    persistedState: DeepPartial<BlankAppState>
): Promise<BlankAppState> => {
    let newState = persistedState;
    for (const migration of migrations()) {
        if (compareVersions(migration.version, version) > 0) {
            newState = await migration.migrate(newState);
        }
    }
    return newState as BlankAppState;
};
