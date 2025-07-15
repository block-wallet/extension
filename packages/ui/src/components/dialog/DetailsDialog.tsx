import { FunctionComponent, useState, useEffect, useRef } from "react"
import Dialog from "./Dialog"
import useCopyToClipboard from "../../util/hooks/useCopyToClipboard"
import { themeColors, cn } from "../../styles/theme"

// Icons
import { HiOutlineExternalLink, HiOutlineX, HiChevronDown, HiChevronUp } from "react-icons/hi"

export type option = {
    title: string | JSX.Element
    content: string | JSX.Element | undefined
    expandable?: boolean // if true, full content will be shown on click otherwise only first line
    link?: string
    copyable?: boolean // if true, content will be copied to clipboard on click. preferably not used with expandable
}

type TextSizes = "text-base" | "text-lg" | "text-sm" | "text-xs"

type DetailsDialogProps = {
    title: string
    itemTitleSize?: TextSizes
    itemContentSize?: TextSizes
    titleSize?: TextSizes
    fixedTitle?: boolean
    open: boolean
    onClose: () => void
    options: option[]
    expandedByDefault?: boolean // if true, all options will be expanded by default
    onOption?: (option: option) => React.ReactNode
    showUndefined?: boolean
}

const DetailsDialog: FunctionComponent<DetailsDialogProps> = ({
    title,
    open,
    onClose,
    options,
    itemTitleSize = "text-base",
    itemContentSize = "text-sm",
    titleSize = "text-lg",
    fixedTitle = false,
    expandedByDefault = false,
    onOption,
    showUndefined = false,
}) => {
    const [expends, setExpends] = useState<boolean[]>(
        new Array(options.length).fill(expandedByDefault)
    )
    const [copiedMessage, setCopiedMessage] = useState<string>("")

    const { onCopy } = useCopyToClipboard()

    const previousLengthRef = useRef(options.length)

    const handleCopy = (content: string) => {
        onCopy(content)
        setCopiedMessage("Copied to clipboard!")
        setTimeout(() => setCopiedMessage(""), 2000)
    }

    useEffect(() => {
        if (options.length === previousLengthRef.current) return

        setExpends(new Array(options.length).fill(expandedByDefault))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <Dialog open={open} onClickOutside={() => onClose()}>
            <div
                className={cn("flex flex-col", !fixedTitle && "px-3")}
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                style={{ height: "calc(100vh - 8rem)" }}
            >
                {fixedTitle && (
                    <div className="w-full">
                        <h2
                            id="dialog-title"
                            className={cn(
                                titleSize,
                                "font-semibold pl-2 pb-3",
                                themeColors.text.primary
                            )}
                        >
                            {title}
                        </h2>
                        <div className="-mx-3">
                            <hr className="border-gray-200 dark:border-gray-700" />
                        </div>
                    </div>
                )}

                <div className={cn(
                    "grow mb-auto overflow-auto -mr-3",
                    fixedTitle && "px-3"
                )}>
                    <span className="absolute top-0 right-0 p-4">
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                "hover:bg-gray-200 dark:hover:bg-gray-700",
                                "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                                themeColors.text.secondary,
                                "hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                            aria-label="Close dialog"
                            title="Close dialog"
                        >
                            <HiOutlineX className="w-5 h-5" />
                        </button>
                    </span>

                    {!fixedTitle && (
                        <h2
                            id="dialog-title"
                            className={cn(
                                titleSize,
                                "font-semibold",
                                themeColors.text.primary
                            )}
                        >
                            {title}
                        </h2>
                    )}

                    {/* Copy Notification - Overlay */}
                    {copiedMessage && (
                        <div className={cn(
                            "absolute top-16 left-1/2 transform -translate-x-1/2 z-50",
                            "px-4 py-2 rounded-lg shadow-lg",
                            "bg-green-50 dark:bg-green-900/90 text-green-700 dark:text-green-300",
                            "border border-green-200 dark:border-green-800",
                            "text-sm font-medium animate-pulse"
                        )}>
                            {copiedMessage}
                        </div>
                    )}

                    <div className="flex flex-col space-y-4 mt-6 mb-6">
                        {options
                            .filter((option) => !!option.content || showUndefined)
                            .map((option, i) => {
                                if (onOption) return onOption(option)

                                const isExpanded = expends[i]
                                const canExpand = option.expandable
                                const canCopy = option.copyable && typeof option.content === "string"

                                return (
                                    <div
                                        key={typeof option.title === "string" ? option.title : i}
                                        className="space-y-2"
                                    >
                                        {/* Item Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                {typeof option.title === "string" ? (
                                                    <h3 className={cn(
                                                        itemTitleSize,
                                                        "font-semibold",
                                                        themeColors.text.primary
                                                    )}>
                                                        {option.title}
                                                    </h3>
                                                ) : (
                                                    <div className={cn(themeColors.text.primary)}>
                                                        {option.title}
                                                    </div>
                                                )}

                                                {/* External Link */}
                                                {option.link && (
                                                    <a
                                                        href={option.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={cn(
                                                            "p-1 rounded transition-colors duration-200",
                                                            "hover:bg-blue-100 dark:hover:bg-blue-900/30",
                                                            "text-blue-600 dark:text-blue-400",
                                                            "focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        )}
                                                        title="Open in explorer"
                                                        aria-label="Open in explorer"
                                                    >
                                                        <HiOutlineExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center space-x-1">
                                                {canExpand && (
                                                    <button
                                                        onClick={() => {
                                                            const newExpends = [...expends]
                                                            newExpends[i] = !expends[i]
                                                            setExpends(newExpends)
                                                        }}
                                                        className={cn(
                                                            "p-1.5 rounded transition-all duration-200",
                                                            "hover:bg-gray-200 dark:hover:bg-gray-700",
                                                            themeColors.text.secondary,
                                                            "focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        )}
                                                        title={isExpanded ? "Collapse" : "Expand"}
                                                        aria-label={isExpanded ? "Collapse content" : "Expand content"}
                                                    >
                                                        {isExpanded ? (
                                                            <HiChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <HiChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Content */}
                                        <div className="relative">
                                            <p
                                                className={cn(
                                                    itemContentSize,
                                                    themeColors.text.secondary,
                                                    "font-mono leading-relaxed",
                                                    isExpanded ? "break-all whitespace-pre-wrap" : "truncate",
                                                    canCopy && "cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                                                )}
                                                onClick={() => {
                                                    if (canCopy) {
                                                        handleCopy(option.content as string)
                                                    }
                                                }}
                                                title={canCopy ? "Click to copy" : (typeof option.content === "string" ? option.content ?? "N/A" : "")}
                                            >
                                                {option.content ?? "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>

                <div className="mt-auto w-full">
                    <div className="-mx-3">
                        <hr className="border-gray-200 dark:border-gray-700" />
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-full px-4 py-3 rounded-lg text-sm font-semibold mt-4",
                            "transition-all duration-200",
                            "bg-blue-600 dark:bg-blue-500 text-white",
                            "hover:bg-blue-700 dark:hover:bg-blue-600",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                            "focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                            "active:scale-95 hover:shadow-md"
                        )}
                        autoFocus
                    >
                        Close
                    </button>
                </div>
            </div>
        </Dialog>
    )
}

export default DetailsDialog
