/**
 * Checks if the instance is running on a browser window (e.g. permission request popup)
 */
export const isWindow = () => {
    return new Promise<boolean>((resolve) => {
        chrome.tabs.getCurrent((tab) => {
            if (!tab) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    })
}
