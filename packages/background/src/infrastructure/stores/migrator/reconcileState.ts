/* eslint-disable @typescript-eslint/ban-types */

import { DeepPartial } from '@block-wallet/background/utils/types/helpers';

/**
 * Merges the persisted state with the new initial state
 *
 * @param persistedState The inbound state
 * @param originalState The initial state
 * @returns The merged state
 */
export default function reconcileState<S extends { [key: string]: any }>(
    persistedState: DeepPartial<S>,
    initialState: S
): S {
    const newState: any = { ...initialState };
    // only reconcile if persistedState exists and is an object
    if (persistedState && typeof persistedState === 'object') {
        Object.keys(persistedState).forEach((key) => {
            if (isPlainEnoughObject(initialState[key])) {
                // If object is plain enough shallow merge the missing values
                newState[key] = { ...newState[key], ...persistedState[key] };
                return;
            }
            // Otherwise hard set
            newState[key] = persistedState[key];
        });
    }

    return newState;
}

function isPlainEnoughObject(o: object) {
    return o !== null && !Array.isArray(o) && typeof o === 'object';
}
