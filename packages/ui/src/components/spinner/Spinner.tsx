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
    >
        <CgSpinner
            size={size}
            className="animate-spin text-primary-black-default opacity-50"
            style={{
                display: "inline",
                marginRight: text && iconTextSeparation,
            }}
            color={color}
        />
        {text}
    </div>
)

export default Spinner
