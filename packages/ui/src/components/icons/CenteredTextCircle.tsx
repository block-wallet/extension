type CenteredTextCircleProps = {
    text: string
    size?: "sm" | "md" | "lg"
}

const SIZES_IN_PX = {
    sm: 27,
    md: 40,
    lg: 54,
}

const CenteredTextCircle = ({ text, size }: CenteredTextCircleProps) => {
    const circleSize = SIZES_IN_PX[size || "lg"]
    return (
        <div
            className="border-2 border-gray-800 dark:border-gray-200 rounded-full flex items-center justify-center bg-white dark:bg-gray-800"
            style={{ width: circleSize, height: circleSize }}
        >
            <span className="font-semibold text-gray-800 dark:text-gray-200">{text}</span>
        </div>
    )
}

export default CenteredTextCircle
