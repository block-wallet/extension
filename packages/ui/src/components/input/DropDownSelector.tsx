import { useState, useRef, useEffect, FC, Children, cloneElement } from "react"
import arrowDown from "../../assets/images/icons/arrow_down.svg"
import classNames from "classnames"
import { Classes, classnames } from "../../styles"

// Types
type DropDownSelectorProps = {
    display: any
    topMargin: number
    bottomMargin: number
    popupMargin: number
    children: any
    error?: string
    disabled?: boolean
    customWidth?: string
    className?: string
}

/**
 * DropDownSelector
 * Creates a Dropdown selector who can contain anything passed as a child.
 * On click will show a responsive Popup who will take maximum size available between his Display and parent container's top or bottom.
 *
 * @param display - Display element
 * @param topMargin - The space between the top of DropDownSelector and the top of the page (size of header for example).
 * @param bottomMargin - The space between the bottom of DropDownSelector and the bottom of the page (size of footer for example).
 * @param popupMargin - Margin between top / bottom of the popup and the top / bottom of DropDownSelector parent.
 * @param error - If needed, the error to display.
 * @param disabled - Shows popup on click or not.
 * @param customWidth - Custom dropdown width
 */
const DropDownSelector: FC<DropDownSelectorProps> = ({
    display,
    topMargin,
    bottomMargin,
    className,
    popupMargin,
    error,
    disabled,
    children,
    customWidth,
}) => {
    // State
    const [active, setActive] = useState<boolean>(false)
    const [midToTopDistance, setMidToTopDistance] = useState<number>(0)
    const [maxHeightInPx, setMaxHeightInPx] = useState<number>(0)

    // Refs
    const displayRef = useRef<HTMLDivElement | null>(null)
    const popupRef = useRef<HTMLDivElement | null>(null)

    const viewHeight = 600 / 2 - (topMargin + bottomMargin) // Total Height - (Space between top of the page and DropDownSelector container's top + Space between bottom of the page and DropDownSelector container's bottom)

    // Check if click is outside popup & close if true
    const checkTargetClick = (target: any) => {
        if (popupRef.current && displayRef.current) {
            if (
                !popupRef.current.contains(target) &&
                !displayRef.current.contains(target)
            ) {
                setActive(false)
            }
        }
    }

    useEffect(() => {
        window.addEventListener("click", (e: any) => {
            checkTargetClick(e.target)
        })

        if (displayRef.current !== null) {
            const midToTopDistanceCalc =
                displayRef.current.getBoundingClientRect().top +
                displayRef.current.getBoundingClientRect().height / 2 -
                164 // Distance from the middle of DropDownSelector container to the top of DropDownSelector container.

            const maxHeightInPxCalc =
                midToTopDistanceCalc < viewHeight
                    ? 600 - // Total Window Height
                      (topMargin + bottomMargin) - // Top margin + Bottom margin
                      16 - // Padding Bottom
                      popupMargin - // Popup margin
                      displayRef.current.getBoundingClientRect().bottom + // Top of Display element
                      displayRef.current.getBoundingClientRect().height
                    : displayRef.current.getBoundingClientRect().top - // Top of Display element
                      16 - // Padding Top
                      topMargin - // Top margin
                      popupMargin // Popup margin

            setMaxHeightInPx(maxHeightInPxCalc)
            setMidToTopDistance(midToTopDistanceCalc)
        }
        // eslint-disable-next-line
    }, [])

    return (
        <div className="relative">
            {/* Display */}
            <div
                className={classNames(
                    Classes.blueSection,
                    "h-[4.5rem]",
                    "space-x-1",
                    active && Classes.blueSectionActive,
                    disabled && Classes.blueSelectionDisabled,
                    error
                        ? "border-red-400"
                        : "border-opacity-0 border-transparent",
                    className
                )}
                onClick={() => !disabled && setActive(!active)}
                ref={displayRef}
            >
                {display}
                <div className="flex justify-center items-center">
                    <img
                        alt="active-arrow"
                        src={arrowDown}
                        className={classnames(
                            "w-3 h-2 text-black",
                            active && "rotate-180"
                        )}
                    />
                </div>
            </div>

            {/* Popup */}
            <div
                className={classNames(
                    "absolute shadow-lg bg-white rounded-md z-30 my-2 overflow-y-auto select-none border-[0.5px] border-gray-200",
                    customWidth || "w-full",
                    active ? "opacity-1" : "opacity-0 pointer-events-none", // Avoid reading size problem when not display
                    midToTopDistance < viewHeight ? "top-full" : "bottom-full" // Determine if Popup should appear on top or on bottom of the Display element
                )}
                style={{
                    maxHeight: `${maxHeightInPx}px`,
                    minHeight:
                        midToTopDistance > viewHeight
                            ? `${maxHeightInPx}px`
                            : undefined,
                }}
                ref={popupRef}
            >
                {/* Pass setActive method to children - To access it, call props.setActive on direct children react components*/}
                {active &&
                    Children.map(children, (child) => {
                        return child.type !== "div"
                            ? cloneElement(child, { setActive, ...child.props })
                            : cloneElement(child, { ...child.props })
                    })}
            </div>
        </div>
    )
}

export default DropDownSelector
