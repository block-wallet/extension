import { useEffect } from "react"
import { useHistory } from "react-router-dom"
import { useBlankState } from "../background/backgroundHooks"

export const useCheckUserIsOnboarded = () => {
    const history = useHistory()
    const state = useBlankState()
    useEffect(() => {
        if (state?.isOnboarded) {
            history.push({
                pathname: "/setup/done",
                state: { sendNotification: false },
            })
        }
    }, [history, state?.isOnboarded])
}
