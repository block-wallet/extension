import PermissionsController, {
    PermissionsControllerState,
} from '../../src/controllers/PermissionsController';

import { mockPreferencesController } from './mock-preferences';

const mockedPermissionsController = new PermissionsController(
    {} as PermissionsControllerState,
    mockPreferencesController
);

export { mockedPermissionsController };
