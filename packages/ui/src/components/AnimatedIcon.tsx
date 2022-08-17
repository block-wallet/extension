import { FunctionComponent } from "react"

import Lottie from "react-lottie"

import successAnim from "../assets/images/icons/checkmark_notes.json"
import confirmationCheck from "../assets/images/icons/confirmation_check.json"
import deviceInteraction from "../assets/images/icons/device_interaction.json"

export enum AnimatedIconName {
    Success,
    ConfirmationCheck,
    DeviceInteraction,
}

type IconType = { anim: any }
const icons: { [icon: number]: IconType } = {
    [AnimatedIconName.Success]: { anim: successAnim },
    [AnimatedIconName.ConfirmationCheck]: {
        anim: confirmationCheck,
    },
    [AnimatedIconName.DeviceInteraction]: {
        anim: deviceInteraction,
    },
}

const AnimatedIcon: FunctionComponent<{
    icon: AnimatedIconName
    className?: string
    loop?: boolean
}> = ({ icon, className, loop }) => (
    <div className={className}>
        <Lottie
            options={{
                animationData: icons[icon].anim,
                autoplay: true,
                rendererSettings: {
                    preserveAspectRatio: "xMidYMid slice",
                },
                loop: loop ?? false,
            }}
            width="100%"
            height="100%"
            style={{ cursor: "default" }}
            isClickToPauseDisabled={true}
        />
    </div>
)

export default AnimatedIcon
