import { FunctionComponent, useState, useEffect, useRef } from "react"
import classnames from "classnames"

import Dialog from "./Dialog"
import Divider from "../Divider"

import openExternal from "../../assets/images/icons/open_external.svg"
import CloseIcon from "../icons/CloseIcon"
import { Classes } from "../../styles"
import useCopyToClipboard from "../../util/hooks/useCopyToClipboard"
import CopyTooltip from "../label/СopyToClipboardTooltip"

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

    const { onCopy, copied } = useCopyToClipboard()

    const previousLengthRef = useRef(options.length)

    useEffect(() => {
        if (options.length === previousLengthRef.current) return

        setExpends(new Array(options.length).fill(expandedByDefault))
    }, [options])

    return (
        <Dialog open={open} onClickOutside={() => onClose()}>
            <div
                className={classnames("flex flex-col", !fixedTitle && "px-3")}
                style={{ height: "calc(100vh - 8rem)" }}
            >
                {fixedTitle && (
                    <div className="w-full">
                        <h2
                            className={classnames(
                                titleSize,
                                "font-bold pl-2 pb-3"
                            )}
                        >
                            {title}
                        </h2>
                        <div className="-mx-3">
                            <Divider />
                        </div>
                    </div>
                )}
                <div
                    className={classnames(
                        "grow mb-auto overflow-auto -mr-3",
                        fixedTitle && "px-3"
                    )}
                >
                    <span className="absolute top-0 right-0 p-4">
                        <div
                            onClick={() => onClose()}
                            className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                        >
                            <CloseIcon size="10" />
                        </div>
                    </span>
                    {!fixedTitle && (
                        <h2 className={classnames(titleSize, "font-bold")}>
                            {title}
                        </h2>
                    )}
                    <div className="flex flex-col space-y-4 mt-6 mb-6">
                        {options
                            .filter(
                                (option) => !!option.content || showUndefined
                            )
                            .map((option, i) => {
                                if (onOption) return onOption(option)

                                return (
                                    <div
                                        key={
                                            typeof option.title === "string"
                                                ? option.title
                                                : i
                                        }
                                    >
                                        {typeof option.title === "string" ? (
                                            <div className="flex flex-row w-full items-center">
                                                <h3
                                                    className={classnames(
                                                        itemTitleSize,
                                                        "font-bold mr-2"
                                                    )}
                                                >
                                                    {option.title}
                                                </h3>
                                                {option.link && (
                                                    <a
                                                        href={option.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open in explorer"
                                                    >
                                                        <img
                                                            src={openExternal}
                                                            alt="Open in explorer"
                                                            className="w-3 h-3"
                                                        />
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-row w-full items-center">
                                                {option.title}
                                                {option.link && (
                                                    <a
                                                        href={option.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-2"
                                                        title="Open in explorer"
                                                    >
                                                        <img
                                                            src={openExternal}
                                                            alt="Open in explorer"
                                                            className="w-3 h-3"
                                                        />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        <div
                                            className={classnames(
                                                "flex w-full",
                                                option.copyable &&
                                                    "cursor-pointer group relative"
                                            )}
                                            onClick={(_) => {
                                                if (
                                                    option.copyable &&
                                                    typeof option.content ===
                                                        "string"
                                                ) {
                                                    onCopy(option.content)
                                                }
                                            }}
                                        >
                                            <p
                                                className={classnames(
                                                    itemContentSize,
                                                    "mt-1 w-5/6",
                                                    expends[i]
                                                        ? "break-words"
                                                        : "truncate",
                                                    option.expandable
                                                        ? "cursor-pointer"
                                                        : ""
                                                )}
                                                onClick={(_) => {
                                                    if (!option.expandable)
                                                        return

                                                    const newExpends = [
                                                        ...expends,
                                                    ]
                                                    newExpends[i] = !expends[i]

                                                    setExpends(newExpends)
                                                }}
                                                title={
                                                    typeof option.content ===
                                                    "string"
                                                        ? option.content ??
                                                          "N/A"
                                                        : ""
                                                }
                                            >
                                                {option.content ?? "N/A"}
                                            </p>
                                            <CopyTooltip copied={copied} />
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
                <div className="mt-auto w-full">
                    <div className="-mx-3">
                        <Divider />
                    </div>
                    <button
                        className={classnames(
                            Classes.liteButton,
                            "mt-4 w-full"
                        )}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Dialog>
    )
}

export default DetailsDialog
