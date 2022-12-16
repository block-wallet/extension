import { Messages } from "../commTypes"
import BackgroundReducer from "./backgroundReducer"
import { useReducer, useEffect } from "react"
import {
    subscribeState,
    getState,
    subscribeNetworkStatus,
} from "../commActions"
import BackgroundContext, { initBackgroundState } from "./backgroundContext"
import { isPortConnected } from "../setup"

let isContextInit = false

const BackgroundState = (props: any) => {
    const [state, dispatch] = useReducer(BackgroundReducer, initBackgroundState)

    useEffect(() => {
        initContext()
        // eslint-disable-next-line
    }, [])

    const initContext = async () => {
        if (!isPortConnected) {
            setTimeout(initContext, 100)
        } else {
            if (!isContextInit) {
                // Get initial state and dispatch
                const initialState = await getState()
                dispatch({
                    type: Messages.STATE.SUBSCRIBE,
                    payload: initialState,
                })

                // Subscribe to state updates
                subscribeState((state) => {
                    dispatch({
                        type: Messages.STATE.SUBSCRIBE,
                        payload: state,
                    })
                })

                // Subscribe to network status
                subscribeNetworkStatus()

                // Set context as initialized
                isContextInit = true
            }
        }
    }

    return (
        <BackgroundContext.Provider
            value={{
                blankState: state.blankState,
            }}
        >
            {props.children}
        </BackgroundContext.Provider>
    )
}

export default BackgroundState
