import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { FunctionComponent } from "react"

interface NetworkLogoProps {
    name: string
    iconUrl?: string
}

const NetworkLogo: FunctionComponent<NetworkLogoProps> = ({
    iconUrl = unknownTokenIcon,
    name,
}) => {
    return (
        <img
            src={iconUrl}
            onError={(e) => {
                ;(e.target as any).onerror = null
                ;(e.target as any).src = unknownTokenIcon
            }}
            alt={name}
        />
    )
}

export default NetworkLogo
