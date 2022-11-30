import { createContext, FC, ReactNode, useContext } from "react"
import {
    getExchangeRatesState,
    subscribeExchangeRatesState,
} from "../commActions"
import { ResponseGetExchangeRatesState } from "@block-wallet/background/utils/types/communication"
import useSubscription, { SubscriptionContext } from "./useStateSubscription"

type ExchangeRatesContextType =
    SubscriptionContext<ResponseGetExchangeRatesState>

const defualtState = {
    exchangeRates: {},
    networkNativeCurrency: {
        symbol: "ETH",
        // Default Coingecko id for ETH rates
        coingeckoPlatformId: "ethereum",
    },
    isRatesChangingAfterNetworkChange: false,
}

const ExchangeRatesContext = createContext<ExchangeRatesContextType>({
    isLoading: false,
    state: defualtState,
})

export const ExchangeRatesStateProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    const state = useSubscription<ResponseGetExchangeRatesState>(
        //state getter
        getExchangeRatesState,
        //state subcriber
        subscribeExchangeRatesState,
        //inital state
        defualtState,
        { name: "Exchange rates" }
    )
    return (
        <ExchangeRatesContext.Provider value={state}>
            {children}
        </ExchangeRatesContext.Provider>
    )
}

export const useExchangeRatesState = () => {
    return useContext(ExchangeRatesContext) as ExchangeRatesContextType
}
