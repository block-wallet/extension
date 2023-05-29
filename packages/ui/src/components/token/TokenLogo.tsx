import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { FunctionComponent, useEffect, useState } from "react"
import { Classes, classnames } from "../../styles"

interface TokenLogoProps {
    name: string
    logo?: string
    logoSize?: "small" | "medium" | "big"
    className?: string
    filled?: boolean
}

const TokenLogo: FunctionComponent<TokenLogoProps> = ({
    logo = unknownTokenIcon,
    name,
    logoSize = "medium",
    className,
    filled,
}) => {
    const [divClassName, setDivClassName] = useState(Classes.roundedIcon)

    useEffect(() => {
        switch (logoSize) {
            case "small":
                setDivClassName(
                    filled
                        ? Classes.smallRoundedIcon
                        : Classes.smallRoundedFilledIcon
                )
                break
            case "medium":
                setDivClassName(
                    filled
                        ? Classes.mediumRoundedIcon
                        : Classes.mediumRoundedFilledIcon
                )
                break
            case "big":
                setDivClassName(
                    filled ? Classes.roundedIcon : Classes.roundedFilledIcon
                )
                break
        }
    }, [logoSize, filled])

    return (
        <div className={classnames(divClassName, className)}>
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
