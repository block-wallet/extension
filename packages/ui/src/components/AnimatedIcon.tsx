import { FunctionComponent } from "react"

import Lottie from "react-lottie"

import successAnim from "../assets/images/icons/checkmark_notes.json"
import confirmationCheck from "../assets/images/icons/confirmation_check.json"
import deviceInteraction from "../assets/images/icons/device_interaction.json"
import blueLineLoadingSkeleton from "../assets/images/icons/blueline_skeleton.json"
import greyLineLoadingSkeleton from "../assets/images/icons/greyline_skeleton.json"
import greyCircleLoadingSkeleton from "../assets/images/icons/greycircle_skeleton.json"
import blueCircleLoadingSkeleton from "../assets/images/icons/bluecircle_skeleton.json"

export enum AnimatedIconName {
    Success,
    ConfirmationCheck,
    DeviceInteraction,
    BlueLineLoadingSkeleton,
    GreyLineLoadingSkeleton,
    GreyCircleLoadingSkeleton,
    BlueCircleLoadingSkeleton,
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
    [AnimatedIconName.BlueLineLoadingSkeleton]: {
        anim: blueLineLoadingSkeleton,
    },
    [AnimatedIconName.GreyLineLoadingSkeleton]: {
        anim: greyLineLoadingSkeleton,
    },
    [AnimatedIconName.GreyCircleLoadingSkeleton]: {
        anim: greyCircleLoadingSkeleton,
    },
    [AnimatedIconName.BlueCircleLoadingSkeleton]: {
        anim: blueCircleLoadingSkeleton,
    },
}

const AnimatedIcon: FunctionComponent<{
    icon: AnimatedIconName
    className?: string
    loop?: boolean
    svgClassName?: string
}> = ({ icon, className, loop, svgClassName }) => (
    <div className={className}>
        <Lottie
            options={{
                animationData: icons[icon].anim,
                autoplay: true,
                rendererSettings: {
                    preserveAspectRatio: "xMidYMid slice",
                    className: svgClassName,
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
