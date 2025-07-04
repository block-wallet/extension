import { FunctionComponent } from "react"
import { CgSpinner } from "react-icons/cg"

const Spinner: FunctionComponent<{
    size?: string
    text?: string
    iconTextSeparation?: string
    color?: string
}> = ({ size = "16px", text = "", iconTextSeparation = "4px", color = "" }) => (
    <div
        style={{ display: "inline" }}
        role="alert"
        aria-busy="true"
        aria-label="loading"
        className="inline-flex items-center"
    >
        <CgSpinner
            size={size}
            className={`animate-spin ${color ? '' : 'text-gray-600 dark:text-gray-400'}`}
            style={{
                display: "inline",
                marginRight: text && iconTextSeparation,
                color: color || undefined,
            }}
        />
        {text && (
            <span className="text-gray-600 dark:text-gray-400 ml-2">
                {text}
            </span>
        )}
    </div>
)

export default Spinner
