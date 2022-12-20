import { FC } from "react"

interface IconProps {
    profile?: "normal" | "outlined" | "info"
    size?: string
    className?: string
}

interface ColorsDef {
    background: string
    icon: string
}

interface ProfileDef {
    [key: string]: ColorsDef
}

const PROFILES: ProfileDef = {
    normal: {
        background: "#F9F2E7",
        icon: "#FFBB54",
    },
    info: {
        background: "#49c5ff",
        icon: "white",
    },
    outlined: {
        background: "#FFBB54",
        icon: "white",
    },
}

const ExclamationCircleIconFull: FC<IconProps> = (props: any) => {
    const { profile = "normal", size = "20", className = "" } = props
    const { background, icon } = PROFILES[profile] || PROFILES.normal
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="24" height="24" rx="12" fill={background} />
            <path
                d="M12.961 13.633L13.359 6H10.656L11.055 13.633H12.961Z"
                fill={icon}
            />
            <path
                d="M12 18C12.8284 18 13.5 17.3284 13.5 16.5C13.5 15.6716 12.8284 15 12 15C11.1716 15 10.5 15.6716 10.5 16.5C10.5 17.3284 11.1716 18 12 18Z"
                fill={icon}
            />
        </svg>
    )
}

export default ExclamationCircleIconFull
