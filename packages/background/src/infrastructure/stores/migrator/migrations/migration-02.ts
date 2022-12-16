import { GasPricesControllerState } from '@block-wallet/background/controllers/GasPricesController';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { BigNumber } from 'ethers';
import { IMigration } from '../IMigration';

export default {
    migrate: async (persistedState: BlankAppState) => {
        // GasPriceController
        const gasPriceControllerObject: GasPricesControllerState = {
            gasPriceData: {},
        };

        Object.keys(persistedState.GasPricesController.gasPriceData).reduce(
            (_, cv) => {
                const gasPriceData = persistedState.GasPricesController
                    .gasPriceData[Number(cv)] as any;

                const getGasData = (obj: any, level: string, type: string) => {
                    if (!('gasPrices' in obj)) {
                        return null;
                    }

                    if (!(level in obj['gasPrices'])) {
                        return null;
                    }

                    if (!(type in obj['gasPrices'][level])) {
                        return null;
                    }

                    return BigNumber.from(obj['gasPrices'][level][type]);
                };

                gasPriceControllerObject.gasPriceData[Number(cv)] = {
                    blockGasLimit: BigNumber.from(0),
                    baseFee: undefined,
                    estimatedBaseFee: undefined,
                    gasPricesLevels: {
                        slow: {
                            gasPrice: getGasData(
                                gasPriceData,
                                'slow',
                                'gasPrice'
                            ),
                            maxFeePerGas: getGasData(
                                gasPriceData,
                                'slow',
                                'maxFeePerGas'
                            ),
                            maxPriorityFeePerGas: getGasData(
                                gasPriceData,
                                'slow',
                                'maxPriorityFeePerGas'
                            ),
                            lastBaseFeePerGas: null,
                        },
                        average: {
                            gasPrice: getGasData(
                                gasPriceData,
                                'average',
                                'gasPrice'
                            ),
                            maxFeePerGas: getGasData(
                                gasPriceData,
                                'average',
                                'maxFeePerGas'
                            ),
                            maxPriorityFeePerGas: getGasData(
                                gasPriceData,
                                'average',
                                'maxPriorityFeePerGas'
                            ),
                            lastBaseFeePerGas: null,
                        },
                        fast: {
                            gasPrice: getGasData(
                                gasPriceData,
                                'fast',
                                'gasPrice'
                            ),
                            maxFeePerGas: getGasData(
                                gasPriceData,
                                'fast',
                                'maxFeePerGas'
                            ),
                            maxPriorityFeePerGas: getGasData(
                                gasPriceData,
                                'fast',
                                'maxPriorityFeePerGas'
                            ),
                            lastBaseFeePerGas: null,
                        },
                    },
                };
                return '';
            },
            ''
        );

        return {
            ...persistedState,
            GasPricesController: { ...gasPriceControllerObject },
            NetworkController: {
                ...persistedState.NetworkController,
                isEIP1559Compatible: {},
            },
        };
    },
    // Migration version must match new bumped package.json version
    version: '0.1.8',
} as IMigration;
