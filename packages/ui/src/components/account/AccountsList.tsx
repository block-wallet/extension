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
            {title && (
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                    {title}
                </span>
            )}
            {children}
        </div>
    )
}

export default AccountsList
