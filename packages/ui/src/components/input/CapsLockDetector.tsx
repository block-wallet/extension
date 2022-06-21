import React, { useState, useEffect } from "react"

type ChildrenParams = {
    isCapsLock: boolean
}

type CapsLockDetectorProps = {
    children: (params: ChildrenParams) => React.ReactNode
}

const CapsLockDetector = ({ children }: CapsLockDetectorProps) => {
    const [isCapsLock, setIsCapsLock] = useState(false)

    useEffect(() => {
        const cbUp = (e: KeyboardEvent) => {
            // It can return undefined so we have to make sure it's the correct value
            if (e.getModifierState("CapsLock") === false) {
                setIsCapsLock(false)
            }
        }
        const cbDown = (e: KeyboardEvent) => {
            if (e.getModifierState("CapsLock")) {
                setIsCapsLock(true)
            }
        }

        window.addEventListener("keydown", cbDown)
        window.addEventListener("keyup", cbUp)

        return () => {
            window.removeEventListener("keydown", cbDown)
            window.removeEventListener("keyup", cbUp)
        }
    }, [])

    return <div>{children({ isCapsLock })}</div>
}

export default CapsLockDetector
