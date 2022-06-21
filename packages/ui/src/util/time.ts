export function timeExceedsTTL(lastTime: number, ttl: number): boolean {
    const now = new Date().getTime()
    return now - lastTime > ttl
}
