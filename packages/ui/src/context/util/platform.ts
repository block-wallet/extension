import browser from "webextension-polyfill"

/**
 * Temporary workaround for secondary monitors on MacOS where redraws don't happen
 * @See https://bugs.chromium.org/p/chromium/issues/detail?id=971701
 * @author https://stackoverflow.com/questions/56500742/why-is-my-google-chrome-extensions-popup-ui-laggy-on-external-monitors-but-not/64113061#64113061
 */
export const checkRedraw = () => {
    if (
        // The following conditions check if the popup was opened in the main display
        window.screenLeft < 0 ||
        window.screenTop < 0 ||
        window.screenLeft > window.screen.width ||
        window.screenTop > window.screen.height
    ) {
        getPlatformInfo().then((platformInfo) => {
            if (platformInfo.os === "mac") {
                const style = document.createElement("style")
                style.innerHTML =
                    "@-webkit-keyframes redraw{0%{opacity:1}to{opacity:.99}}@keyframes redraw{0%{opacity:1}to{opacity:.99}}html{-webkit-animation:redraw 1s linear infinite;animation:redraw 1s linear infinite}"
                document.head.appendChild(style)
            }
        })
    }
}

/**
 * Returns the platform info
 *
 */
export const getPlatformInfo = (): Promise<browser.Runtime.PlatformInfo> => {
    return browser.runtime.getPlatformInfo()
}

export const getCurrentOS = () => {
    const os = navigator.userAgent
    if (os.search("Windows") !== -1) {
        return "win"
    } else if (os.search("Mac") !== -1) {
        return "mac"
    } else if (os.search("X11") !== -1 && !(os.search("Linux") !== -1)) {
        return "UNIX"
    } else if (os.search("Linux") !== -1 && os.search("X11") !== -1) {
        return "Linux"
    }
}
