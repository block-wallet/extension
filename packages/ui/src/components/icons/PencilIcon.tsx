import { FunctionComponent } from "react"
import classnames from "classnames"
const PencilIcon: FunctionComponent<{ className?: string }> = ({
    className,
}) => {
    return (
        <svg
            viewBox="0 0 16 16"
            className={classnames("fill-black", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M8.1 3.5L0.3 11.3C0.1 11.5 0 11.7 0 12V15C0 15.6 0.4 16 1 16H4C4.3 16 4.5 15.9 4.7 15.7L12.5 7.9L8.1 3.5Z" />
            <path d="M15.7 3.3L12.7 0.3C12.3 -0.1 11.7 -0.1 11.3 0.3L9.5 2.1L13.9 6.5L15.7 4.7C16.1 4.3 16.1 3.7 15.7 3.3Z" />
        </svg>
    )
}

export default PencilIcon
