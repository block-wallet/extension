import React, { FunctionComponent } from "react"

// Assets
import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import classnames from "classnames"

type TokenLogoType = {
    src?: string
    alt: string
    className?: string
}

const TokenLogo: FunctionComponent<TokenLogoType> = ({
    src,
    alt,
    className,
}) => {
    return (
        <img
            src={!src ? unknownTokenIcon : src}
            onError={(e) => {
                ;(e.target as any).onerror = null
                ;(e.target as any).src = unknownTokenIcon
            }}
            alt={alt}
            className={classnames("rounded-full", className)}
        />
    )
}

export default TokenLogo
