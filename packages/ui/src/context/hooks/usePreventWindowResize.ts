import { useState } from "react"

interface Sizes {
    width: number
    height: number
}

const usePreventWindowResize = (fixedSizes?: Sizes) => {
    const [sizes] = useState<Sizes>(
        fixedSizes || { width: window.innerWidth, height: window.innerHeight }
    )
    let time: NodeJS.Timeout
    const preventResize = () => {
        //doing this to wait until the last resize event and avoid some weird UX.
        clearTimeout(time)
        time = setTimeout(() => {
            window.resizeBy(
                sizes.width - window.innerWidth,
                sizes.height - window.innerHeight
            )
        }, 100)
    }
    return {
        preventResize: () => {
            window.addEventListener("resize", preventResize)
        },
        cancelPreventResize: () => {
            window.removeEventListener("resize", preventResize)
        },
    }
}

export default usePreventWindowResize
