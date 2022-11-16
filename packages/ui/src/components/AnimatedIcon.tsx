import bridgeIcon from "../assets/images/icons/bridge.json"
import confirmationCheck from "../assets/images/icons/confirmation_check.json"
import deviceInteraction from "../assets/images/icons/device_interaction.json"
import lottie, { AnimationItem } from "lottie-web"
import successAnim from "../assets/images/icons/checkmark_notes.json"
import { useEffect, useRef, FunctionComponent } from "react"
import classNames from "classnames"

export enum AnimatedIconName {
    Bridge,
    ConfirmationCheck,
    DeviceInteraction,
    Success,
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
}

interface AnimationProps {
    icon: AnimatedIconName
    className?: string
}

const AnimatedIcon: FunctionComponent<AnimationProps> = ({
    icon,
    className,
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
    }, [animationData])

    return (
        <div
            className={classNames(className, "w-full h-full")}
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
