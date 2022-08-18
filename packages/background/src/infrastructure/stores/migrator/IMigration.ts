import { DeepPartial } from '../../../utils/types/helpers';
import { BlankAppState } from '../../../utils/constants/initialState';

export interface IMigration {
    version: string;
    migrate(persistedState: DeepPartial<BlankAppState>): Promise<BlankAppState>;
}
