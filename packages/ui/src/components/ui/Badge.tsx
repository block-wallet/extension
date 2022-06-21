import React from "react"

type Position = "top-right" | "top-left" | "bottom-right" | "bottom-left"

const offsets = {
    "top-right": "-top-2 -right-2",
    "top-left": "-top-2 -left-2",
    "bottom-right": "-bottom-2 -right-2",
    "bottom-left": "-bottom-2 -left-2",
}

const Badge: React.FC<{ position?: Position }> = (
    { children, position } = { position: "top-right" }
) => {
    const offset = offsets[position || "top-right"]
    return (
        <div
            className={`flex justify-center items-center absolute h-5 w-5 bg-primary-300 rounded-xl ${offset}`}
        >
            <span className="text-white font-bold text-sm">{children}</span>
        </div>
    )
}

export default Badge
