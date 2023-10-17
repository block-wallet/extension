import bridgeIcon from "../assets/images/icons/bridge.json"
import confirmationCheck from "../assets/images/icons/confirmation_check.json"
import deviceInteraction from "../assets/images/icons/device_interaction.json"
import blueLineLoadingSkeleton from "../assets/images/icons/blueline_skeleton.json"
import greyLineLoadingSkeleton from "../assets/images/icons/greyline_skeleton.json"
import greyCircleLoadingSkeleton from "../assets/images/icons/greycircle_skeleton.json"
import blueCircleLoadingSkeleton from "../assets/images/icons/bluecircle_skeleton.json"
import wallet from "../assets/images/icons/wallet.json"
import lottie, { AnimationItem } from "lottie-web"
import successAnim from "../assets/images/icons/checkmark_notes.json"
import { useEffect, useRef, FunctionComponent } from "react"
import classNames from "classnames"

export enum AnimatedIconName {
    Bridge,
    ConfirmationCheck,
    DeviceInteraction,
    Success,
    BlueLineLoadingSkeleton,
    GreyLineLoadingSkeleton,
    GreyCircleLoadingSkeleton,
    BlueCircleLoadingSkeleton,
    Wallet,
}

type AnimationType = {
    data: any
    autoplay?: boolean
    hover?: boolean
    loop?: boolean
}

const Animations: { [anim: number]: AnimationType } = {
    [AnimatedIconName.Bridge]: {
        autoplay: false,
        data: bridgeIcon,
        hover: true,
    },
    [AnimatedIconName.ConfirmationCheck]: {
        data: confirmationCheck,
    },
    [AnimatedIconName.DeviceInteraction]: {
        data: deviceInteraction,
        loop: true,
    },
    [AnimatedIconName.Success]: {
        data: successAnim,
    },
    [AnimatedIconName.BlueLineLoadingSkeleton]: {
        data: blueLineLoadingSkeleton,
        loop: true,
    },
    [AnimatedIconName.GreyLineLoadingSkeleton]: {
        data: greyLineLoadingSkeleton,
        loop: true,
    },
    [AnimatedIconName.GreyCircleLoadingSkeleton]: {
        data: greyCircleLoadingSkeleton,
        loop: true,
    },
    [AnimatedIconName.BlueCircleLoadingSkeleton]: {
        data: blueCircleLoadingSkeleton,
        loop: true,
    },
    [AnimatedIconName.Wallet]: {
        autoplay: false,
        data: wallet,
        hover: true,
    },
}

interface AnimationProps {
    icon: AnimatedIconName
    className?: string
    svgClassName?: string
}

const AnimatedIcon: FunctionComponent<AnimationProps> = ({
    icon,
    className,
    svgClassName,
}: AnimationProps) => {
    const element = useRef<HTMLDivElement>(null)
    const lottieInstance = useRef<AnimationItem>()

    const animationData = Animations[icon]

    useEffect(() => {
        if (element.current) {
            const instance = lottie.loadAnimation({
                animationData: animationData.data,
                autoplay: animationData.autoplay ?? true,
                rendererSettings: {
                    preserveAspectRatio: "xMidYMid slice",
                    className: svgClassName,
                },
                loop: animationData.loop ?? false,
                container: element.current,
            })

            instance.addEventListener("complete", () => {
                if (animationData.hover && !animationData.loop) {
                    instance.stop()
                }
            })

            lottieInstance.current = instance
        }

        return () => lottieInstance.current && lottieInstance.current.destroy()
    }, [animationData, svgClassName])

    return (
        <div
            className={classNames(className)}
            onMouseEnter={() => {
                if (animationData.hover) {
                    lottieInstance.current?.play()
                }
            }}
            ref={element}
        ></div>
    )
}

export default AnimatedIcon
