import React from "react"

type CheckmarkCircleProps = {
    color?: string
    animate?: boolean
    classes?: string
    size?: string
}

const CheckmarkCircle = (props: CheckmarkCircleProps) => {
    const { color = "#3DCA75", classes = "", size = "16" } = props

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={classes}
        >
            <rect opacity="0.1" width="24" height="24" rx="12" fill={color} />
            <path
                d="M16.2929 7.29341L9.99992 13.5864L7.70692 11.2934C7.51832 11.1112 7.26571 11.0105 7.00352 11.0127C6.74132 11.015 6.49051 11.1202 6.3051 11.3056C6.11969 11.491 6.01452 11.7418 6.01224 12.004C6.00997 12.2662 6.11076 12.5188 6.29292 12.7074L9.29292 15.7074C9.48045 15.8949 9.73475 16.0002 9.99992 16.0002C10.2651 16.0002 10.5194 15.8949 10.7069 15.7074L17.7069 8.70741C17.8891 8.5188 17.9899 8.2662 17.9876 8.00401C17.9853 7.74181 17.8801 7.491 17.6947 7.30559C17.5093 7.12018 17.2585 7.01501 16.9963 7.01273C16.7341 7.01045 16.4815 7.11125 16.2929 7.29341Z"
                fill={color}
            />
        </svg>
    )
}

export default CheckmarkCircle
