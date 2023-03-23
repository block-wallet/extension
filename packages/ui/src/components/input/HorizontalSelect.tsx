import { FunctionComponent } from "react"

const HorizontalSelect: FunctionComponent<{
    options: any[]
    value: any
    onChange: (value: any) => void
    display?: (option: any, i: number) => React.ReactNode
    disableStyles?: boolean
    optionClassName?: (option: any) => string
    containerClassName?: string
    containerStyle?: React.CSSProperties
}> = ({
    options,
    value,
    onChange,
    display,
    disableStyles = false,
    containerClassName,
    optionClassName,
    containerStyle,
}) => (
    <div
        className={containerClassName || "flex flex-row space-x-0 w-full"}
        style={containerStyle}
    >
        {options.map((option, i) => (
            <button
                type="button"
                key={option.label || option.name || option}
                className={
                    !disableStyles
                        ? `flex-1 flex flex-row items-center justify-center p-4 border-b-2 text-sm ${
                              option === value
                                  ? "border-primary-blue-default text-primary-blue-default font-bold"
                                  : "border-transparent text-primary-grey-dark hover:text-primary-blue-default hover:font-medium"
                          }`
                        : optionClassName
                        ? optionClassName(option)
                        : ""
                }
                onClick={() => onChange(option)}
            >
                {display ? display(option, i) : option}
            </button>
        ))}
    </div>
)

export default HorizontalSelect
