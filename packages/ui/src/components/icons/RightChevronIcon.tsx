import React from "react"
import classnames from "classnames"

const RightChevronIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-3 h-3 stroke-black", className)}
            viewBox="0 0 8 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M2 2L6 6L2 10"
                strokeWidth="2"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
        </svg>
    )
}

//exported as named to enable other implementations such as "LeftChevron"
export { RightChevronIcon }
