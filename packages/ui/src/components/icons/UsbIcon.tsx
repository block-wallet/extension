import React from "react"
import classnames from "classnames"

const UsbIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={classnames("w-5 h-5", className)}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M10 19.166V1.66602"
                stroke="black"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            <path
                d="M7.5 4.16602L10 1.66602L12.5 4.16602"
                stroke="black"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
            <path
                d="M15 11.666V14.166L10 17.4993"
                stroke="black"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            <path
                d="M5 10V13.3333L10 16.6667"
                stroke="black"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            <path
                d="M16.6666 8.33203H13.3333V11.6654H16.6666V8.33203Z"
                stroke="#1673FF"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
            <path
                d="M4.99992 9.99935C5.92039 9.99935 6.66659 9.25316 6.66659 8.33268C6.66659 7.41221 5.92039 6.66602 4.99992 6.66602C4.07944 6.66602 3.33325 7.41221 3.33325 8.33268C3.33325 9.25316 4.07944 9.99935 4.99992 9.99935Z"
                stroke="#1673FF"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="square"
            />
        </svg>
    )
}

export default UsbIcon
