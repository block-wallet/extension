import { FunctionComponent } from "react"
import classnames from "classnames"
const EyeIcon: FunctionComponent<{ className?: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 16 12"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M8.00039 12C11.6004 12 14.4004 8.9 15.6004 7.1C16.1004 6.4 16.1004 5.5 15.6004 4.8C14.4004 3.1 11.6004 0 8.00039 0C4.40039 0 1.60039 3.1 0.400391 4.9C-0.0996094 5.6 -0.0996094 6.5 0.400391 7.1C1.60039 8.9 4.40039 12 8.00039 12ZM8.00039 3C9.70039 3 11.0004 4.3 11.0004 6C11.0004 7.7 9.70039 9 8.00039 9C6.30039 9 5.00039 7.7 5.00039 6C5.00039 4.3 6.30039 3 8.00039 3Z" />
        </svg>
    )
}

export default EyeIcon
