import React, { FC } from "react"

interface AccountsListProps {
    title: string
}
const AccountsList: FC<AccountsListProps> = ({ title, children }) => {
    return (
        <div className="flex flex-col space-y-4">
            <span className="text-xs">{title}</span>
            {children}
        </div>
    )
}

export default AccountsList
