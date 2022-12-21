import { FunctionComponent, useState } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { SubscriptionContext } from "../context/background/useStateSubscription"
import { ResponseGetGasPricesState } from "@block-wallet/background/utils/types/communication"
import { GasPricesContext } from "../context/background/useGasPricesState"

export const initGasPricesState: SubscriptionContext<ResponseGetGasPricesState> =
    {
        isLoading: false,
        state: {
            gasPriceData: {
                5: {
                    blockGasLimit: BigNumber.from(0),
                    estimatedBaseFee: BigNumber.from(0),
                    gasPricesLevels: {
                        slow: {
                            gasPrice: BigNumber.from(111111111110),
                            maxPriorityFeePerGas: BigNumber.from(0),
                            maxFeePerGas: BigNumber.from(0),
                            lastBaseFeePerGas: null,
                        },
                        average: {
                            gasPrice: BigNumber.from(111111111110),
                            maxPriorityFeePerGas: BigNumber.from(0),
                            maxFeePerGas: BigNumber.from(0),
                            lastBaseFeePerGas: null,
                        },
                        fast: {
                            gasPrice: BigNumber.from(111111111110),
                            maxPriorityFeePerGas: BigNumber.from(0),
                            maxFeePerGas: BigNumber.from(0),
                            lastBaseFeePerGas: null,
                        },
                    },
                    baseFee: BigNumber.from("0x02540be400"),
                },
            },
        },
    }

const MockGasPricesState: FunctionComponent<{
    assignGasPricesState?: Partial<ResponseGetGasPricesState>
    children: React.ReactNode | undefined
}> = ({ assignGasPricesState = {}, children }) => {
    const [state] = useState({
        ...initGasPricesState.state,
        ...assignGasPricesState,
    })

    return (
        <GasPricesContext.Provider
            value={{
                state: state,
                isLoading: false,
            }}
        >
            {children}
        </GasPricesContext.Provider>
    )
}

export default MockGasPricesState
