import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import useWindowId from "../../context/hooks/useWindowId"
import {
    clearVolatileLocalStorageItems,
    generateVolatileLocalStorageKey,
    retrieveLocalStorageItem,
    saveLocalStorageItem,
} from "../localSotrage"

export interface useLocalStorageStateOptions<T> {
    initialValue: T | undefined
    volatile?: boolean
    ttl?: number //in millis
    deserializer?: (rawData: any) => T //must be memoized
}

const defaultOptions: useLocalStorageStateOptions<any> = {
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
function useLocalStorageState<T>(
    key: string,
    stateOptions: useLocalStorageStateOptions<T>
): [T, Dispatch<SetStateAction<T>>] {
    const { initialValue, volatile, ttl } = {
        ...defaultOptions,
        ...stateOptions,
    }
    const { windowId } = useWindowId()
    const history = useHistory()

    const storageKey = volatile ? generateVolatileLocalStorageKey(key) : key

    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [state, setState] = useState<T>(() => {
        const data = retrieveLocalStorageItem(storageKey, windowId, ttl)
        if (!data) {
            saveLocalStorageItem(storageKey, initialValue, windowId)
            return initialValue
        }
        return stateOptions.deserializer
            ? stateOptions.deserializer(data)
            : data
    })

    useEffect(() => {
        saveLocalStorageItem(storageKey, state, windowId)
    }, [state, storageKey, windowId])

    useEffect(() => {
        let unlisten: any = null
        if (volatile) {
            unlisten = history.listen(() => {
                clearVolatileLocalStorageItems()
            })
        }
        return () => {
            if (unlisten) {
                unlisten()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return [state, setState]
}

export default useLocalStorageState
