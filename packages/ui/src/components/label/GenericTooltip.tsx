import classnames from "classnames"
import { FunctionComponent } from "react"

/**
 * Generic tooltip component.
 * Easy to setup using the defaults, you can assign more than one.
 * The center props will align the children to the origin, which is the (right,down) corner of the parent div.
 * For more precise alignment use one (or none) along with the className prop.
 * For help with positioning see: https://tailwindcss.com/docs/top-right-bottom-left .
 * Make sure you don't create the classes dynamically due to purge css.
 *
 * @param content Displayed content
 * @param disabled If true it will just return the children
 * @param top.right.bottom.left Basic alignment defaults, you can choose more than one
 */
const GenericTooltip: FunctionComponent<{
    content: string | React.ReactElement
    disabled?: boolean
    top?: boolean
    right?: boolean
    bottom?: boolean
    left?: boolean
    centerX?: boolean
    centerY?: boolean
    className?: string
    divFull?: boolean
    children?: React.ReactNode
}> = ({
    children,
    content,
    disabled = false,
    top,
    right,
    bottom,
    left,
    centerX,
    centerY,
    className,
    divFull,
}) => {
    return disabled ? (
        <>{children}</>
    ) : (
        <div className={classnames("group relative", divFull && "w-full")}>
            {children}
            <div
                className={classnames(
                    "absolute transform inline-block z-40",
                    "invisible opacity-0 group-hover:visible group-hover:opacity-95",
                    "pointer-events-none rounded-md bg-white shadow-md",
                    "transition-all duration-300 ease-out",
                    "p-1 text-xs",
                    top && `bottom-full mb-1.5`,
                    right && "left-full mr-1.5",
                    bottom && "top-full mt-1.5",
                    left && "right-full mr-1.5",
                    centerX && "-translate-x-2/4",
                    centerY && "-translate-y-2/4",
                    className && className
                )}
            >
                {content}
            </div>
        </div>
    )
}

export default GenericTooltip
