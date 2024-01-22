import { FunctionComponent, useState } from "react"
import { SubscriptionContext } from "../context/background/useStateSubscription"
import { ResponseGetActivityListState } from "@block-wallet/background/utils/types/communication"
import {
    ActivityListContext,
    defaultState,
} from "../context/background/useActivityListState"

export const initActivityListState: SubscriptionContext<ResponseGetActivityListState> =
    {
        isLoading: false,
        state: defaultState,
    }

const MockActivityListState: FunctionComponent<{
    assignActivityListState?: Partial<ResponseGetActivityListState>
    children: React.ReactNode | undefined
}> = ({ assignActivityListState = {}, children }) => {
    const [state] = useState({
        ...initActivityListState.state,
        ...assignActivityListState,
    })

    return (
        <ActivityListContext.Provider
            value={{
                state: state,
                isLoading: false,
            }}
        >
            {children}
        </ActivityListContext.Provider>
    )
}

export default MockActivityListState
