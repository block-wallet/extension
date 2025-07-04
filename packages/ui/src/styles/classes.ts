import _classnames from "classnames"

export const classnames = _classnames

const primaryButton =
    "text-white bg-primary-blue-default hover:bg-primary-blue-hover border-primary-blue-default hover:border-primary-blue-hover"

export class Classes {
    static centered = classnames("flex flex-row items-center justify-center")
    static start = classnames("flex flex-row items-center justify-start ")
    static animated = classnames("transition-all duration-300")
    static transform = classnames("transform active:scale-95")

    static iconButton = classnames(
        Classes.start,
        Classes.animated,
        Classes.transform,
        "h-12 space-x-2 p-4 rounded-lg text-sm font-semibold cursor-pointer disabled:pointer-events-none"
    )

    static baseButton = classnames(
        Classes.centered,
        Classes.animated,
        Classes.transform,
        "flex-1 h-12 px-6 py-3 text-sm font-semibold shadow-sm rounded-lg",
        "border-2",
        "cursor-pointer disabled:pointer-events-none"
    )
    static button = classnames(
        Classes.centered,
        Classes.baseButton,
        primaryButton
    )

    static smallButton = classnames(
        Classes.centered,
        primaryButton,
        "text-[11px] shadow-sm rounded p-1 border-2 cursor-pointer disabled:pointer-events-none"
    )

    static menuButton = classnames(
        Classes.iconButton,
        "bg-primary-grey-default hover:bg-primary-grey-hover"
    )

    static buttonIcon = classnames("w-5 h-5 mr-3")

    static actionButton = classnames(
        Classes.iconButton,
        "border border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    )

    static logoutButton = classnames(
        Classes.iconButton,
        "!text-secondary-red-default bg-secondary-red-100 border border-secondary-red-100  hover:border-secondary-red-default"
    )
    static disabledLogoutButton = classnames(
        Classes.iconButton,
        "text-red-300 bg-red-50 border border-opacity-0 hover:border-red-400 hover:border-opacity-50"
    )

    static redButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "text-white bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
    )
    static disabledButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "text-white bg-blue-200 pointer-events-none border-blue-200"
    )
    static darkButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "bg-primary-blue-default text-white hover:bg-primary-blue-hover border-primary-blue-default hover:border-primary-blue-hover"
    )
    static whiteButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "text-black hover:bg-primary-black-default border-primary-black-default hover:border-gray-800 hover:text-white"
    )
    static disabledDarkButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "bg-primary-blue-disabled border-primary-blue-disabled text-white pointer-events-none"
    )
    static liteButton = classnames(
        Classes.centered,
        Classes.baseButton,
        "text-gray-900 border-primary-black-default hover:text-white hover:bg-primary-black-default"
    )
    static inputLabel = classnames(
        "text-[13px] font-medium text-gray-700 dark:text-gray-300"
    )
    static inputBordered = classnames(
        "text-xs font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-lg border-1 border-gray-300 dark:border-gray-600 min-h-[40px] placeholder:font-normal placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:ring-primary-blue-default hover:border-primary-blue-default dark:hover:border-primary-blue-400"
    )
    static input = classnames(
        "w-full text-xs font-semibold rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 py-2 px-3 mt-2 border-1 border-gray-300 dark:border-gray-600 min-h-[40px] placeholder:font-normal placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:ring-primary-blue-default hover:border-primary-blue-default dark:hover:border-primary-blue-400"
    )
    static inputBorder = classnames(
        "w-full text-xs px-3 py-2 mt-1 font-semibold rounded-lg border-1 border-primary-grey-hover placeholder:font-normal min-h-[40px] placeholder-primary-grey-dark focus:ring-0 hover:border-primary-blue-default focus:ring-primary-blue-default"
    )

    static checkbox = classnames(
        "w-5 h-5 border-2 border-gray-800 rounded-md focus:ring-0"
    )
    static checkboxAlt = classnames(
        "w-6 h-6 border-2 border-primary-grey-hover rounded-md focus:ring-0 cursor-pointer"
    )
    static placeholder = classnames("overflow-hidden relative placeholder")

    static blueSection = classnames(
        "p-4 border-opacity-0 border-transparent flex justify-between items-center flex-row w-full rounded-lg bg-primary-grey-default border cursor-pointer hover:bg-primary-grey-hover"
    )

    static greySection = classnames(
        "p-4 border-opacity-0 border-transparent flex justify-between items-center flex-row w-full rounded-lg bg-gray-100 dark:bg-gray-700 border cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
    )

    static blueSelectionDisabled = classnames(
        "cursor-not-allowed hover:bg-primary-grey-default"
    )

    static greySelectionDisabled = classnames(
        "cursor-not-allowed hover:bg-primary-grey-disabled"
    )

    static blueSectionActive = classnames("bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white")
    static blueSectionInput = classnames(
        "bg-transparent p-0 border-none font-semibold"
    )

    static roundedIcon = classnames(
        "flex items-center justify-center w-10 h-10 p-1.5 bg-white border border-primary-grey-hover rounded-full"
    )

    static smallRoundedIcon = classnames(
        "flex items-center justify-center w-6 h-6 p-1.5 bg-white border border-primary-grey-hover rounded-full"
    )

    static mediumRoundedIcon = classnames(
        "flex items-center justify-center w-8 h-8 p-1.5 bg-white border border-primary-grey-hover rounded-full"
    )

    static roundedSmallIcon = classnames(
        "flex items-center justify-center w-6 h-6 bg-white border border-primary-grey-hover rounded-full"
    )

    static roundedFilledIcon = classnames(
        "flex items-center justify-center w-10 h-10 p-0 rounded-full"
    )
    static smallRoundedFilledIcon = classnames(
        "flex items-center justify-center w-6 h-6 p-0 rounded-full"
    )
    static mediumRoundedFilledIcon = classnames(
        "flex items-center justify-center w-8 h-8 p-0 rounded-full"
    )

    static clickableText = classnames(
        "rounded border-none bg-transparent text-primary-blue-default dark:text-primary-blue-400 hover:text-primary-blue-hover dark:hover:text-primary-blue-300 hover:underline transition-colors duration-200"
    )
    static selectBaseStyle = classnames(
        "relative flex flex-row justify-between items-center cursor-pointer select-none"
    )
    static selectStyle = classnames(
        this.selectBaseStyle,
        "text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border rounded-lg font-semibold placeholder:font-normal group border-gray-300 dark:border-gray-600 hover:border-primary-blue-default dark:hover:border-primary-blue-400 px-3 py-2 min-h-[40px]"
    )
    static selectStyleDisabled = classnames(
        this.selectStyle,
        "opacity-50 cursor-not-allowed"
    )
    static selectInlineStyle = classnames(
        this.selectBaseStyle,
        "px-1 text-sky-600"
    )
}
