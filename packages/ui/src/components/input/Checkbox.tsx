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
                "cursor-pointer w-4 h-4 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400",
                className && className
            )}
            onChange={() => {
                onChange(!checked)
            }}
            id="checkbox"
            disabled={disabled}
        />
        <label htmlFor="checkbox" className="cursor-pointer text-xs pl-2 text-gray-700 dark:text-gray-300">
            {label}
        </label>
    </div>
)

export default Checkbox
