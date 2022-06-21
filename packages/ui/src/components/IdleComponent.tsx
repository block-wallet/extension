import React from "react"
import { FunctionComponent } from "react"
import IdleTimer from "react-idle-timer"
import { setLastUserActiveTime } from "../context/commActions"

const IdleComponent: FunctionComponent = ({ children }) => {
    let idleTimer: IdleTimer = {} as IdleTimer

    const handleOnAction = async () => {
        setLastUserActiveTime()
    }

    return (
        <IdleTimer
            ref={(ref: IdleTimer) => {
                idleTimer = ref
            }}
            onAction={handleOnAction}
            debounce={1000}
            eventsThrottle={200}
        >
            {children}
        </IdleTimer>
    )
}

export default IdleComponent
