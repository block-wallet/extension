import classnames from "classnames"
import { FunctionComponent, ReactElement } from "react"
import { Link } from "react-router-dom"
import { Classes } from "../../styles"

export const ActionButton: FunctionComponent<{
    icon: string | JSX.Element
    label: string
    to: string
    state?: any
}> = ({ icon, label, to, state }) => {
    return (
        <Link
            className={classnames(Classes.actionButton)}
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
                <div className={classnames(Classes.buttonIcon)}>{icon}</div>
            )}
            {label}
        </Link>
    )
}
