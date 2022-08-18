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
