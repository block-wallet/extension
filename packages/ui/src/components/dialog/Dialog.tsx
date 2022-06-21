import React, { FunctionComponent, useRef } from "react"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { CSSTransition } from "react-transition-group"
import "../../router/routeTransitions.css"
import { classnames } from "../../styles"

const Dialog: FunctionComponent<{
    children: React.ReactNode
    open: boolean
    horizontalPadding?: string
    onClickOutside?: () => void
}> = ({ open, children, horizontalPadding = "px-3", onClickOutside }) => {
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
                    "bg-gray-100 bg-opacity-50 fixed inset-0 w-full h-screen z-50 overflow-hidden flex flex-col items-center justify-center px-6"
                )}
                style={{
                    maxWidth: "390px",
                    maxHeight: "600px",
                    marginTop: "0px",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    ref={ref}
                    className={classnames(
                        "relative py-6 opacity-100 w-full bg-white shadow-md rounded-md flex-col flex",
                        horizontalPadding
                    )}
                >
                    {children}
                </div>
            </div>
        </CSSTransition>
    )
}

export default Dialog
