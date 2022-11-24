import {
    BlankSupportedFeatures,
    FEATURES,
} from '../../../../utils/constants/features';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration increases the block fetch intervals for all the networks and erases the FEATURES.TORNADO form the networks.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { availableNetworks } = persistedState.NetworkController;
        const updatedNetworks = { ...availableNetworks };

        for (const key in updatedNetworks) {
            const network = updatedNetworks[key];
            if (network.nativelySupported) {
                const currentInterval =
                    network.actionsTimeIntervals.blockNumberPull;

                // increase the current interval by 50%
                const newInterval = Math.trunc(
                    currentInterval + currentInterval / 2
                );

                const features: BlankSupportedFeatures[] = [];
                for (const feature in updatedNetworks[key].features) {
                    if (feature !== FEATURES.TORNADO) {
                        features.push(feature as BlankSupportedFeatures);
                    }
                }

                // update the value
                updatedNetworks[key] = {
                    ...updatedNetworks[key],
                    actionsTimeIntervals: {
                        ...updatedNetworks[key].actionsTimeIntervals,
                        blockNumberPull: newInterval,
                    },
                    features: features,
                };
            }
        }

        const { gasPriceData } = persistedState.GasPricesController;
        const updatedGasPriceData = { ...gasPriceData };

        for (const c in updatedGasPriceData) {
            const chainId = parseInt(c);

            const gasPriceData = updatedGasPriceData[chainId];
            gasPriceData.gasPricesLevels.slow = {
                ...gasPriceData.gasPricesLevels.slow,
            };
            gasPriceData.gasPricesLevels.average = {
                ...gasPriceData.gasPricesLevels.average,
            };
            gasPriceData.gasPricesLevels.fast = {
                ...gasPriceData.gasPricesLevels.fast,
            };

            updatedGasPriceData[c] = {
                ...gasPriceData,
            };
        }

        return {
            ...persistedState,
            NetworkController: {
                ...persistedState.NetworkController,
                availableNetworks: { ...updatedNetworks },
            },
            GasPricesController: {
                ...persistedState.GasPricesController,
                gasPriceData: { ...updatedGasPriceData },
            },
        };
    },
    version: '1.0.0',
} as IMigration;
