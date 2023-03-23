import { PropsWithChildren } from "react"
import classnames from "classnames"
export enum TypographyType {
    TITLE = "title",
}

const Styles = {
    [TypographyType.TITLE]:
        "text-2xl font-bold leading-10 text-primary-black-default",
}

interface TypographyProps {
    type: TypographyType
    className?: string
    extraProps?: any
}

const Typography: React.FC<PropsWithChildren<TypographyProps>> = ({
    children,
    type,
    className,
    extraProps, //mostly defined for aria attributes
}) => {
    return (
        <span
            className={classnames(Styles[type], className)}
            {...(extraProps || {})}
        >
            {children}
        </span>
    )
}

export default Typography
