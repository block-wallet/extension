import { useRef, useEffect, useCallback } from "react"

const defaultData = {
    print: true,
    timeFrameInMillis: 60000,
}

const useMetricCollector = ({ print, timeFrameInMillis } = defaultData) => {
    const timing = useRef<{
        id: string
        actualDuration: number
    }>({
        id: "app",
        actualDuration: 0,
    })

    useEffect(() => {
        let timeRef: NodeJS.Timeout
        if (print) {
            timeRef = setInterval(() => {
                const actualDuration = timing.current.actualDuration
                if (
                    process.env.NODE_ENV === "development" &&
                    process.env.LOG_LEVEL === "debug"
                ) {
                    console.log(
                        `Collecting ${timing.current.id}: `,
                        actualDuration
                    )
                }

                timing.current = {
                    id: timing.current.id,
                    actualDuration: 0,
                }
            }, timeFrameInMillis)
        }

        return () => {
            clearInterval(timeRef)
        }
    }, [])

    const collect = useCallback(
        (
            id: string, // the "id" prop of the Profiler tree that has just committed
            phase: "mount" | "update", // either "mount" (if the tree just mounted) or "update" (if it re-rendered)
            actualDuration: number // time spent rendering the committed update
        ) => {
            if (phase === "mount") {
                return
            }
            timing.current = {
                id,
                actualDuration: timing.current.actualDuration + actualDuration,
            }
        },
        []
    )

    return collect
}

export default useMetricCollector
