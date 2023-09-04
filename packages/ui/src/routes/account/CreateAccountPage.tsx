import { AriaAttributes } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { openHardwareConnect } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Icon, { IconName } from "../../components/ui/Icon"
import classNames from "classnames"
import { PropsWithChildren } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../../util/hotkeys"

const CardFrame: React.FC<
    PropsWithChildren<{
        onClick: () => void
        role?: string
        disabled?: boolean
    }> &
        AriaAttributes
> = ({ children, onClick, role, disabled = false, ...ariaProps }) => {
    return (
        <div
            role={role}
            onClick={onClick}
            {...ariaProps}
            className={classNames(
                "rounded-lg border border-primary-grey-hover flex flex-row p-4 h-26 justify-between hover:border-black hover:cursor-pointer",
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
                <span className="font-semibold text-sm leading-6">{title}</span>
                <p className="text-xs text-primary-grey-dark leading-5">
                    {description}
                </p>
            </div>
            <div className="w-6 m-auto">
                <Icon name={IconName.RIGHT_CHEVRON} />
            </div>
        </CardFrame>
    )
}

const CreateAccountPage = () => {
    const history = useOnMountHistory()

    const createAccountPageHotkeys = componentsHotkeys.CreateAccountPage
    useHotkeys(createAccountPageHotkeys, () => {
        openHardwareConnect()
    })

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Create New Account"
                    onBack={() => history.replace("/accounts")}
                />
            }
        >
            <div className="flex flex-col space-y-4 p-6">
                <CreateAccountCard
                    title="New Account"
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
