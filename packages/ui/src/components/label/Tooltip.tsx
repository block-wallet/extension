/* Wrapper element that contains this component should have class "group relative" */

import classnames from "classnames"
import { FunctionComponent, CSSProperties, useEffect, useMemo, useRef, useState } from "react"

type TooltipPlacement = "top" | "bottom" | "left" | "right"
type TooltipAlign = "start" | "center" | "end"

const getPlacementClasses = (
    placement: TooltipPlacement,
    align: TooltipAlign
): string => {
    switch (placement) {
        case "bottom": {
            const alignClass =
                align === "start"
                    ? "left-0 translate-x-0"
                    : align === "end"
                        ? "right-0 translate-x-0"
                        : "left-1/2 -translate-x-1/2"
            return `top-full mt-2 ${alignClass}`
        }
        case "left": {
            const alignClass =
                align === "start"
                    ? "top-0 translate-y-0"
                    : align === "end"
                        ? "bottom-0 translate-y-0"
                        : "top-1/2 -translate-y-1/2"
            return `right-full mr-2 ${alignClass}`
        }
        case "right": {
            const alignClass =
                align === "start"
                    ? "top-0 translate-y-0"
                    : align === "end"
                        ? "bottom-0 translate-y-0"
                        : "top-1/2 -translate-y-1/2"
            return `left-full ml-2 ${alignClass}`
        }
        case "top":
        default: {
            const alignClass =
                align === "start"
                    ? "left-0 translate-x-0"
                    : align === "end"
                        ? "right-0 translate-x-0"
                        : "left-1/2 -translate-x-1/2"
            return `bottom-full mb-2 ${alignClass}`
        }
    }
}

const Tooltip: FunctionComponent<{
    content: string | React.ReactElement
    className?: string
    placement?: TooltipPlacement
    align?: TooltipAlign
    wrap?: boolean
    style?: CSSProperties
    /**
     * If true, automatically flips the tooltip to avoid clipping the viewport.
     */
    autoFlip?: boolean
}> = ({
    content,
    className,
    placement = "top",
    align = "center",
    wrap = false,
    style,
    autoFlip = false,
}) => {
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const [finalPlacement, setFinalPlacement] = useState<TooltipPlacement>(placement)
    const [finalAlign, setFinalAlign] = useState<TooltipAlign>(align)

    const margin = 8

    const recompute = () => {
        if (!autoFlip) {
            setFinalPlacement(placement)
            setFinalAlign(align)
            return
        }
        const el = tooltipRef.current
        if (!el) return
        const parent = el.parentElement // expects wrapper has class "group relative"
        if (!parent) return

        const parentRect = parent.getBoundingClientRect()
        // Temporarily ensure tooltip has its content-measurable size
        const tooltipRect = el.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight

        let nextPlacement: TooltipPlacement = placement
        let nextAlign: TooltipAlign = align

        // Decide vertical vs horizontal placement
        if (placement === "top" || placement === "bottom") {
            const spaceTop = parentRect.top
            const spaceBottom = vh - parentRect.bottom
            const needH = tooltipRect.height + margin
            if (placement === "top" && spaceTop < needH && spaceBottom > spaceTop) {
                nextPlacement = "bottom"
            } else if (placement === "bottom" && spaceBottom < needH && spaceTop > spaceBottom) {
                nextPlacement = "top"
            }

            // Align horizontally to avoid overflow
            const center = parentRect.left + parentRect.width / 2
            const halfW = tooltipRect.width / 2
            if (center - halfW - margin < 0) {
                nextAlign = "start"
            } else if (center + halfW + margin > vw) {
                nextAlign = "end"
            } else {
                nextAlign = align
            }
        } else {
            // left/right
            const spaceLeft = parentRect.left
            const spaceRight = vw - parentRect.right
            const needW = tooltipRect.width + margin
            if (placement === "left" && spaceLeft < needW && spaceRight > spaceLeft) {
                nextPlacement = "right"
            } else if (placement === "right" && spaceRight < needW && spaceLeft > spaceRight) {
                nextPlacement = "left"
            }

            // Align vertically to avoid overflow
            const middle = parentRect.top + parentRect.height / 2
            const halfH = tooltipRect.height / 2
            if (middle - halfH - margin < 0) {
                nextAlign = "start"
            } else if (middle + halfH + margin > vh) {
                nextAlign = "end"
            } else {
                nextAlign = align
            }
        }

        setFinalPlacement(nextPlacement)
        setFinalAlign(nextAlign)
    }

    useEffect(() => {
        recompute()
        // Recompute on resize to adapt to viewport changes
        const onResize = () => recompute()
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, wrap, placement, align, autoFlip])

    const placementClasses = useMemo(
        () => getPlacementClasses(autoFlip ? finalPlacement : placement, autoFlip ? finalAlign : align),
        [finalPlacement, finalAlign, placement, align, autoFlip]
    )

    return (
        <div
            ref={tooltipRef}
            className={classnames(
                className || "",
                "pointer-events-none absolute p-2 text-xs font-medium shadow-lg rounded-md",
                placementClasses,
                wrap ? "whitespace-normal break-words" : "whitespace-nowrap",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border border-gray-800 dark:border-gray-200",
                "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-[100] w-max max-w-xs h-fit"
            )}
            style={style}
        >
            <div className="relative">
                <span className="flex flex-row items-center">{content}</span>
            </div>
        </div>
    )
}

export default Tooltip
