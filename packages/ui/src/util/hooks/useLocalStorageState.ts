import { useCallback, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import useWindowId from "../../context/hooks/useWindowId"
import {
    generateVolatileLocalStorageKey,
    retrieveLocalStorageItem,
    saveLocalStorageItem,
} from "../localSotrage"

interface Options<T> {
    initialValue: T | undefined
    volatile?: boolean
    ttl?: number //in millis
}

const defaultOptions: Options<any> = {
    initialValue: {},
    volatile: true,
}

/**
 * This hook persist the state in the window.localStorage and takes care of keeping that synchronization.
 * Every window.localStorage item is going to be tied to the current windowId where the wallet is currently running.
 *
 * By default, we will asume that you want to sotre volatile data here, so that a prefix a `volatile.`
 * will be appended to the key. You can turn it off by specifying the option `volatile: false`.
 * Volatile keys are erased once you change the `history.location`.
 *
 *
 * @param key the key you want to use to store the info in the window.localStorage. This value can be modified depending on the blockWalletState option value.
 * @param stateOptions
 * @returns [state,setState]
 */
function useLocalStorageState<T>(key: string, stateOptions: Options<T>) {
    const { initialValue, volatile, ttl } = {
        ...defaultOptions,
        ...stateOptions,
    }
    const { windowId } = useWindowId()
    const history = useHistory()

    const storageKey = volatile ? generateVolatileLocalStorageKey(key) : key

    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [state, setState] = useState(() => {
        const data = retrieveLocalStorageItem(storageKey, windowId, ttl)
        if (!data) {
            saveLocalStorageItem(storageKey, initialValue, windowId)
            return initialValue
        }
        return data
    })
    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = useCallback(
        (value: T | null) => {
            try {
                // Allow value to be a function so we have same API as useState
                const valueToStore =
                    value instanceof Function ? value(state) : value
                // Save state
                setState(valueToStore)
                // Save to local storage
                saveLocalStorageItem(storageKey, valueToStore, windowId)
            } catch (error) {
                // A more advanced implementation would handle the error case
                console.log(error)
            }
        },
        [windowId, state, storageKey]
    )

    useEffect(() => {
        let unlisten: any = null
        if (volatile) {
            unlisten = history.listen(() => {
                setValue(null)
            })
        }
        return () => {
            if (unlisten) {
                unlisten()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return [state, setValue]
}

export default useLocalStorageState
