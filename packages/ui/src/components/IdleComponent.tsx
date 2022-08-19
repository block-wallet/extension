import { useIdleTimer } from "react-idle-timer"
import { setLastUserActiveTime } from "../context/commActions"

const IdleComponent = ({ children }: { children: React.ReactNode }) => {
    const handleOnAction = async () => {
        setLastUserActiveTime()
    }

    useIdleTimer({
        onAction: handleOnAction,
        debounce: 1000,
        eventsThrottle: 200,
    })

    return <>{children}</>
}

export default IdleComponent
