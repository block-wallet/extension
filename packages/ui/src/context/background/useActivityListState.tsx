import { createContext, FC, ReactNode, useContext } from "react"
import {
    getActivityListState,
    subscribeActivityListState,
} from "../commActions"
import {
    ResponseGetActivityListState,
    ResponseGetGasPricesState,
} from "@block-wallet/background/utils/types/communication"
import useSubscription, { SubscriptionContext } from "./useStateSubscription"

type ContextType = SubscriptionContext<ResponseGetActivityListState>

const defaultState = { activityList: { pending: [], confirmed: [] } }
const ActivityListContext = createContext<ContextType>({
    state: defaultState,
    isLoading: false,
})

export const ActivityListStateProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    const state = useSubscription<ResponseGetActivityListState>(
        //state getter
        getActivityListState,
        //state subcriber
        subscribeActivityListState,
        //inital state
        defaultState,
        { name: "ActivityList" }
    )

    return (
        <ActivityListContext.Provider value={state}>
            {children}
        </ActivityListContext.Provider>
    )
}

export const useActivityListState = () => {
    return useContext(ActivityListContext) as ContextType
}
