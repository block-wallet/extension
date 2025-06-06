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

export const handlers: Handlers = {}
export let port: chrome.runtime.Port
export let isPortConnected: boolean = false
export let session: { origin: string; data: SiteMetadata } | null = null
export let isAutomaticClose: boolean = false

const portConnection = () => {
    try {
        // Only try to remove listeners and disconnect if the port is defined
        if (port) {
            try {
                port.onMessage.removeListener(messageListener)
                port.onDisconnect.removeListener(disconectListener)
                port.disconnect()
            } catch (e) {
                log.warn("Error while disconnecting port", e)
            }
        }

        // Create a new port connection
        initPort()

        // Set up listeners on the new port
        port.onMessage.addListener(messageListener)
        port.onDisconnect.addListener(disconectListener)

        log.debug("Port reconnected successfully")
    } catch (err) {
        log.error("Failed to reconnect port", err)

        // If reconnection fails, try again after a short delay
        setTimeout(() => {
            log.debug("Attempting port reconnection after failure")
            isPortConnected = false
            initialize()
        }, 500)
    }
}

const disconectListener = () => {
    isPortConnected = false
    const error = chrome.runtime.lastError
    if (error) {
        log.error("Port disconnected with error:", error.message)
        console.error("Port disconnection error:", error.message)
    } else {
        log.debug("Port disconnected normally")
        console.log("Port disconnected normally")
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
            console.error("Unknown response from background:", data)
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
        ) {
            log.warn("Detected disconnected port error, attempting reconnection")
            console.warn("Detected disconnected port error, attempting reconnection")
            portConnection()
        }
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
    try {
        console.log("[POPUP] initPort() called, attempting connection...")
        // Open port
        port = chrome.runtime.connect({ name: Origin.EXTENSION })
        console.log("[POPUP] Port connection successful:", port)

        // Check for error
        port.onDisconnect.addListener(disconectListener)

        // Add port message listener
        port.onMessage.addListener(messageListener)

        isPortConnected = true
        console.log("[POPUP] Port initialized successfully")
        log.debug("Port initialized successfully")
    } catch (err) {
        console.error("[POPUP] Failed to initialize port:", err)
        log.error("Failed to initialize port", err)
        isPortConnected = false

        // Retry connection after a delay
        setTimeout(initialize, 500)
    }
}

/**
 * Initialization function
 * Checks if the background is running before connecting the port
 */
export const initialize = () => {
    console.log("[POPUP] initialize() called")
    chrome.runtime &&
        chrome.runtime.sendMessage(
            { message: "isBlankInitialized" },
            (response: any) => {
                const error = chrome.runtime.lastError
                console.log("[POPUP] Initialization response:", response, "Error:", error)
                if (!response || error) {
                    console.log("initialize", error)
                    setTimeout(initialize, 100)
                } else {
                    if (response.isBlankInitialized === true) {
                        console.log("[POPUP] Background initialized, attempting port connection")
                        if (!isPortConnected) {
                            initPort()
                        }
                    }
                }
            }
        )
}

// Setup session
chrome.tabs.query(
    { active: true, currentWindow: true },
    async (tabs: chrome.tabs.Tab[]) => {
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
    }
)

// Run init function
initialize()

// Run platform check
checkRedraw()
