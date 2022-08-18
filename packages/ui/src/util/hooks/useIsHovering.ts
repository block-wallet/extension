import { useState } from "react"

const useIsHovering = () => {
    const [isHovering, setIsHovering] = useState(false)
    return {
        getIsHoveringProps: () => ({
            onMouseEnter: () => setIsHovering(true),
            onMouseLeave: () => setIsHovering(false),
        }),
        isHovering,
    }
}

export default useIsHovering
