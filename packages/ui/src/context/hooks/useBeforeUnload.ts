import { useEffect } from "react"

/**
 * This hook will perform the specified callback when the "beforeunload" event is triggered.
 *
 * @param handler callback
 * @param capture if true will trigger on capture phase
 */
const useBeforeunload = (
    handler: (ev: BeforeUnloadEvent) => any,
    capture = false
) => {
    useEffect(() => {
        window.addEventListener("beforeunload", handler, { capture: capture })

        return () => {
            window.removeEventListener("beforeunload", handler, {
                capture: capture,
            })
        }
        // eslint-disable-next-line
    }, [])
}

export default useBeforeunload
