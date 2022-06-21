export const getDisplayTime = (time?: Date) => {
    if (!time || !time.getTime()) return ""

    const checkTime: Date = time

    const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
    }

    const checkTimeHours: string = checkTime.toLocaleTimeString(undefined, {
        timeStyle: "short",
    })

    const today: Date = new Date()
    const yesterday: Date = new Date(
        new Date().setDate(new Date().getDate() - 1)
    )

    const isToday: boolean =
        checkTime.getDate() === today.getDate() &&
        checkTime.getMonth() === today.getMonth() &&
        checkTime.getFullYear() === today.getFullYear()
    const isYesterday: boolean =
        checkTime.getDate() === yesterday.getDate() &&
        checkTime.getMonth() === yesterday.getMonth() &&
        checkTime.getFullYear() === yesterday.getFullYear()

    return isToday
        ? `Today, ${checkTimeHours}`
        : isYesterday
        ? `Yesterday, ${checkTimeHours}`
        : checkTime.toLocaleString(undefined, options)
}
