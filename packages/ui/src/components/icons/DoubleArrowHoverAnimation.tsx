import React, { FunctionComponent } from "react"
import styled, { keyframes } from "styled-components"

import vector from "../../assets/images/icons/vector_right.svg"

const HoverAnimation = styled.div`
    background-repeat: repeat;
    background-position-y: 0;
    a:hover > div > & {
        .left-animation {
            animation: ${keyframes`
            from {
              background-position-x: 0rem;
            }
            to {
              background-position-x: 3.5rem;
            }
          `} 0.8s backwards;
        }

        .right-animation {
            animation: ${keyframes`
            from {
              background-position-x: 0rem;
            }
            to {
              background-position-x: 3.5rem;
            }
          `} 0.8s;
        }
    }
`

const DoubleArrowHoverAnimation: FunctionComponent<{
    children?: React.ReactNode
}> = ({ children }) => (
    <HoverAnimation className="flex flex-col items-center w-full h-full p-2">
        <div
            className="w-full h-full right-animation"
            style={{
                backgroundImage: `url(${vector})`,
                backgroundSize: "32px 100%",
                backgroundPosition: "center",
            }}
        >
            {children}
        </div>
        <div
            className="w-full h-full left-animation"
            style={{
                backgroundImage: `url(${vector})`,
                backgroundSize: "32px 100%",
                backgroundPosition: "center",
                transform: "rotate(180deg)",
            }}
        >
            {children}
        </div>
    </HoverAnimation>
)

export default DoubleArrowHoverAnimation
