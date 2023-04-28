import classnames from "classnames"
import { FunctionComponent, useLayoutEffect, useRef } from "react"

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
    className?: string
    divFull?: boolean
    autoPositioning?: {
        paddingFromRight: number
    }
    children?: React.ReactNode
}> = ({
    children,
    content,
    disabled = false,
    top,
    right,
    bottom,
    left,
    className,
    divFull,
    autoPositioning = {
        paddingFromRight: 40,
    },
}) => {
    const ref = useRef<HTMLDivElement | null>(null)

    useLayoutEffect(() => {
        let paddingRight = autoPositioning.paddingFromRight ?? 14
        if (ref.current) {
            const placeholderRect = ref.current.getBoundingClientRect()
            const { innerWidth } = window
            const placeholderRightX = placeholderRect.x + placeholderRect.width
            if (placeholderRightX > innerWidth) {
                ref.current.style.transform = `translateX(${
                    innerWidth - placeholderRightX - paddingRight
                }px)`
            }
        }
    }, [autoPositioning.paddingFromRight])

    return disabled || !content ? (
        <>{children}</>
    ) : (
        <div className={classnames("group relative", divFull && "w-full")}>
            {children}
            <div
                ref={ref}
                className={classnames(
                    "absolute transform inline-block z-40",
                    "invisible opacity-0 group-hover:visible group-hover:opacity-100",
                    "pointer-events-none rounded-md bg-primary-black-default text-white shadow-md",
                    "transition-all duration-300 ease-out",
                    "p-1 text-xs font-medium",
                    top && `bottom-full mb-1.5`,
                    right && "left-full mr-1.5",
                    bottom && "top-full mt-1.5",
                    left && "right-full mr-1.5",
                    className && className
                )}
            >
                {content}
            </div>
        </div>
    )
}

export default GenericTooltip
