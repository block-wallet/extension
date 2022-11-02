import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { FunctionComponent } from "react"
import { classnames } from "../../styles"

interface TokenLogoProps {
    name: string
    logo?: string
    bigLogo?: boolean
    className?: string
}

const TokenLogo: FunctionComponent<TokenLogoProps> = ({
    logo = unknownTokenIcon,
    name,
    bigLogo = false,
    className,
}) => {
    return (
        <div
            className={classnames(
                "flex flex-none items-center justify-center",
                bigLogo ? "w-8 h-8" : "w-6 h-6",
                className
            )}
        >
            <img
                className={"rounded-full"}
                src={logo}
                alt={name}
                onError={(e) => {
                    ;(e.target as any).onerror = null
                    ;(e.target as any).src = unknownTokenIcon
                }}
            />
        </div>
    )
}

export default TokenLogo
