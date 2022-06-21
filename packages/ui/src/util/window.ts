/**
 * Checks for runtime error
 *
 */
const checkForError = () => {
    const error = chrome.runtime.lastError
    if (!error) {
        return undefined
    }
    return new Error(error.message)
}

/**
 * Closes the current selected tab
 *
 */
export const closeCurrentTab = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.tabs &&
            chrome.tabs.getCurrent((tab) => {
                const error = checkForError()
                if (error) {
                    reject(error)
                }
                chrome.tabs.remove(tab?.id!, () => {
                    const error = checkForError()
                    if (error) {
                        reject(error)
                    }
                    resolve()
                })
            })
    })
}
