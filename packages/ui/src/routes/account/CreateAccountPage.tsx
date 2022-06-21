import React, { AriaAttributes } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { openHardwareConnect } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Icon, { IconName } from "../../components/ui/Icon"
import classNames from "classnames"

const CardFrame: React.FC<
    { onClick: () => void; role?: string; disabled?: boolean } & AriaAttributes
> = ({ children, onClick, role, disabled = false, ...ariaProps }) => {
    return (
        <div
            role={role}
            onClick={onClick}
            {...ariaProps}
            className={classNames(
                "rounded-md border border-gray-200 flex flex-row p-4 h-26 justify-between hover:border-black hover:cursor-pointer",
                disabled && "opacity-50 pointer-events-none"
            )}
        >
            {children}
        </div>
    )
}

const CreateAccountCard: React.FC<{
    iconName: IconName
    title: string
    description: string
    onClick: () => void
    disabled?: boolean
}> = ({ iconName, title, description, onClick, disabled = false }) => {
    return (
        <CardFrame
            onClick={onClick}
            aria-label={title}
            role="link"
            disabled={disabled}
        >
            <Icon className="mr-3" name={iconName} size="lg" />
            <div className="flex-1 flex flex-col justify-start space-y-2">
                <span className="font-bold text-sm leading-6">{title}</span>
                <p className="text-xs text-gray-500 leading-5">{description}</p>
            </div>
            <div className="w-6 m-auto">
                <Icon name={IconName.RIGHT_CHEVRON} />
            </div>
        </CardFrame>
    )
}

const CreateAccountPage = () => {
    const history = useOnMountHistory()
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Create New Account"
                    onBack={() => history.replace("/accounts")}
                />
            }
        >
            <div className="flex flex-col space-y-6 p-6">
                <CreateAccountCard
                    title="Create Account"
                    iconName={IconName.WALLET}
                    description="Create a new account from the seed stored in BlockWallet."
                    onClick={() => history.push("/accounts/create/add")}
                />
                <CreateAccountCard
                    title="Import Account"
                    iconName={IconName.IMPORT}
                    description="Import a new account from a private key."
                    onClick={() => history.push("/accounts/create/import")}
                />
                <CreateAccountCard
                    title="Connect Hardware Wallet"
                    iconName={IconName.USB}
                    description="Connect accounts from a hardware wallet."
                    onClick={() => openHardwareConnect()}
                />
            </div>
        </PopupLayout>
    )
}

export default CreateAccountPage
