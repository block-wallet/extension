import classnames from "classnames"

/**
 * Checkbox Input component.
 * @param label Label for the checkbox. can be a string or a react element
 * @param checked If true the checkbox will be checked
 * @param onChange Function to be called when the checkbox is clicked
 * @param disabled If true the checkbox will be disabled
 * @param className Custom class name for the checkbox
 * @param right If true the checkbox and label will be on the end of the div
 */
const Checkbox = ({
    label,
    className,
    checked,
    onChange,
    disabled = false,
    right = false,
}: {
    label: string | JSX.Element
    className?: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    right?: boolean
}) => (
    <div
        className={classnames(
            "pt-2 flex flex-row items-center",
            right && "justify-end"
        )}
    >
        <input
            type="checkbox"
            checked={checked}
            className={classnames(
                " cursor-pointer w-4 h-4 border-1 border-primary-grey-hover rounded-md focus:ring-0",
                className && className
            )}
            onChange={() => {
                onChange(!checked)
            }}
            id="checkbox"
            disabled={disabled}
        />
        <label htmlFor="checkbox" className=" cursor-pointer text-xs pl-2">
            {label}
        </label>
    </div>
)

export default Checkbox
