import React from "react"
import classnames from "classnames"
const ThreeDotsIcon: React.FC<any> = ({ className }) => {
    return (
        <svg
            width="16"
            height="4"
            viewBox="0 0 16 4"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M8 4C9.10457 4 10 3.10457 10 2C10 0.89543 9.10457 0 8 0C6.89543 0 6 0.89543 6 2C6 3.10457 6.89543 4 8 4Z" />
            <path d="M2 4C3.10457 4 4 3.10457 4 2C4 0.89543 3.10457 0 2 0C0.89543 0 0 0.89543 0 2C0 3.10457 0.89543 4 2 4Z" />
            <path d="M14 4C15.1046 4 16 3.10457 16 2C16 0.89543 15.1046 0 14 0C12.8954 0 12 0.89543 12 2C12 3.10457 12.8954 4 14 4Z" />
        </svg>
    )
}

export default ThreeDotsIcon
