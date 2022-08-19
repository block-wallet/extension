import { FunctionComponent } from "react"
import styled, { keyframes } from "styled-components"

import arrow from "../../assets/images/icons/arrow_margin.svg"

interface RotateProp {
    rotate: string
}

const HoverAnimation = styled.div<RotateProp>`
    background-repeat: repeat;
    background-position-y: 0;
    a:hover > div > & {
        animation: ${keyframes`
      from {
        background-position-y: 0;
      }
      to {
        background-position-y: 4rem;
      }
    `} 0.4s backwards;
    }
    transform: ${(props) => `rotate(${props.rotate})`};
`
const ROTATE = {
    top: "0deg",
    right: "270deg",
    down: "180deg",
    left: "90deg",
}
interface ArrowHoverAnimationProps {
    direction?: "top" | "right" | "left" | "down"
    children?: React.ReactNode
}
const ArrowHoverAnimation: FunctionComponent<ArrowHoverAnimationProps> = ({
    children,
    direction = "top",
}) => (
    <HoverAnimation
        rotate={ROTATE[direction]}
        className="w-full h-full"
        style={{
            backgroundImage: `url(${arrow})`,
            backgroundSize: "32px 32px",
            backgroundPosition: "center",
        }}
    >
        {children}
    </HoverAnimation>
)

export default ArrowHoverAnimation
