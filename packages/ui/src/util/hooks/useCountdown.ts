import { useRef, useEffect, useState } from "react"
import { calculateRemainingSeconds } from "../time"

const useCountdown = (
    startTime: number | undefined,
    timeout: number | undefined
) => {
    const [remainingSeconds, setRemainingSeconds] = useState<
        number | undefined
    >(() => {
        return calculateRemainingSeconds(startTime, timeout)
    })
    const intervalRef = useRef<NodeJS.Timeout | undefined>()

    useEffect(() => {
        if (startTime !== undefined && timeout !== undefined) {
            //don't wait 1 second to execute first calculation.
            setRemainingSeconds(calculateRemainingSeconds(startTime, timeout))

            intervalRef.current = setInterval(() => {
                setRemainingSeconds(
                    calculateRemainingSeconds(startTime, timeout)
                )
            }, 1000) //run every 1 second
        } else {
            setRemainingSeconds(undefined)
        }

        return () => {
            intervalRef.current && clearInterval(intervalRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTime, timeout])

    return {
        value: remainingSeconds,
    }
}

export default useCountdown
