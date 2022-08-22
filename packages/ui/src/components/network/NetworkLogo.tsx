import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { FunctionComponent } from "react"
import { classnames } from "../../styles"

interface NetworkLogoProps {
    name: string
    logoURI?: string
    bigLogo?: boolean
}

const NetworkLogo: FunctionComponent<NetworkLogoProps> = ({
    logoURI = unknownTokenIcon,
    name,
    bigLogo = false,
}) => {
    return (
        <div
            className={classnames(
                "flex items-center justify-center rounded-full",
                bigLogo ? "w-8 h-8" : "w-6 h-6"
            )}
        >
            <img
                className="rounded-full"
                src={logoURI}
                alt={name}
                onError={(e) => {
                    ;(e.target as any).onerror = null
                    ;(e.target as any).src = unknownTokenIcon
                }}
            />
        </div>
    )
}

export default NetworkLogo
