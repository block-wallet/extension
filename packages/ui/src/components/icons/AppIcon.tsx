import classnames from "classnames"

interface AppIconProps {
    size: number
    iconURL: string
    iconSize?: number
    title?: string
    background?: boolean
}

const AppIcon = ({
    size,
    iconURL,
    iconSize,
    background = true,
    title,
}: AppIconProps) => {
    const imgClassName = iconSize ? `max-h-${iconSize}` : `max-h-${size - 3}`

    return (
        <div
            className={classnames(
                "flex flex-row items-center justify-center rounded-full",
                `w-${size} h-${size}`,
                background && "bg-primary-grey-default"
            )}
        >
            {iconURL ? (
                <img
                    alt="icon"
                    src={iconURL}
                    draggable={false}
                    className={classnames("h-full", imgClassName)}
                    title={title}
                />
            ) : null}
        </div>
    )
}
export default AppIcon
