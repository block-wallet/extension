import {
    Handlers,
    MessageTypes,
    TransportResponseMessage,
} from "@block-wallet/background/utils/types/communication"
import { Origin, BackgroundActions } from "./commTypes"
import { SiteMetadata } from "@block-wallet/provider/types"
import { checkRedraw } from "./util/platform"
import { isWindow } from "./util/isWindow"
import log from "loglevel"
import browser from "webextension-polyfill"

export const handlers: Handlers = {}
export let port: browser.Runtime.Port
export let isPortConnected: boolean = false
export let session: { origin: string; data: SiteMetadata } | null = null
export let isAutomaticClose: boolean = false

const portConnection = () => {
    port.onMessage.removeListener(messageListener)
    port.onDisconnect.removeListener(disconectListener)
    port.disconnect()
    initPort()
    port.onMessage.addListener(messageListener)
    port.onDisconnect.addListener(disconectListener)
}

const disconectListener = () => {
    const error = browser.runtime.lastError
    if (error) {
        log.error("Port disconnected", error.message)
    } else {
        log.debug("Port disconnected")
    }
}

const messageListener = (data: TransportResponseMessage<MessageTypes>) => {
    const handler = handlers[data.id]

    if (!handler) {
        // Check for background actions
        if (data.id === BackgroundActions.CLOSE_WINDOW) {
            isAutomaticClose = true
            window.close()
        } else {
            log.error("Unknown response", data)
        }
        return
    }

    if (!handler.subscriber) {
        delete handlers[data.id]
    }

    if (data.subscription) {
        ; (handler.subscriber as Function)(data.subscription)
    } else if ("error" in data) {
        // Deserialze error object
        const parsedError = JSON.parse(data.error!)
        const err = new Error(parsedError.message)
        err.stack = parsedError.stack
        err.name = parsedError.name

        if (
            err.message
                .toLowerCase()
                .includes("attempting to use a disconnected port object")
        )
            portConnection()
        // Reject promise
        else handler.reject(err)
    } else {
        handler.resolve(data.response)
    }
}

/**
 * Connect ports
 */
const initPort = () => {
    // Open port
    port = browser.runtime.connect({ name: Origin.EXTENSION })

    // Override postMessage function
    // port.postMessage = postMessageWithRetry(port.postMessage)

    // Check for error
    port.onDisconnect.addListener(disconectListener)

    // Add port message listener
    port.onMessage.addListener(messageListener)

    isPortConnected = true
}

/**
 * Initialization function
 * Checks if the background is running before connecting the port
 */
export const initialize = () => {
    browser.runtime &&
        browser.runtime
            .sendMessage({ message: "isBlankInitialized" })
            .then((response: any) => {
                const error = browser.runtime.lastError
                if (!response || error) {
                    setTimeout(initialize, 100)
                } else {
                    if (response.isBlankInitialized === true) {
                        if (!isPortConnected) {
                            initPort()
                        }
                    }
                }
            })
}

// Setup session
browser.tabs
    .query({ active: true, currentWindow: true })
    .then(async (tabs: browser.Tabs.Tab[]) => {
        const isWindowPopup = await isWindow()

        if (!isWindowPopup || !tabs[0]) {
            session = null
            return
        }

        const { favIconUrl, url, title } = tabs[0]

        if (!url) {
            session = null
        } else {
            const { origin, hostname } = new URL(url)
            session = {
                origin,
                data: {
                    iconURL: favIconUrl || null,
                    name: title || hostname,
                },
            }
        }
    })

// Run init function
initialize()

// Run platform check
checkRedraw()
