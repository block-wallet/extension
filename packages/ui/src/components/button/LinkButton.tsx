import React from "react"
import {
    useOnMountHistory,
    useOnMountLocation,
} from "../../context/hooks/useOnMount"
import { Classes, classnames } from "../../styles/classes"

const LinkButton = ({
    text = "Cancel",
    classes = "w-full",
    location = "",
    state = {},
    passState = false,
    lite = false,
    disabled = false,
}) => {
    const history = useOnMountHistory()
    const currentState = useOnMountLocation().state
    const handleTo = () => {
        if (location) {
            if (state) {
                history.push({
                    pathname: location,
                    state,
                })
            } else {
                history.push(location, passState ? currentState : undefined)
            }
        } else {
            history.goBack()
        }
    }
    return (
        <button
            onClick={handleTo}
            className={classnames(
                lite ? Classes.liteButton : Classes.darkButton,
                disabled ? "opacity-50" : "",
                classes
            )}
            type="button"
            disabled={disabled}
        >
            {text}
        </button>
    )
}

export default LinkButton
