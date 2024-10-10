import { Meta } from "@storybook/react"
import classnames from "classnames"
import icon from "../assets/images/icons/book.svg"
import plus from "../assets/images/icons/plus.svg"
import ArrowHoverAnimation from "../components/icons/ArrowHoverAnimation"

import { Classes } from "../styles"

export const Button = () => (
    <div className={classnames(Classes.button, "w-64")}>Button</div>
)
export const LiteButton = () => (
    <div className={classnames(Classes.liteButton, "w-64")}>Lite Button</div>
)
export const DarkButton = () => (
    <div className={classnames(Classes.darkButton, "w-64")}>Dark Button</div>
)
export const ArrowHoverButton = () => (
    <div className="flex flex-row items-start space-x-8">
        <div className="flex flex-col items-center w-auto space-y-2 group">
            <span className="w-10 h-10 overflow-hidden transition duration-300 rounded-full bg-primary-blue-default group-hover:opacity-75">
                <ArrowHoverAnimation />
            </span>
            <span className="text-sm">Receive</span>
        </div>
        <div className="flex flex-col items-center w-auto space-y-2 group">
            <span
                className="w-10 h-10 overflow-hidden transition duration-300 rounded-full bg-primary-blue-default group-hover:opacity-75"
                style={{ transform: "scale(-1)" }}
            >
                <ArrowHoverAnimation />
            </span>
            <span className="text-sm">Send</span>
        </div>
    </div>
)

export const MenuButton = () => (
    <div className={classnames(Classes.menuButton, "w-64")}>
        <img src={icon} alt="Icon" className={classnames(Classes.buttonIcon)} />
        Menu Button
    </div>
)

export const ActionButton = () => (
    <div className={classnames(Classes.actionButton, "w-64")}>
        <img src={plus} alt="Icon" className={classnames(Classes.buttonIcon)} />
        Action Button
    </div>
)

export const Buttons = () => (
    <div className="space-y-2">
        <Button />
        <LiteButton />
        <MenuButton />
        <DarkButton />
        <ActionButton />
    </div>
)

export default { title: "Button" } as Meta
