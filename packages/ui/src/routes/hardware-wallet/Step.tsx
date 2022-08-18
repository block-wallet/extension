import CenteredTextCircle from "../../components/icons/CenteredTextCircle"
import classnames from "classnames"
const TEXT_SIZES_CLASSES = {
    lg: "text-base",
    md: "text-sm",
    sm: "text-xs",
}

const Step = ({
    step,
    text,
    size,
}: {
    step: number
    text: string | (string | React.ReactElement)[]
    size?: "sm" | "md" | "lg"
}) => {
    const textSize = TEXT_SIZES_CLASSES[size || "lg"]
    return (
        <div className={classnames(textSize, "flex items-center space-x-4")}>
            <CenteredTextCircle size={size || "lg"} text={step.toString()} />
            <span className="font-semibold">{text}</span>
        </div>
    )
}

export default Step
