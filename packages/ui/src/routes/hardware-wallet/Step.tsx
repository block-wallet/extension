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
        <div className={classnames(textSize, "flex items-center space-x-4 w-full")}>
            <div className="flex-shrink-0">
                <CenteredTextCircle
                    size={size || "lg"}
                    text={step.toString()}
                />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                {text}
            </span>
        </div>
    )
}

export default Step
