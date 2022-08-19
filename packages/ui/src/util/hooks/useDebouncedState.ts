import { useState, useRef, useEffect, useCallback } from "react"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../constants"

const removeTiemout = (timeoutId?: NodeJS.Timeout) => {
    if (timeoutId) {
        clearTimeout(timeoutId)
    }
}

/**
 * `useDebouncedState` wraps the `React.useState` by delaying the state update function execution the
 * milliseconds indicated through the `timeout` parameter.
 * @param {T} initialState state initial value
 * @param {number} timeout time in millis to debounce the state update
 * @returns [state,setState] a stateful value, and a function to update it.
 */
function useDebouncedState<T>(
    initialState: T,
    timeout = DAPP_FEEDBACK_WINDOW_TIMEOUT
): [T, (nextState: T | ((prevState: T) => T), debounce?: boolean) => void] {
    const [state, setState] = useState<T>(initialState)
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    useEffect(() => {
        return () => removeTiemout(timeoutRef.current)
    }, [])

    const setDebouncedState = useCallback(
        (nextState: T | ((prevState: T) => T), debounce = true) => {
            removeTiemout(timeoutRef.current)
            if (debounce) {
                timeoutRef.current = setTimeout(() => {
                    setState(nextState)
                }, timeout)
            } else {
                setState(nextState)
            }
        },
        [setState, timeout]
    )

    return [state, setDebouncedState]
}

export default useDebouncedState
