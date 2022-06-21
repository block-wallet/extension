import React, { FunctionComponent } from "react"
import CheckmarkCircle from "../icons/CheckmarkCircle"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import classnames from "classnames"

interface ClassNameProp {
    className?: string
}

interface InfoItemProps extends ClassNameProp {
    type: "success" | "warn"
}

interface InfoComponents {
    Item: FunctionComponent<InfoItemProps>
    Title: FunctionComponent
    List: FunctionComponent<ClassNameProp>
}

const Info: FunctionComponent & InfoComponents = ({ children }) => {
    return <div>{children}</div>
}

const Title: FunctionComponent = ({ children }) => {
    return (
        <span className="text-2xl font-bold leading-10 font-title">
            {children}
        </span>
    )
}

const InfoList: FunctionComponent<ClassNameProp> = ({
    children,
    className,
}) => {
    return (
        <ul className={classnames("list-none", className || "")}>{children}</ul>
    )
}

const BulletType = {
    success: () => <CheckmarkCircle size="24" />,
    warn: () => <ExclamationCircleIconFull size="24" />,
}

const Item: FunctionComponent<InfoItemProps> = ({
    children,
    type,
    className,
}) => {
    const Bullet = BulletType[type]
    return (
        <li className={classnames("mb-5 flex items-start", className || "")}>
            <div className="flex-none mr-3">
                <Bullet />
            </div>
            <span className="flex-1 text-sm text-slate-600 leading-6 align-middle">
                {children}
            </span>
        </li>
    )
}

Info.Item = Item
Info.Title = Title
Info.List = InfoList

export default Info
