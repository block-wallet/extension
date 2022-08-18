import styled from "styled-components"

// styles
const Dots = styled.span`
    &::after {
        display: inline-block;
        animation: ellipsis 1.25s infinite;
        content: "";
        width: 1em;
        text-align: left;
    }
    @keyframes ellipsis {
        0% {
            content: "";
        }
        25% {
            content: ".";
        }
        50% {
            content: "..";
        }
        75% {
            content: "...";
        }
    }
`

const LoadingDots = () => {
    return <Dots />
}

// return
export default LoadingDots
