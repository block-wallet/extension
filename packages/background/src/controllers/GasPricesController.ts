import { BaseController } from '../infrastructure/BaseController';
import NetworkController, { NetworkEvents } from './NetworkController';
import { BigNumber, ethers, utils } from 'ethers';
import log from 'loglevel';
import { Mutex } from 'async-mutex';
import {
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
    Network,
} from '../utils/constants/networks';
import { FeeData } from '@ethersproject/abstract-provider';
import { ActionIntervalController } from './block-updates/ActionIntervalController';
import BlockUpdatesController, {
    BlockUpdatesEvents,
} from './block-updates/BlockUpdatesController';
import httpClient from '../utils/http';

const CHAIN_FEE_DATA_SERVICE_URL = 'https://chain-fee.blockwallet.io/v1';
const BLOCKS_TO_WAIT_BEFORE_CHECKING_FOR_CHAIN_SUPPORT = 100;

export enum GasPriceLevelsEnum {
    SLOW = 'slow',
    AVERAGE = 'average',
    FAST = 'fast',
}

/**
 * The levels of gas price in WEI
 */
export type GasPriceLevels = {
    slow: FeeData;
    average: FeeData;
    fast: FeeData;
};

export interface GasPriceData {
    gasPricesLevels: GasPriceLevels;
    blockGasLimit: BigNumber;
    baseFee?: BigNumber;
    estimatedBaseFee?: BigNumber;
    chainSupportedByFeeService?: {
        lastBlockChecked: number;
        supported: boolean;
    };
}

export interface GasPricesControllerState {
    gasPriceData: { [chainId: number]: GasPriceData };
}

export interface FeeHistory {
    baseFeePerGas: string[];
    gasUsedRatio: number[];
    oldestBlock: number;
    reward?: string[][];
}

export type FeeDataResponse =
    | {
          blockNumber: string;
          baseFee: string;
          blockGasLimit: string;
          estimatedBaseFee: string;
          gasPricesLevels: {
              slow: {
                  maxFeePerGas: string;
                  maxPriorityFeePerGas: string;
                  gasPrice: string;
              };
              average: {
                  maxFeePerGas: string;
                  maxPriorityFeePerGas: string;
                  gasPrice: string;
              };
              fast: {
                  maxFeePerGas: string;
                  maxPriorityFeePerGas: string;
                  gasPrice: string;
              };
          };
      }
    | {
          blockNumber: string;
          blockGasLimit: string;
          gasPricesLevels: {
              slow: {
                  gasPrice: string;
              };
              average: {
                  gasPrice: string;
              };
              fast: {
                  gasPrice: string;
              };
          };
      };

const expirationTime = 75000;
export class GasPricesController extends BaseController<GasPricesControllerState> {
    private readonly _gasPriceUpdateIntervalController: ActionIntervalController;
    private readonly _mutex: Mutex;
    private expiration: number;

    constructor(
        private readonly _networkController: NetworkController,
        private readonly _blockUpdatesController: BlockUpdatesController,
        initialState: GasPricesControllerState
    ) {
        super(initialState);

        this._mutex = new Mutex();
        this._gasPriceUpdateIntervalController = new ActionIntervalController(
            this._networkController
        );

        // Set for expiration policy
        this.expiration = new Date().getTime();
        this._networkController.on(
            NetworkEvents.NETWORK_CHANGE,
            async (network: Network) => {
                this.updateGasPrices(network.chainId);
            }
        );

        // Subscription to new blocks
        this._blockUpdatesController.on(
            BlockUpdatesEvents.BLOCK_UPDATES_SUBSCRIPTION,
            async (chainId: number, _: number, newBlockNumber: number) => {
                const network =
                    this._networkController.getNetworkFromChainId(chainId);
                const interval =
                    network?.actionsTimeIntervals.gasPricesUpdate ||
                    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES.gasPricesUpdate;

                this._gasPriceUpdateIntervalController.tick(
                    interval,
                    async () => {
                        await this.updateGasPrices(newBlockNumber, chainId);
                    }
                );
            }
        );
    }

    /**
     * return the state by chain
     */
    public getState(
        chainId: number = this._networkController.network.chainId
    ): GasPriceData {
        const state = this.store.getState();

        if (chainId in state.gasPriceData) {
            return state.gasPriceData[chainId];
        }

        return {
            blockGasLimit: BigNumber.from(0),
            gasPricesLevels: { slow: {}, average: {}, fast: {} },
        } as GasPriceData;
    }

    /**
     * Get latest fee data
     */
    public getFeeData(chainId?: number): FeeData {
        return this.getState(chainId).gasPricesLevels.average;
    }

    /**
     * Get latest gas prices levels
     */
    public getGasPricesLevels(chainId?: number): GasPriceLevels {
        return this.getState(chainId).gasPricesLevels;
    }

    /**
     * It updates the state with the current gas prices following
     * a 5% variation and expiration policy
     */
    public updateGasPrices = async (
        currentBlockNumber: number,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> => {
        try {
            const oldGasPriceLevels = this.getGasPricesLevels(chainId);
            const isEIP1559Compatible =
                await this._networkController.getEIP1559Compatibility(chainId);

            const newGasPriceLevels = await this._fetchFeeData(
                isEIP1559Compatible,
                oldGasPriceLevels,
                currentBlockNumber,
                chainId
            );

            const time = new Date().getTime();
            if (time - this.expiration > expirationTime) {
                await this._updateState(chainId, {
                    gasPricesLevels: newGasPriceLevels,
                });
                this.expiration = time;
                return;
            }

            const shouldUpdate = Object.entries(newGasPriceLevels).reduce(
                (pv, [level, feeData]) => {
                    if (pv !== true) {
                        let newValue: number;
                        let oldValue: number;

                        if (isEIP1559Compatible) {
                            const oldGasPrice =
                                oldGasPriceLevels[level as keyof GasPriceLevels]
                                    .maxPriorityFeePerGas || '0';

                            newValue = Number(
                                utils.formatEther(
                                    feeData.maxPriorityFeePerGas || '0'
                                )
                            );
                            oldValue = Number(utils.formatEther(oldGasPrice));
                        } else {
                            const oldGasPrice =
                                oldGasPriceLevels[level as keyof GasPriceLevels]
                                    .gasPrice || '0';

                            newValue = Number(
                                utils.formatEther(feeData.gasPrice || '0')
                            );
                            oldValue = Number(utils.formatEther(oldGasPrice));
                        }

                        /* oldValue will be 0, if previous stored gas is incompatible with
                                      current network (e.g. due toEIP1559) */
                        if (oldValue == 0) {
                            return true;
                        }

                        const diff = Math.abs(newValue - oldValue) / oldValue;

                        return diff > 0.05;
                    }
                    return true;
                },
                false
            );

            if (shouldUpdate) {
                await this._updateState(chainId, {
                    gasPricesLevels: newGasPriceLevels,
                });
            }
        } catch (error) {
            log.warn('Unable to update the gas prices', error.message || error);
        }
    };

    /**
     * Fetches the blockchain to get the current gas prices.
     *
     * @param chainId
     * @param isEIP1559Compatible
     * @returns GasPriceData
     */
    private async _fetchFeeDataFromChain(
        chainId: number,
        isEIP1559Compatible: boolean,
        //required by parameter to avoid returning undefined if the user hasn't added the chain
        //previous check should be done before invoking this method.
        provider: ethers.providers.StaticJsonRpcProvider = this._networkController.getProvider()
    ): Promise<GasPriceData> {
        let gasPriceData: GasPriceData = {} as GasPriceData;

        if (
            this._isEth_feeHistorySupportedByChain(chainId, isEIP1559Compatible)
        ) {
            const latestBlock = await this._networkController.getLatestBlock(
                provider
            );

            // Get gasLimit of the last block
            const blockGasLimit: BigNumber = BigNumber.from(
                latestBlock.gasLimit
            );

            // Get blockBaseFee of the last block
            const blockBaseFee: BigNumber = BigNumber.from(
                latestBlock.baseFeePerGas
            );

            // Get eth_feeHistory
            // gets 10%, 25% and 50% percentile fee history of txs included in last 5 blocks
            const feeHistory: FeeHistory = await provider.send(
                'eth_feeHistory',
                ['0x5', 'latest', [10, 25, 65]]
            );

            // last element in array is the next block after the latest (estimated)
            let estimatedBaseFee = blockBaseFee;
            if (feeHistory.baseFeePerGas) {
                estimatedBaseFee = BigNumber.from(
                    feeHistory.baseFeePerGas[
                        feeHistory.baseFeePerGas.length - 1
                    ]
                );
            }

            const rewardsSlow: BigNumber[] = [];
            const rewardsAverage: BigNumber[] = [];
            const rewardsFast: BigNumber[] = [];

            // add all rewards to rewards array
            if (feeHistory.reward) {
                for (let i = 0; i < feeHistory.reward.length; i++) {
                    rewardsSlow.push(BigNumber.from(feeHistory.reward[i][0]));
                    rewardsAverage.push(
                        BigNumber.from(feeHistory.reward[i][1])
                    );
                    rewardsFast.push(BigNumber.from(feeHistory.reward[i][2]));
                }
            }

            // sort rewards array lowest to highest
            rewardsSlow.sort();
            rewardsAverage.sort();
            rewardsFast.sort();

            // choose middle tip as suggested tip
            const maxPriorityFeePerGasSlow = rewardsSlow[0];
            const maxPriorityFeePerGasAverage =
                rewardsAverage[Math.floor(rewardsAverage.length / 2)];
            const maxPriorityFeePerGasFast =
                rewardsFast[rewardsFast.length - 1];

            const maxFeePerGasSlow = BigNumber.from(
                maxPriorityFeePerGasSlow
            ).add(estimatedBaseFee);
            const maxFeePerGasAverage = BigNumber.from(
                maxPriorityFeePerGasAverage
            ).add(estimatedBaseFee);
            const maxFeePerGasFast = BigNumber.from(
                maxPriorityFeePerGasFast
            ).add(estimatedBaseFee);

            // Parsing the gas result considering the EIP1559 status
            gasPriceData = {
                blockGasLimit: blockGasLimit,
                baseFee: BigNumber.from(blockBaseFee),
                estimatedBaseFee: BigNumber.from(estimatedBaseFee),
                gasPricesLevels: {
                    slow: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from(maxFeePerGasSlow),
                        maxPriorityFeePerGas: BigNumber.from(
                            maxPriorityFeePerGasSlow
                        ),
                        lastBaseFeePerGas: BigNumber.from(blockBaseFee),
                    },
                    average: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from(maxFeePerGasAverage),
                        maxPriorityFeePerGas: BigNumber.from(
                            maxPriorityFeePerGasAverage
                        ),
                        lastBaseFeePerGas: BigNumber.from(blockBaseFee),
                    },
                    fast: {
                        gasPrice: null,
                        maxFeePerGas: BigNumber.from(maxFeePerGasFast),
                        maxPriorityFeePerGas: BigNumber.from(
                            maxPriorityFeePerGasFast
                        ),
                        lastBaseFeePerGas: BigNumber.from(blockBaseFee),
                    },
                },
            };
        } else {
            const latestBlock = await this._networkController.getLatestBlock(
                provider
            );

            // Get gasLimit of the last block
            const blockGasLimit = latestBlock.gasLimit;

            // Get current gas price
            const gasPrice: BigNumber = BigNumber.from(
                await provider.getGasPrice()
            );

            const gasPriceSlow = gasPrice.mul(85).div(100);
            const gasPriceAverage = gasPrice;
            const gasPriceFast = gasPrice.mul(125).div(100);

            // Parsing the gas result considering the EIP1559 status
            gasPriceData = {
                blockGasLimit: blockGasLimit,
                gasPricesLevels: {
                    slow: {
                        gasPrice: BigNumber.from(gasPriceSlow),
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                        lastBaseFeePerGas: null,
                    },
                    average: {
                        gasPrice: BigNumber.from(gasPriceAverage),
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                        lastBaseFeePerGas: null,
                    },
                    fast: {
                        gasPrice: BigNumber.from(gasPriceFast),
                        maxFeePerGas: null,
                        maxPriorityFeePerGas: null,
                        lastBaseFeePerGas: null,
                    },
                },
            };
        }
        return gasPriceData;
    }

    /**
     * Fetches the fee's service to get the current gas prices.
     *
     * @param chainId
     * @param isEIP1559Compatible
     * @returns GasPriceData or undefined
     */
    private async _fetchFeeDataFromService(
        chainId: number,
        isEIP1559Compatible: boolean
    ): Promise<GasPriceData | undefined> {
        let gasPriceData: GasPriceData = {} as GasPriceData;

        // Fetch the service to detect if the chain has support.
        try {
            // If the chain has support request the service
            const feeDataResponse = await httpClient.get<FeeDataResponse>(
                `${CHAIN_FEE_DATA_SERVICE_URL}/fee_data`,
                {
                    c: chainId,
                }
            );

            if (feeDataResponse) {
                // Parsing the gas result considering the EIP1559 status
                // for the case of fantom(250) we will detect that the network is EIP1559 but the service
                // won't return gas with that format because eth_feeHistory is not available.
                if (
                    isEIP1559Compatible &&
                    'baseFee' in feeDataResponse &&
                    feeDataResponse.baseFee
                ) {
                    gasPriceData = {
                        blockGasLimit: BigNumber.from(
                            feeDataResponse.blockGasLimit
                        ),
                        baseFee: BigNumber.from(feeDataResponse.baseFee),
                        estimatedBaseFee: BigNumber.from(
                            feeDataResponse.estimatedBaseFee
                        ),
                        gasPricesLevels: {
                            slow: {
                                gasPrice: null,
                                maxFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.slow
                                        .maxFeePerGas
                                ),
                                maxPriorityFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.slow
                                        .maxPriorityFeePerGas
                                ),
                                lastBaseFeePerGas: BigNumber.from(
                                    feeDataResponse.baseFee
                                ),
                            },
                            average: {
                                gasPrice: null,
                                maxFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.average
                                        .maxFeePerGas
                                ),
                                maxPriorityFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.average
                                        .maxPriorityFeePerGas
                                ),
                                lastBaseFeePerGas: BigNumber.from(
                                    feeDataResponse.baseFee
                                ),
                            },
                            fast: {
                                gasPrice: null,
                                maxFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.fast
                                        .maxFeePerGas
                                ),
                                maxPriorityFeePerGas: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.fast
                                        .maxPriorityFeePerGas
                                ),
                                lastBaseFeePerGas: BigNumber.from(
                                    feeDataResponse.baseFee
                                ),
                            },
                        },
                    };
                } else {
                    gasPriceData = {
                        blockGasLimit: BigNumber.from(
                            feeDataResponse.blockGasLimit
                        ),
                        gasPricesLevels: {
                            slow: {
                                gasPrice: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.slow
                                        .gasPrice
                                ),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                            average: {
                                gasPrice: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.average
                                        .gasPrice
                                ),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                            fast: {
                                gasPrice: BigNumber.from(
                                    feeDataResponse.gasPricesLevels.fast
                                        .gasPrice
                                ),
                                maxFeePerGas: null,
                                maxPriorityFeePerGas: null,
                                lastBaseFeePerGas: null,
                            },
                        },
                    };
                }

                return gasPriceData;
            }
        } catch (error) {
            log.error('error calling chain fees service', error);
            return undefined;
        }
        return undefined;
    }

    /**
     * Fetches the fee's service to get the current gas prices.
     * If the service is not available or the chain is not supported then
     * it requests the chain.
     *
     * @param isEIP1559Compatible
     * @param fallbackGasPrices
     * @param chainId
     * @returns GasPriceLevels
     */
    private async _fetchFeeData(
        isEIP1559Compatible: boolean,
        fallbackGasPrices: GasPriceLevels,
        currentBlockNumber: number,
        chainId: number = this._networkController.network.chainId
    ): Promise<GasPriceLevels> {
        try {
            let gasPriceData: GasPriceData = {} as GasPriceData;
            let hasToRequestTheChain = false;

            // Fetch the service to detect if the chain has support.

            if (this._shouldRequestChainService(currentBlockNumber, chainId)) {
                const gasPriceFromChainFeeService =
                    await this._fetchFeeDataFromService(
                        chainId,
                        isEIP1559Compatible
                    );
                if (gasPriceFromChainFeeService === undefined) {
                    hasToRequestTheChain = true;
                } else {
                    gasPriceData = gasPriceFromChainFeeService;
                }
            } else {
                hasToRequestTheChain = true;
            }

            // If it has no support or the service fails we have to query the chain.
            if (hasToRequestTheChain) {
                gasPriceData = await this._fetchFeeDataFromChain(
                    chainId,
                    isEIP1559Compatible
                );
            }

            // Filtering gas prices
            gasPriceData = this._ensureLowerPrices(chainId, gasPriceData);

            // Storing in the state the fee data, not the levels
            await this._updateState(chainId, {
                blockGasLimit: gasPriceData.blockGasLimit,
                baseFee: gasPriceData.baseFee,
                estimatedBaseFee: gasPriceData.estimatedBaseFee,
                chainSupportedByFeeService: {
                    lastBlockChecked: currentBlockNumber,
                    supported: !hasToRequestTheChain,
                },
            });

            // Returning the gas levels
            return gasPriceData.gasPricesLevels;
        } catch (e) {
            log.error(e);
            return fallbackGasPrices;
        }
    }

    /**
     * Returns if the method eth_feeHistory is supported by the chain
     * @param chainId
     * @param isEIP1559Compatible
     * @returns
     */
    private _isEth_feeHistorySupportedByChain(
        chainId: number,
        isEIP1559Compatible: boolean
    ) {
        switch (chainId) {
            case 250:
                return false;
            default:
                return isEIP1559Compatible;
        }
    }

    /**
     * This method ensures that all the gas prices are above the chain lower cap if it exists.
     * @param chainId
     * @param gasPrices
     * @returns a corrected gas prices
     */
    private _ensureLowerPrices(
        chainId: number,
        gasPriceData: GasPriceData
    ): GasPriceData {
        const network = this._networkController.getNetworkFromChainId(chainId);
        if (!network) {
            return gasPriceData;
        }

        const { gasLowerCap } = network;
        if (!gasLowerCap) {
            return gasPriceData;
        }

        // baseFee
        if (gasLowerCap.baseFee) {
            if (gasPriceData.baseFee) {
                if (
                    BigNumber.from(gasLowerCap.baseFee).gt(
                        BigNumber.from(gasPriceData.baseFee)
                    )
                ) {
                    gasPriceData.baseFee = BigNumber.from(gasLowerCap.baseFee);
                }
            }
            if (gasPriceData.estimatedBaseFee) {
                if (
                    BigNumber.from(gasLowerCap.baseFee).gt(
                        BigNumber.from(gasPriceData.estimatedBaseFee)
                    )
                ) {
                    gasPriceData.estimatedBaseFee = BigNumber.from(
                        gasLowerCap.baseFee
                    );
                }
            }
        }

        // maxPriorityFee
        if (gasLowerCap.maxPriorityFeePerGas) {
            // maxFeePerGas
            if (gasPriceData.gasPricesLevels.slow.maxFeePerGas) {
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.slow.maxFeePerGas
                        )
                    )
                ) {
                    // If slow is lower than the lower cap we fix it.
                    gasPriceData.gasPricesLevels.slow.maxFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);
                }
            }

            if (gasPriceData.gasPricesLevels.average.maxFeePerGas) {
                // If average is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.average.maxFeePerGas
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.average.maxFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);

                    if (gasPriceData.gasPricesLevels.slow.maxFeePerGas) {
                        // If average is lower or equal than slow we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.average
                                    .maxFeePerGas
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow
                                        .maxFeePerGas
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.average.maxFeePerGas =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow
                                        .maxFeePerGas
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }

            if (gasPriceData.gasPricesLevels.fast.maxFeePerGas) {
                // If fast is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.fast.maxFeePerGas
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.fast.maxFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);

                    if (gasPriceData.gasPricesLevels.average.maxFeePerGas) {
                        // If fast is lower or equal than average we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.fast.maxFeePerGas
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .maxFeePerGas
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.fast.maxFeePerGas =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .maxFeePerGas
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }

            // maxPriorityFeePerGas
            if (gasPriceData.gasPricesLevels.slow.maxPriorityFeePerGas) {
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.slow
                                .maxPriorityFeePerGas
                        )
                    )
                ) {
                    // If slow is lower than the lower cap we fix it.
                    gasPriceData.gasPricesLevels.slow.maxPriorityFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);
                }
            }

            if (gasPriceData.gasPricesLevels.average.maxPriorityFeePerGas) {
                // If average is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.average
                                .maxPriorityFeePerGas
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.average.maxPriorityFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);

                    if (
                        gasPriceData.gasPricesLevels.slow.maxPriorityFeePerGas
                    ) {
                        // If average is lower or equal than slow we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.average
                                    .maxPriorityFeePerGas
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow
                                        .maxPriorityFeePerGas
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.average.maxPriorityFeePerGas =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow
                                        .maxPriorityFeePerGas
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }

            if (gasPriceData.gasPricesLevels.fast.maxPriorityFeePerGas) {
                // If fast is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.maxPriorityFeePerGas).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.fast
                                .maxPriorityFeePerGas
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.fast.maxPriorityFeePerGas =
                        BigNumber.from(gasLowerCap.maxPriorityFeePerGas);

                    if (
                        gasPriceData.gasPricesLevels.average
                            .maxPriorityFeePerGas
                    ) {
                        // If fast is lower or equal than average we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.fast
                                    .maxPriorityFeePerGas
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .maxPriorityFeePerGas
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.fast.maxPriorityFeePerGas =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .maxPriorityFeePerGas
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }
        }

        // gasPrice
        if (gasLowerCap.gasPrice) {
            if (gasPriceData.gasPricesLevels.slow.gasPrice) {
                if (
                    BigNumber.from(gasLowerCap.gasPrice).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.slow.gasPrice
                        )
                    )
                ) {
                    // If slow is lower than the lower cap we fix it.
                    gasPriceData.gasPricesLevels.slow.gasPrice = BigNumber.from(
                        gasLowerCap.gasPrice
                    );
                }
            }

            if (gasPriceData.gasPricesLevels.average.gasPrice) {
                // If average is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.gasPrice).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.average.gasPrice
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.average.gasPrice =
                        BigNumber.from(gasLowerCap.gasPrice);

                    if (gasPriceData.gasPricesLevels.slow.gasPrice) {
                        // If average is lower or equal than slow we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.average.gasPrice
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow.gasPrice
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.average.gasPrice =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.slow.gasPrice
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }

            if (gasPriceData.gasPricesLevels.fast.gasPrice) {
                // If fast is lower than the lower cap we fix it.
                if (
                    BigNumber.from(gasLowerCap.gasPrice).gt(
                        BigNumber.from(
                            gasPriceData.gasPricesLevels.fast.gasPrice
                        )
                    )
                ) {
                    gasPriceData.gasPricesLevels.fast.gasPrice = BigNumber.from(
                        gasLowerCap.gasPrice
                    );

                    if (gasPriceData.gasPricesLevels.average.gasPrice) {
                        // If fast is lower or equal than average we increment it.
                        if (
                            BigNumber.from(
                                gasPriceData.gasPricesLevels.fast.gasPrice
                            ).lte(
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .gasPrice
                                )
                            )
                        ) {
                            gasPriceData.gasPricesLevels.fast.gasPrice =
                                BigNumber.from(
                                    gasPriceData.gasPricesLevels.average
                                        .gasPrice
                                )
                                    .mul(125)
                                    .div(100);
                        }
                    }
                }
            }
        }

        return gasPriceData;
    }

    /**
     * update the state by chain
     */
    private async _updateState(
        chainId: number = this._networkController.network.chainId,
        gasPriceData: Partial<GasPriceData>
    ) {
        const releaseLock = await this._mutex.acquire();

        try {
            const state = this.store.getState();

            const currentChainGasPriceData = {
                ...state.gasPriceData[chainId],
                ...gasPriceData,
            };

            this.store.setState({
                ...state,
                gasPriceData: {
                    ...state.gasPriceData,
                    [chainId]: currentChainGasPriceData,
                },
            });
        } finally {
            releaseLock();
        }
    }

    /**
     * Decides if the fee service should be requested.
     * It should be requested in these cases:
     *  - There is no information about the chain
     *  - The chain is already supported
     *  - There is a gap higher than BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT between
     *    the current block and the block of the moment of the last update
     * @param currentBlockNumber
     * @param chainId
     * @returns
     */
    private _shouldRequestChainService(
        currentBlockNumber: number,
        chainId?: number
    ): boolean {
        const { chainSupportedByFeeService } = this.getState(chainId);

        if (!chainSupportedByFeeService) {
            return true;
        }

        if (chainSupportedByFeeService.supported) {
            return true;
        }

        return (
            currentBlockNumber - chainSupportedByFeeService.lastBlockChecked >
            BLOCKS_TO_WAIT_BEFORE_CHECKING_FOR_CHAIN_SUPPORT
        );
    }

    public async fetchGasPriceData(
        chainId: number
    ): Promise<GasPriceData | undefined> {
        const provider = this._networkController.getProviderForChainId(chainId);

        if (!provider) {
            return undefined;
        }

        const isEIP1559Compatible =
            await this._networkController.getEIP1559Compatibility(
                chainId,
                false,
                provider
            );
        let gasPriceData: GasPriceData | undefined = undefined;

        const { chainSupportedByFeeService } = this.getState(chainId);
        try {
            if (
                !chainSupportedByFeeService ||
                chainSupportedByFeeService.supported
            ) {
                const gasPriceFromChainFeeService =
                    await this._fetchFeeDataFromService(
                        chainId,
                        isEIP1559Compatible
                    );
                if (gasPriceFromChainFeeService !== undefined) {
                    gasPriceData = gasPriceFromChainFeeService;
                }
            }

            if (!gasPriceData) {
                if (provider) {
                    gasPriceData = await this._fetchFeeDataFromChain(
                        chainId,
                        isEIP1559Compatible
                    );
                }
            }
        } catch (e) {
            log.error(e);
            return undefined;
        }
        return gasPriceData
            ? this._ensureLowerPrices(chainId, gasPriceData)
            : undefined;
    }
}
