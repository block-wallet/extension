import { FunctionComponent } from "react"

import { Link } from "react-router-dom"
import Divider from "../../components/Divider"
import { Classes, classnames } from "../../styles/classes"

import importSeedIcon from "../../assets/images/icons/import_seed.svg"

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
    <div className="relative flex flex-col items-center border rounded flex-1 p-6 ">
        <img
            src={icon}
            alt="icon"
            className="mb-4 text-4xl text-gray-500 w-8 h-8"
        />
        <span className="text-sm font-semibold font-title">{title}</span>
        <span className="h-16 mt-4 text-xs text-gray-500 text-center">
            {description}
        </span>
        <Link
            to={linkTo}
            className={classnames(Classes.button, "w-full")}
            draggable={false}
        >
            {linkLabel}
        </Link>
    </div>
)

const SetupPage = () => {
    // if the onboarding is ready the user shoulnd't do it again.
    useCheckUserIsOnboarded()

    return (
        <PageLayout header className="relative">
            <span className="my-6 text-lg font-semibold font-title">
                How do you want to proceed?
            </span>
            <Divider />
            <div className="flex flex-col w-full p-6 space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <SetupOption
                    title="Use your seed phrase"
                    description="Access your existing wallets and accounts using a seed phrase."
                    icon={importSeedIcon}
                    linkTo="/setup/import"
                    linkLabel="Import your wallet"
                />
                <SetupOption
                    title="Create a new account"
                    description="Create a new seed phrase and start with a fresh wallet."
                    icon={newAccountIcon}
                    linkTo="/setup/create"
                    linkLabel="Create new wallet"
                />
            </div>

            <a
                href="https://blog.blockwallet.io/"
                target="_blank"
                rel="noreferrer"
                className="text-primary-blue-default mb-6 hover:text-primary-blue-hover"
            >
                BlockWallet Blog
            </a>
        </PageLayout>
    )
}

export default SetupPage
