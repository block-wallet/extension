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

export enum Browsers {
    CHROME = "chrome",
    OPERA = "opera",
    FIREFOX = "firefox",
}

/**
 * Detects chromium based browsers.
 * @returns true if the browser is chromium based
 */

export function getBrowserInfo(): Browsers {
    const userAgent = window.navigator.userAgent.toLowerCase()

    if (userAgent.indexOf("opera") !== -1 || userAgent.indexOf("opr") !== -1)
        return Browsers.OPERA

    if (userAgent.indexOf("firefox") !== -1) return Browsers.FIREFOX

    if (userAgent.indexOf("chrome") !== -1) return Browsers.CHROME

    return Browsers.CHROME
}
