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
                    className={classnames(
                        "h-full",
                        background ? "max-h-6" : "max-h-11"
                    )}
                    title={title}
                />
            ) : null}
        </div>
    )
}
export default AppIcon
