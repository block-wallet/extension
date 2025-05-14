import { FunctionComponent } from "react"

import { Link } from "react-router-dom"
import Divider from "../../components/Divider"
import { Classes, classnames } from "../../styles/classes"

import importSeedIcon from "../../assets/images/icons/import_seed.svg"
import privateKeyIcon from "../../assets/images/icons/key.svg"
import newAccountIcon from "../../assets/images/icons/new_account.svg"
import PageLayout from "../../components/PageLayout"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

const SetupOption: FunctionComponent<{
    title: string
    description: string
    icon: string
    linkTo: string
    linkLabel: string
}> = ({ title, description, icon, linkTo, linkLabel }) => (
    <div className="relative flex flex-col items-center border rounded flex-1 p-6 h-[320px]">
        <div className="flex flex-col items-center flex-grow">
            <img
                src={icon}
                alt="icon"
                className="mb-4 text-4xl text-primary-grey-dark w-8 h-8"
            />
            <span className="text-sm font-semibold mb-4">{title}</span>
            <span className="text-xs text-primary-grey-dark text-center mb-auto">
                {description}
            </span>
        </div>
        <div className="w-full mt-6">
            <Link
                to={linkTo}
                className={classnames(Classes.button, "w-full h-12 flex items-center justify-center")}
                draggable={false}
            >
                {linkLabel}
            </Link>
        </div>
    </div>
)

const SetupPage = () => {
    // if the onboarding is ready the user shoulnd't do it again.
    useCheckUserIsOnboarded()

    return (
        <PageLayout header className="relative">
            <span className="my-6 text-lg font-semibold">
                How do you want to proceed?
            </span>
            <Divider />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full p-6">
                <SetupOption
                    title="Use your seed phrase"
                    description="Access your existing wallets and accounts using a seed phrase."
                    icon={importSeedIcon}
                    linkTo="/setup/import"
                    linkLabel="Import your wallet"
                />
                <SetupOption
                    title="Import from private key"
                    description="Import a single account using a private key."
                    icon={privateKeyIcon}
                    linkTo="/setup/import-private-key"
                    linkLabel="Import with private key"
                />
                <SetupOption
                    title="Create a new account"
                    description="Create a new seed phrase and start with a fresh wallet."
                    icon={newAccountIcon}
                    linkTo="/setup/create"
                    linkLabel="Create new wallet"
                />
            </div>
        </PageLayout>
    )
}

export default SetupPage
