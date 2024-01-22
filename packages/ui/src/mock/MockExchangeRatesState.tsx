import { FunctionComponent, useState } from "react"
import { SubscriptionContext } from "../context/background/useStateSubscription"
import { ResponseGetExchangeRatesState } from "@block-wallet/background/utils/types/communication"
import {
    ExchangeRatesContext,
    defaultState,
} from "../context/background/useExchangeRatesState"

export const initExchangeRatesState: SubscriptionContext<ResponseGetExchangeRatesState> =
    {
        isLoading: false,
        state: defaultState,
    }

const MockExchangeRatesState: FunctionComponent<{
    assignExchangeRatesState?: Partial<ResponseGetExchangeRatesState>
    children: React.ReactNode | undefined
}> = ({ assignExchangeRatesState = {}, children }) => {
    const [state] = useState({
        ...initExchangeRatesState.state,
        ...assignExchangeRatesState,
    })

    return (
        <ExchangeRatesContext.Provider
            value={{
                state: state,
                isLoading: false,
            }}
        >
            {children}
        </ExchangeRatesContext.Provider>
    )
}

export default MockExchangeRatesState
