import React from "react"

const MiniCheckmark = (props: { fill: string }) => (
    <svg
        width="16"
        height="11"
        viewBox="0 0 16 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 10.9999C5.7348 10.9999 5.48049 10.8945 5.293 10.7069L0.585999 5.99994L2 4.58594L6 8.58594L14 0.585938L15.414 1.99994L6.707 10.7069C6.51951 10.8945 6.26519 10.9999 6 10.9999Z"
            fill={props.fill}
        />
    </svg>
)

export default MiniCheckmark
