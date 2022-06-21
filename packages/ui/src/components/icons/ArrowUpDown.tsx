import React, { FunctionComponent } from "react"
import arrowDown from "../../assets/images/icons/arrow_down.svg"

export const ArrowUpDown: FunctionComponent<{ active: boolean }> = ({
    active = false,
}) => (
    <img
        src={arrowDown}
        className="w-3 h-2 text-black"
        alt=""
        style={{
            transform: `${active ? "rotate(180deg)" : "none"}`,
        }}
    />
)
