export const formatNumberLength = (
    display: string,
    maxDigits: number,
    ellipsis = true
) => {
    const [whole, decimal] = display.split('.')
    const displayDecimal = decimal?.slice(
        0,
        Math.max(maxDigits - whole.length, 0)
    )
    const displayEllipsis =
        ellipsis && whole.length + displayDecimal.length >= maxDigits
    return `${displayDecimal
        ? [whole.slice(0, maxDigits), displayDecimal].join('.')
        : whole
        }${displayEllipsis ? '...' : ''}`
}
