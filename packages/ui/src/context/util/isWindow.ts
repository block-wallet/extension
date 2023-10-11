import browser from "webextension-polyfill"
/**
 * Checks if the instance is running on a browser window (e.g. permission request popup)
 */
export const isWindow = () => {
    return new Promise<boolean>((resolve) => {
        browser.tabs.getCurrent().then((tab) => {
            if (!tab) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    })
}
