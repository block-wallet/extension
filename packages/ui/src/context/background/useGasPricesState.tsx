import { createContext, FC, ReactNode, useContext } from "react"
import { getGasPricesState, subscribeGasPricesState } from "../commActions"
import { ResponseGetGasPricesState } from "@block-wallet/background/utils/types/communication"
import useSubscription, { SubscriptionContext } from "./useStateSubscription"
import { AppLoading } from "../../App"

type GasPricesContextType = SubscriptionContext<ResponseGetGasPricesState>

const defaultState = { gasPriceData: {} }

export const GasPricesContext = createContext<GasPricesContextType>({
    state: defaultState,
    isLoading: true,
})

export const GasPricesStateProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    const state = useSubscription<ResponseGetGasPricesState>(
        //state getter
        getGasPricesState,
        //state subcriber
        subscribeGasPricesState,
        //inital state
        defaultState,
        {
            name: "Gas prices",
            //initializes the state as loading.
            initLoading: true,
        }
    )

    return (
        <GasPricesContext.Provider value={state}>
            {/** Multiple components of the app renders as the gas price is already loaded. */}
            {state.isLoading ? <AppLoading /> : children}
        </GasPricesContext.Provider>
    )
}

export const useGasPricesState = () => {
    return useContext(GasPricesContext) as GasPricesContextType
}
