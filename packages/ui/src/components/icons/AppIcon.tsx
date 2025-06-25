import classnames from "classnames"
import { useState, useEffect } from "react"

interface AppIconProps {
    size: number
    iconURL: string
    iconSize?: number
    title?: string
    background?: boolean
    fallbackURL?: string
}

const AppIcon = ({
    size,
    iconURL,
    iconSize,
    background = true,
    title,
    fallbackURL,
}: AppIconProps) => {
    const [currentIconURL, setCurrentIconURL] = useState(iconURL)
    const [fallbackAttempted, setFallbackAttempted] = useState(false)

    // Reset state when iconURL prop changes
    useEffect(() => {
        setCurrentIconURL(iconURL)
        setFallbackAttempted(false)
    }, [iconURL])

    const handleImageError = () => {
        if (!fallbackAttempted && fallbackURL && currentIconURL !== fallbackURL) {
            setCurrentIconURL(fallbackURL)
            setFallbackAttempted(true)
        } else {
            // If fallback also fails, hide the image
            setCurrentIconURL("")
        }
    }

    return (
        <div
            className={classnames(
                "flex flex-row items-center justify-center rounded-full",
                `w-${size} h-${size}`,
                background && "bg-primary-grey-default"
            )}
        >
            {currentIconURL ? (
                <img
                    alt="icon"
                    src={currentIconURL}
                    draggable={false}
                    className={classnames(
                        "h-full",
                        background ? "max-h-6" : "max-h-11"
                    )}
                    title={title}
                    onError={handleImageError}
                />
            ) : null}
        </div>
    )
}
export default AppIcon
