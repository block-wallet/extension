import {
    FC,
    FunctionComponent,
    useRef,
    useState,
    ReactNode,
    ReactElement,
    Children,
    cloneElement,
    memo,
    useMemo,
} from "react"

import { useOnClickOutside } from "../../util/useOnClickOutside"
import classnames from "classnames"
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri"
import { BsCheck } from "react-icons/bs"
import { Classes } from "../../styles"

const getClassnamesForType = ({
    disabled,
    showMenu,
    type,
}: {
    disabled?: boolean
    showMenu: boolean
    type: string
}): string => {
    if (type === "select") {
        return classnames(
            !disabled ? Classes.selectStyle : Classes.selectStyleDisabled,
            showMenu ? "border-primary-blue-default" : ""
        )
    }
    return Classes.selectInlineStyle
}

const getMenuClassnamesForType = ({
    type,
}: {
    type: string
}): Array<string> => {
    if (type === "select") {
        return ["w-full"]
    }

    return ["w-fit"]
}

interface CompoundMember {
    compoundName?: string
}

interface CompoundProps {
    Option: FunctionComponent<ItemProps> & CompoundMember
}

type ValueType = string | number | undefined

interface ItemProps {
    onClick?: (value: ValueType) => void
    value?: ValueType
    selected?: boolean
    disabled?: boolean
    children: ReactNode
}

interface SelectProps {
    label?: string
    onChange: (selected: any) => void
    currentValue: ValueType
    placeholder?: string
    error?: string
    id?: string
    type?: "select" | "text"
    children: React.ReactNode
    disabled?: boolean
}

const Select: FC<SelectProps> & CompoundProps = ({
    label,
    onChange,
    currentValue,
    children,
    disabled,
    placeholder,
    id,
    error,
    type = "select",
}) => {
    const [showMenu, setShowMenu] = useState(false)
    const ref = useRef(null)
    useOnClickOutside(ref, () => setShowMenu(false))
    const handleItemChange = (value: number | string) => {
        setShowMenu(false)
        onChange(value)
    }

    const selectLabel = useMemo(() => {
        if (currentValue !== null && currentValue !== undefined) {
            let label = ""
            Children.forEach(
                children as ReactElement[],
                (child: ReactElement) => {
                    if (currentValue === child?.props.value) {
                        label = child.props.label || child.props.children
                    }
                }
            )
            return label
        }
        return null
    }, [currentValue, children])
    return (
        <div className="space-y-2">
            {label ? (
                <label
                    htmlFor={id || "selectMenu"}
                    className={classnames(Classes.inputLabel, "mb-1")}
                >
                    {label}
                </label>
            ) : null}
            <div
                className="relative"
                role="combobox"
                aria-controls="menu"
                aria-expanded={showMenu}
                id={id || "selectMenu"}
                ref={ref}
            >
                <div
                    onClick={() => {
                        !disabled && setShowMenu(!showMenu)
                    }}
                    className={getClassnamesForType({
                        showMenu,
                        type,
                        disabled,
                    })}
                >
                    <span className="text-xs">
                        {selectLabel || placeholder}
                    </span>
                    {showMenu ? (
                        <RiArrowUpSLine size={20} />
                    ) : (
                        <RiArrowDownSLine size={20} />
                    )}
                </div>
                <div
                    hidden={!showMenu}
                    className={classnames(
                        "absolute shadow-md rounded-md mt-1 bg-white select-none h-auto max-h-52 overflow-y-scroll select-menu z-[20000]",
                        getMenuClassnamesForType({ type })
                    )}
                    style={{ maxWidth: "305px" }}
                    id="menu"
                    role="menu"
                >
                    <ul>
                        {Children.map(
                            children as ReactElement[],
                            (child: ReactElement) => {
                                const { props, type } = child
                                if (
                                    (type as typeof SelectOption)
                                        .compoundName !== "SelectOption"
                                ) {
                                    throw new Error(
                                        "Only Select.Option children are allowed"
                                    )
                                }
                                return cloneElement(child, {
                                    ...props,
                                    onClick: handleItemChange,
                                    disabled,
                                    selected:
                                        currentValue === child.props.value,
                                })
                            }
                        )}
                    </ul>
                </div>
            </div>
            {/* ERROR */}
            <span
                role="alert"
                className={classnames(
                    "text-xs text-red-500",
                    error === "" ? "m-0 h-0" : ""
                )}
            >
                {error || ""}
            </span>
        </div>
    )
}

const SelectOption: FC<ItemProps> & CompoundMember = ({
    onClick,
    value,
    selected,
    children,
    disabled,
}) => {
    return (
        <li
            className={classnames(
                "cursor-pointer flex flex-row justify-between px-3 py-2 items-center hover:bg-gray-100 space-x-3",
                disabled && "!cursor-default !bg-gray-200 !hover:bg-gray-200"
            )}
            onClick={() => (onClick && !disabled ? onClick(value) : void 0)}
        >
            <span
                className={classnames(
                    "leading-loose",
                    selected && "font-semibold"
                )}
            >
                {children}
            </span>
            <span className={classnames(!selected && "invisible")}>
                <BsCheck size={14} />
            </span>
        </li>
    )
}

Select.Option = memo(SelectOption)

Select.Option.compoundName = "SelectOption"

export default Select
