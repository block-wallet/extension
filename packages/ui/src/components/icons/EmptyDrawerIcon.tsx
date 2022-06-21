import React from "react"
import classnames from "classnames"

const EmptyDrawer: React.FC<{ className: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 88 88"
            fill="none"
            className={classnames("w-20 h-20", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M21 19H12.5L2 51H86L75.5 19H67"
                stroke="black"
                strokeWidth="4"
            />
            <path d="M86 51H2V86H86V51Z" stroke="black" strokeWidth="4" />
            <path d="M65 64H24V74H65V64Z" fill="#1673FF" />
            <path
                d="M69 51.5V2H19V51.5"
                stroke="black"
                strokeWidth="4"
                strokeDasharray="5 5"
            />
            <path d="M44 11V29.5" stroke="black" strokeWidth="4" />
            <path d="M44 36V41" stroke="black" strokeWidth="4" />
        </svg>
    )
}

export default EmptyDrawer
