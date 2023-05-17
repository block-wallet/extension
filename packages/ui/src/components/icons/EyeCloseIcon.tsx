import { FunctionComponent } from "react"
import classnames from "classnames"
const EyeCloseIcon: FunctionComponent<{ className?: string }> = ({
    className,
}) => {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            className={classnames("fill-black", className)}
        >
            <path
                d="M14.6004 5.6001L6.40039 13.8001C6.90039 13.9001 7.50039 14.0001 8.00039 14.0001C11.6004 14.0001 14.4004 10.9001 15.6004 9.1001C16.1004 8.4001 16.1004 7.5001 15.6004 6.8001C15.4004 6.5001 15.0004 6.1001 14.6004 5.6001Z"
                fill="currentColor"
            />
            <path
                d="M14.3 0.3L11.6 3C10.5 2.4 9.3 2 8 2C4.4 2 1.6 5.1 0.4 6.9C-0.1 7.6 -0.1 8.5 0.4 9.1C0.9 9.9 1.8 10.9 2.8 11.8L0.3 14.3C-0.1 14.7 -0.1 15.3 0.3 15.7C0.5 15.9 0.7 16 1 16C1.3 16 1.5 15.9 1.7 15.7L15.7 1.7C16.1 1.3 16.1 0.7 15.7 0.3C15.3 -0.1 14.7 -0.1 14.3 0.3ZM5.3 9.3C5.1 8.9 5 8.5 5 8C5 6.3 6.3 5 8 5C8.5 5 8.9 5.1 9.3 5.3L5.3 9.3Z"
                fill="currentColor"
            />
        </svg>
    )
}

export default EyeCloseIcon
