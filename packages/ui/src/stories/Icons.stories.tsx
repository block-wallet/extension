import { Meta } from "@storybook/react"
import AnimatedIcon, { AnimatedIconName } from "../components/AnimatedIcon"

export const SuccessIconAnimated = () => (
    <AnimatedIcon icon={AnimatedIconName.Success} className="w-24 h-24" />
)

export const ConfirmationCheckAnimated = () => (
    <AnimatedIcon
        icon={AnimatedIconName.ConfirmationCheck}
        className="w-24 h-24"
    />
)
export default { title: "Icons" } as Meta
