import { FunctionComponent } from "react"

import { Link } from "react-router-dom"
import Divider from "../../components/Divider"
import { Classes, classnames } from "../../styles/classes"

import crossIcon from "../../assets/images/icons/cross.svg"

import checkmarkIcon from "../../assets/images/icons/checkmark.svg"
import PageLayout from "../../components/PageLayout"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

const SetupOption: FunctionComponent<{
    title: string
    description: string
    icon: string
    linkTo: string
    linkLabel: string
}> = ({ title, description, icon, linkTo, linkLabel }) => (
    <div className="relative flex flex-col items-start flex-1 p-6 bg-primary-100">
        <div className="absolute top-0 right-0 w-4 h-4 bg-white" />
        <div className="absolute top-0 right-0 w-4 h-4 mt-4 mr-4 bg-white" />
        <img
            src={icon}
            alt="icon"
            className="mb-4 text-4xl text-gray-500 w-14 h-14"
        />
        <span className="text-sm font-bold font-title">{title}</span>
        <span className="h-16 mt-4 text-xs text-gray-500">{description}</span>
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
        <PageLayout className="relative" header displayWarningTip={true}>
            <span className="my-6 text-lg font-bold font-title">
                New to BlockWallet?
            </span>
            <Divider />
            <div className="flex flex-col w-full p-6 space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <SetupOption
                    title="No, I have a seed phrase"
                    description="Import your existing wallet using a 12 word seed phrase."
                    icon={crossIcon}
                    linkTo="/setup/import"
                    linkLabel="Import Your Wallet"
                />
                <SetupOption
                    title="Yes, set me up"
                    description="Create a new wallet and seed phrase."
                    icon={checkmarkIcon}
                    linkTo="/setup/create"
                    linkLabel="Create a Wallet"
                />
            </div>
        </PageLayout>
    )
}

export default SetupPage
