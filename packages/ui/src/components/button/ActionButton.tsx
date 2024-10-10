import classnames from "classnames"
import { FunctionComponent } from "react"
import { Link } from "react-router-dom"
import { Classes } from "../../styles"

export const ActionButton: FunctionComponent<{
    icon: string | JSX.Element
    label: string
    to: string
    state?: any
    className?: string
}> = ({ icon, label, to, state, className }) => {
    return (
        <Link
            className={classnames(Classes.actionButton, className)}
            to={{ pathname: to, state: state }}
            draggable={false}
        >
            {typeof icon === "string" ? (
                <img
                    src={icon}
                    alt={label}
                    className={classnames(Classes.buttonIcon)}
                />
            ) : (
                <div
                    className={classnames(
                        Classes.buttonIcon,
                        "flex items-center"
                    )}
                >
                    {icon}
                </div>
            )}
            {label}
        </Link>
    )
}
