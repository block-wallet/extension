import { FC, PropsWithChildren } from "react"

interface AccountsListProps {
    title: string
}
const AccountsList: FC<PropsWithChildren<AccountsListProps>> = ({
    title,
    children,
}) => {
    return (
        <div className="flex flex-col space-y-3">
            <span className="text-xs text-primary-grey-dark">{title}</span>
            {children}
        </div>
    )
}

export default AccountsList
