import React, { FunctionComponent, useRef } from "react"
import { CSSTransition } from "react-transition-group"
import "../../router/routeTransitions.css"
import { classnames } from "../../styles"
import { useOnClickOutside } from "../../util/useOnClickOutside"

const FullScreenDialog: FunctionComponent<{
    open: boolean
    onClickOutside?: () => void
}> = ({ children, open, onClickOutside }) => {
    const nodeRef = useRef(null)
    const ref = useRef(null)
    useOnClickOutside(ref, () => onClickOutside?.())

    return (
        <CSSTransition
            in={open}
            timeout={200}
            unmountOnExit
            classNames={"appear"}
            nodeRef={nodeRef}
        >
            <div
                ref={nodeRef}
                className={classnames(
                    "bg-gray-100 bg-opacity-60 fixed inset-0 w-full h-screen z-50 overflow-hidden flex flex-col items-center justify-center px-6 "
                )}
            >
                <div
                    ref={ref}
                    className="relative py-6 opacity-100 max-w-md w-3/6 bg-white shadow-md rounded-md flex-col flex"
                >
                    {children}
                </div>
            </div>
        </CSSTransition>
    )
}

export default FullScreenDialog
