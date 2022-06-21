import React, { FunctionComponent } from "react"
import classnames from "classnames"

const PlusIcon: FunctionComponent<{ className?: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 16 16"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M15 7H9V1C9 0.4 8.6 0 8 0C7.4 0 7 0.4 7 1V7H1C0.4 7 0 7.4 0 8C0 8.6 0.4 9 1 9H7V15C7 15.6 7.4 16 8 16C8.6 16 9 15.6 9 15V9H15C15.6 9 16 8.6 16 8C16 7.4 15.6 7 15 7Z" />
        </svg>
    )
}

export default PlusIcon
