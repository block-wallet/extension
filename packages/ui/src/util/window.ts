import browser from "webextension-polyfill"

/**
 * Checks for runtime error
 *
 */
const checkForError = () => {
    const error = browser.runtime.lastError
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
        browser.tabs &&
            browser.tabs.getCurrent().then((tab) => {
                const error = checkForError()
                if (error) {
                    reject(error)
                }
                browser.tabs.remove(tab?.id!).then(() => {
                    const error = checkForError()
                    if (error) {
                        reject(error)
                    }
                    resolve()
                })
            })
    })
}
