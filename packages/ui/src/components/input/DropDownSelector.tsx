import React, { useState, useRef, useEffect, FunctionComponent } from "react"

// Components
import ErrorMessage from "../../components/error/ErrorMessage"

// Style
import classNames from "classnames"

// Assets
import arrowDown from "../../assets/images/icons/arrow_down.svg"
import { Classes } from "../../styles"

// Types
type DropDownSelectorType = {
    title: string | React.ReactNode
    subtitle: string
    topMargin: number
    bottomMargin: number
    popupMargin: number
    error?: any
    children: any
    disabled?: boolean
    isShort?: boolean
    customWidth?: string
    isWhite?: boolean
    isSmall?: boolean
}

/**
 * DropDownSelector:
 * Creates a Dropdown selector who can contain anything passed as a child.
 * On click will show a responsive Popup who will take maximum size available between his Display and parent container's top or bottom.
 *
 * @param title - Display title.
 * @param subtitle - Display subtitle.
 * @param topMargin - The space between the top of DropDownSelector and the top of the page (size of header for example).
 * @param bottomMargin - The space between the bottom of DropDownSelector and the bottom of the page (size of footer for example).
 * @param popupMargin - Margin between top / bottom of the popup and the top / bottom of DropDownSelector parent.
 * @param error - If needed, the error to display.
 * @param disabled - Shows popup on click or not.
 * @param isShort - when height should be smaller, e.g. parent is not 100% width
 * @param customWidth - custom width for dropdown
 * @param isWhite - for bg white dropdowns
 * @param isSmall - for narrow dropdowns with less padding
 */
const DropDownSelector: FunctionComponent<DropDownSelectorType> = ({
    title,
    subtitle,
    topMargin,
    bottomMargin,
    popupMargin,
    error = "",
    disabled,
    children,
    isShort = false,
    customWidth,
    isWhite = false,
    isSmall = false,
}) => {
    // State
    const [active, setActive] = useState<boolean>(false)
    const [distFromMidToTop, setDistFromMidToTop] = useState<number>(0)
    const [viewHeight, setViewHeight] = useState<number>(0)

    // Refs
    const displayRef = useRef<any>(null)
    const popupRef = useRef<any>(null)

    // Hooks
    useEffect(() => {
        setDistFromMidToTop(
            displayRef.current.getBoundingClientRect().top +
                displayRef.current.getBoundingClientRect().height / 2 -
                164
        ) // Distance from the middle of DropDownSelector container to the top of DropDownSelector container.
        setViewHeight(600 / 2 - (topMargin + bottomMargin)) // Total Height - (Space between top of the page and DropDownSelector container's top + Space between bottom of the page and DropDownSelector container's bottom)

        window.addEventListener("click", (e: any) => {
            checkTargetClick(e.target)
        })
    }, [topMargin, bottomMargin])

    // Functions
    const checkTargetClick = (target: any) => {
        // Check if click is outside popup & close if true
        if (popupRef.current && displayRef.current) {
            if (
                !popupRef.current.contains(target) &&
                !displayRef.current.contains(target)
            ) {
                setActive(false)
            }
        }
    }

    return (
        <div className="relative">
            {/* Display */}
            <div
                className={classNames(
                    Classes.blueSection,
                    active && "bg-primary-200",
                    error !== ""
                        ? "border-red-400"
                        : isWhite
                        ? ""
                        : "border-opacity-0 border-transparent",
                    isWhite ? "bg-white border-grey-100" : "bg-primary-100"
                )}
                onClick={() => !disabled && setActive(!active)}
                ref={displayRef}
                style={{ padding: isSmall ? "6px 16px" : "16px" }} // Has to be define this way to be read by script.
            >
                <div
                    className={classNames(
                        "flex flex-col justify-center w-full",
                        isShort || isSmall ? "h-7" : "h-11"
                    )}
                >
                    <div
                        className={classNames(
                            "text-base font-semibold overflow-ellipsis overflow-hidden max-w-full",
                            subtitle !== "" ? "mb-1" : null
                        )}
                    >
                        {title}
                    </div>
                    <div className="text-xs text-gray-600">{subtitle}</div>
                </div>
                <div className="flex justify-center items-center w-8 h-full">
                    <img
                        src={arrowDown}
                        className="w-3 h-2 text-black"
                        alt=""
                        style={{
                            transform: `${active ? "rotate(180deg)" : "none"}`,
                        }}
                    />
                </div>
            </div>

            {/* Error */}
            <div className={`${error ? "pl-1 my-2" : null}`}>
                <ErrorMessage error={error} />
            </div>

            {/* Popup */}
            <div
                className={`
                    shadow-lg bg-white rounded-md absolute z-50 w-full my-2 overflow-y-auto select-none
                    ${
                        active
                            ? "opacity-1"
                            : "opacity-0 pointer-events-none" /* Avoid reading size problem when not display */
                    }
                    ${
                        distFromMidToTop < viewHeight
                            ? "top-full"
                            : "bottom-full" /* Determine if Popup should appear on top or on bottom of the Display element */
                    }
                `}
                style={{
                    /* Responsive Popup using size of the Display parent container */
                    maxHeight: `
                        ${
                            distFromMidToTop < viewHeight
                                ? 600 - // Total Window Height
                                  (topMargin + bottomMargin) - // Top margin + Bottom margin
                                  parseInt(
                                      displayRef.current?.style.paddingBottom.replace(
                                          "px",
                                          ""
                                      )
                                  ) -
                                  popupMargin - // Popup margin
                                  displayRef.current?.getBoundingClientRect()
                                      .bottom + // Top of Display element
                                  displayRef.current?.getBoundingClientRect()
                                      .height
                                : displayRef.current?.getBoundingClientRect()
                                      .top - // Top of Display element
                                  parseInt(
                                      displayRef.current?.style.paddingTop.replace(
                                          "px",
                                          ""
                                      )
                                  ) - // Padding
                                  topMargin - // Top margin
                                  popupMargin // Popup margin
                        }px`,
                    width: `${customWidth ? customWidth : "100%"}`,
                }}
                ref={popupRef}
            >
                {/* Pass setActive method to children - To access it, call props.setActive on direct children react components*/}
                {React.Children.map(children, (child) => {
                    return child.type !== "div"
                        ? React.cloneElement(child, { setActive })
                        : React.cloneElement(child)
                })}
            </div>
        </div>
    )
}

export default DropDownSelector
