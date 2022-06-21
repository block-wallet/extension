/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

export default {
    migrate: async (persistedState: BlankAppState) => {
        const updateObj: {
            blockData: {
                [chainId: number]: {
                    blockNumber: number;
                    updateCounter: number;
                };
            };
        } = { blockData: {} };

        Object.keys(persistedState.BlockUpdatesController.blockData).reduce(
            (_, cv) => {
                updateObj.blockData[Number(cv)] = {
                    blockNumber: persistedState.BlockUpdatesController
                        .blockData[Number(cv)] as any,
                    updateCounter: 0,
                };
                return '';
            },
            ''
        );

        return {
            ...persistedState,
            BlockUpdatesController: { ...updateObj },
        };
    },
    // Migration version must match new bumped package.json version
    version: '0.1.7',
} as IMigration;
