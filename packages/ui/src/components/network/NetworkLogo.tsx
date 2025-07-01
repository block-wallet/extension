import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import { FunctionComponent, useState } from "react"
import { classnames } from "../../styles"

interface NetworkLogoProps {
    name: string
    logo?: string
    bigLogo?: boolean
}

const NetworkLogo: FunctionComponent<NetworkLogoProps> = ({
    logo = unknownTokenIcon,
    name,
    bigLogo = false,
}) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    const handleImageError = () => {
        setImageError(true)
    }

    const handleImageLoad = () => {
        setImageLoaded(true)
    }

    return (
        <div
            className={classnames(
                "flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full transition-all duration-200",
                bigLogo ? "w-8 h-8" : "w-6 h-6"
            )}
        >
            {!imageLoaded && !imageError && (
                <div
                    className={classnames(
                        "bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse",
                        bigLogo ? "w-8 h-8" : "w-6 h-6"
                    )}
                />
            )}
            <img
                className={classnames(
                    "rounded-full object-cover transition-opacity duration-200",
                    imageLoaded ? "opacity-100" : "opacity-0",
                    bigLogo ? "w-8 h-8" : "w-6 h-6"
                )}
                src={imageError ? unknownTokenIcon : logo}
                alt={name}
                onError={handleImageError}
                onLoad={handleImageLoad}
                loading="lazy"
            />
        </div>
    )
}

export default NetworkLogo
