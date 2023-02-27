import { FunctionComponent } from "react"
import arrowDown from "../../assets/images/icons/arrow_down.svg"

export const ArrowUpDown: FunctionComponent<{
    active: boolean
    onClick?: () => void
}> = ({ active = false, onClick }) => (
    <img
        onClick={onClick}
        src={arrowDown}
        className="w-3 h-2 text-primary-black-default"
        alt=""
        style={{
            transform: `${active ? "rotate(180deg)" : "none"}`,
        }}
    />
)
