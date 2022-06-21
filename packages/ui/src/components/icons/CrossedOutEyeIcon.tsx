import React, { FunctionComponent } from "react"
import classnames from "classnames"

const CrossedOutEyeIcon: FunctionComponent<{ className?: string }> = ({
    className,
}) => {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M14.6 5.59961L6.40002 13.7996C6.90002 13.8996 7.50002 13.9996 8.00002 13.9996C11.6 13.9996 14.4 10.8996 15.6 9.09961C16.1 8.39961 16.1 7.49961 15.6 6.79961C15.4 6.49961 15 6.09961 14.6 5.59961Z"
                fill="#0A121E"
            />
            <path
                d="M14.3 0.3L11.6 3C10.5 2.4 9.3 2 8 2C4.4 2 1.6 5.1 0.4 6.9C-0.1 7.6 -0.1 8.5 0.4 9.1C0.9 9.9 1.8 10.9 2.8 11.8L0.3 14.3C-0.1 14.7 -0.1 15.3 0.3 15.7C0.5 15.9 0.7 16 1 16C1.3 16 1.5 15.9 1.7 15.7L15.7 1.7C16.1 1.3 16.1 0.7 15.7 0.3C15.3 -0.1 14.7 -0.1 14.3 0.3ZM5.3 9.3C5.1 8.9 5 8.5 5 8C5 6.3 6.3 5 8 5C8.5 5 8.9 5.1 9.3 5.3L5.3 9.3Z"
                fill="#0A121E"
            />
        </svg>
    )
}

export default CrossedOutEyeIcon
