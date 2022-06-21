import React from "react"

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
            className="border-2 border-black rounded-full flex items-center justify-center"
            style={{ width: circleSize, height: circleSize }}
        >
            <span className="font-bold">{text}</span>
        </div>
    )
}

export default CenteredTextCircle
