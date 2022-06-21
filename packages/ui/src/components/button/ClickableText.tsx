import React, { FunctionComponent } from "react"
import { Classes } from "../../styles/classes"
type ClickableTextProps = {
    children: string | React.ReactNode
    onClick: React.MouseEventHandler
}

const ClickableText: FunctionComponent<ClickableTextProps> = ({
    children,
    onClick,
}) => {
    return (
        <button
            type="button"
            className={Classes.clickableText}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export default ClickableText
