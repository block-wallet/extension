import { FC } from "react"
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
    Item: FC<InfoItemProps & { children: React.ReactNode }>
    Title: FC<{ children: React.ReactNode }>
    List: FC<ClassNameProp & { children: React.ReactNode }>
}

const Info: FC<{ children: React.ReactNode }> & InfoComponents = ({
    children,
}) => {
    return <div>{children}</div>
}

const Title = ({ children }: { children: React.ReactNode }) => {
    return (
        <span className="text-[1.4rem] font-bold leading-10  ">{children}</span>
    )
}

const InfoList: FC<ClassNameProp & { children: React.ReactNode }> = ({
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

const Item: FC<InfoItemProps & { children: React.ReactNode }> = ({
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
