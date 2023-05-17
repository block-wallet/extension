import classnames from "classnames"

const EndLabel = ({
    label,
    children,
    className,
}: {
    label: string | JSX.Element
    children: React.ReactNode
    className?: string
}) => (
    <div className="flex flex-row relative w-full mt-2">
        {children}
        <div
            className={classnames(
                "absolute inset-y-0 right-3 flex items-center",
                className
            )}
        >
            <span className="text-primary-grey-dark text-sm">{label}</span>
        </div>
    </div>
)

export default EndLabel
