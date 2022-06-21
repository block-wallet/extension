import { timeExceedsTTL } from "./time"

const VOLATILE_LOCAL_STORAGE_PREFIX = "volatile"
const VOLATILE_ITEMS_REGEX = new RegExp(`^${VOLATILE_LOCAL_STORAGE_PREFIX}\\.`)

function saveLocalStorageItem(
    key: string,
    data: any,
    windowId?: string | number
) {
    if (typeof window === "undefined") {
        return undefined
    }

    let toStore = {
        value: data,
        windowId,
        updateTime: new Date().getTime(),
    }
    window.localStorage.setItem(key, JSON.stringify(toStore))
}

function retrieveLocalStorageItem(
    key: string,
    windowId?: string | number,
    ttl?: number
) {
    if (typeof window === "undefined") {
        return undefined
    }

    const storedData = window.localStorage.getItem(key)
    if (!storedData) {
        return null
    }
    try {
        const parsedData = JSON.parse(storedData)
        if (windowId && parsedData.windowId) {
            if (parsedData.windowId !== windowId) {
                return null
            }
        }
        if (ttl && parsedData.updateTime) {
            const lastUpdateTime = new Date(parsedData.updateTime).getTime()
            if (timeExceedsTTL(lastUpdateTime, ttl)) {
                window.localStorage.removeItem(key)
                return null
            }
        }
        return parsedData.value
    } catch (e) {
        return storedData
    }
}

function findLocalStorageItems(query: RegExp | string = "") {
    const results = []
    for (let item in window.localStorage) {
        if (window.localStorage.hasOwnProperty(item)) {
            if (item.match(query) || (!query && typeof item === "string")) {
                results.push({
                    key: item,
                    value: JSON.parse(window.localStorage.getItem(item) ?? ""),
                })
            }
        }
    }
    return results
}

/**
 * Erases all the `window.localSotrage` keys that matches the provided query.
 * If the query is not specified, then all the items are going to be erased
 * @param query Regex or string that matches the window.localStorage keys to delete.
 */
function clearLocalStorageItems(query: RegExp | string = "") {
    const items = findLocalStorageItems(query)
    items.forEach(({ key }) => {
        window.localStorage.removeItem(key)
    })
}

function clearVolatileLocalStorageItems() {
    return clearLocalStorageItems(VOLATILE_ITEMS_REGEX)
}

function generateVolatileLocalStorageKey(key: string): string {
    if (key.match(new RegExp(VOLATILE_ITEMS_REGEX))) {
        return key
    }
    return `${VOLATILE_LOCAL_STORAGE_PREFIX}.${key}`
}

export {
    clearLocalStorageItems,
    generateVolatileLocalStorageKey,
    clearVolatileLocalStorageItems,
    saveLocalStorageItem,
    retrieveLocalStorageItem,
}
