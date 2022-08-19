import { FunctionComponent } from "react"
import { classnames } from "../../styles"
import Tooltip from "../label/Tooltip"

const VerticalSelect: FunctionComponent<{
    options: any[]
    value: any
    onChange?: (value: any) => void
    display: (option: any, i: number) => React.ReactNode
    disableStyles?: boolean
    disabledOptions?: boolean[] | { [k: string]: boolean }
    containerClassName?: string
    containerStyle?: any
    isActive?: (option: any) => boolean
    isDisabled?: (option: any, i: number) => boolean
    tooltipOptions?: { [k: string]: string }
}> = ({
    options,
    value,
    onChange = () => void 0,
    display,
    disableStyles = false,
    containerClassName,
    containerStyle,
    disabledOptions,
    isActive = (option) =>
        option === value || (option.label && option.label === value),
    isDisabled = (option: any, i: number) =>
        disabledOptions &&
        (Array.isArray(disabledOptions)
            ? disabledOptions[i]
            : disabledOptions[option.label]),
    tooltipOptions,
}) => (
    <div
        className={containerClassName || "flex flex-col space-y-2"}
        style={containerStyle}
    >
        {options.map((option, i) => (
            <div
                key={`${i}-${option.label}`}
                className={classnames("group relative")}
            >
                <button
                    type="button"
                    disabled={isDisabled(option, i)}
                    key={option.label || option.name || option}
                    className={
                        !disableStyles
                            ? `w-full flex flex-row items-center justify-between p-4 rounded-md text-sm transform transition-all duration-300 active:scale-95
                    disabled:pointer-events-none
                    ${
                        isActive(option)
                            ? "bg-primary-300 text-white font-bold"
                            : "bg-primary-100 hover:bg-primary-200"
                    }
                    ${
                        isDisabled(option, i)
                            ? "pointer-events-none opacity-50"
                            : ""
                    }`
                            : ""
                    }
                    onClick={() => onChange && onChange(option)}
                >
                    {display(option, i)}
                </button>
                {tooltipOptions && option.label in tooltipOptions ? (
                    <Tooltip
                        className="-translate-y-10 !translate-x-1"
                        content={
                            <div>
                                <span className="font-normal">
                                    {tooltipOptions &&
                                        tooltipOptions[option.label]}
                                </span>
                            </div>
                        }
                    />
                ) : (
                    <></>
                )}
            </div>
        ))}
    </div>
)

export default VerticalSelect
