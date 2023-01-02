export function timeExceedsTTL(lastTime: number, ttl: number): boolean {
    const now = new Date().getTime()
    return now - lastTime > ttl
}

export const calculateRemainingSeconds = (
    startTime: number | undefined,
    timeout: number | undefined,
    minValue: number = 0
) => {
    if (startTime && timeout) {
        const now = new Date()
        const timeEllapsed = now.getTime() - startTime
        const remainingTime = Math.max(timeout - timeEllapsed, 0)
        const remainingSeconds = Math.abs(remainingTime / 1000)
        return Math.max(remainingSeconds, minValue)
    }
    return undefined
}

const twoDigits = (value: number) => {
    return value.toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
    })
}

export const secondsToMMSS = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    let remainingSeconds = seconds
    if (minutes > 0) {
        remainingSeconds = Math.floor(seconds % 60)
    }

    return `${minutes ? twoDigits(minutes).concat(":") : ""}${twoDigits(
        Number(remainingSeconds.toLocaleString().split(".")[0])
    )} ${minutes > 0 ? "minutes" : "seconds"}`
}

export const secondsToEstimatedMinutes = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    let legend = "minutes"
    if (minutes <= 0) {
        legend = "minute"
    }

    return `< ${minutes + 1} ${legend}`
}
