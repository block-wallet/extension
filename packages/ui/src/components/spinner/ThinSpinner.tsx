import React, { FunctionComponent } from "react"
import { classnames } from "../../styles"

/**
 * # ⚠️
 * The `color` props expects a text color: `text-white`, `text-primary-300`, etc...
 */
const Spinner: FunctionComponent<{
    size?: string
    text?: string
    iconTextSeparation?: string
    color?: string
}> = ({
    size = "1rem",
    text = "",
    iconTextSeparation = "4px",
    color = "text-primary-100",
}) => (
    <div
        style={{ display: "inline" }}
        role="alert"
        aria-busy="true"
        aria-label="loading"
    >
        <svg
            className="animate-spinner-rotate inline"
            style={{
                marginRight: text && iconTextSeparation,
            }}
            viewBox="0 0 50 50"
            width={size}
            height={size}
        >
            <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                className={classnames("stroke-current", color)}
                strokeWidth="2"
            ></circle>
            <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="2"
                className="animate-spinner-dash stroke-primary-300 linecap-round"
            ></circle>
        </svg>
        {text}
    </div>
)

export default Spinner
