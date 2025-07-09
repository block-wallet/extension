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
    recommended?: boolean
}> = ({ title, description, icon, linkTo, linkLabel, recommended = false }) => (
    <div className="group relative">
        {/* Recommended badge */}
        {recommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Recommended
                </span>
            </div>
        )}

        {/* Main card */}
        <div className={classnames(
            "relative flex flex-col h-full p-5 rounded-2xl border-2 transition-all duration-300 transform group-hover:scale-[1.02] group-hover:-translate-y-1",
            "bg-white dark:bg-gray-800/50 backdrop-blur-sm",
            "border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-500",
            "shadow-sm group-hover:shadow-xl dark:group-hover:shadow-2xl",
            recommended && "ring-2 ring-green-200 dark:ring-green-400/30"
        )}>
            {/* Gradient overlay for hover effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-purple-50/0 to-indigo-50/0 dark:from-blue-900/0 dark:via-purple-900/0 dark:to-indigo-900/0 group-hover:from-blue-50/50 group-hover:via-purple-50/30 group-hover:to-indigo-50/50 dark:group-hover:from-blue-900/20 dark:group-hover:via-purple-900/10 dark:group-hover:to-indigo-900/20 rounded-2xl transition-all duration-300"></div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Icon section */}
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-400/30 dark:to-purple-400/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        {/* Icon container */}
                        <div className="relative w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-md dark:shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all duration-300 overflow-hidden">
                            <img
                                src={icon}
                                alt={title}
                                className="w-7 h-7 rounded-lg filter group-hover:brightness-110 transition-all duration-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Content section */}
                <div className="flex flex-col flex-grow text-center space-y-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                        {title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                        {description}
                    </p>
                </div>

                {/* Button section */}
                <div className="mt-4">
                    <Link
                        to={linkTo}
                        className="group/button relative w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 hover:from-blue-500 hover:to-purple-500 text-gray-900 dark:text-gray-100 hover:text-white font-semibold text-sm rounded-xl border border-gray-200 dark:border-gray-600 hover:border-transparent shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden whitespace-nowrap"
                        draggable={false}
                    >
                        <span className="relative z-10">{linkLabel}</span>

                        {/* Arrow icon */}
                        <svg className="w-4 h-4 ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/button:opacity-100 transition-all duration-500 transform -translate-x-full group-hover/button:translate-x-full skew-x-12"></div>
                    </Link>
                </div>
            </div>
        </div>
    </div>
)

const SetupPage = () => {
    // if the onboarding is ready the user shoulnd't do it again.
    useCheckUserIsOnboarded()

    return (
        <PageLayout header className="relative bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20">
            {/* Header section */}
            <div className="text-center mb-4 px-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Choose Your Setup Method
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                    Select how you'd like to access your wallet. Each option is secure and can be changed later.
                </p>
            </div>

            <Divider />

            {/* Cards grid */}
            <div className="w-full p-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
                    <SetupOption
                        title="Import Wallet"
                        description="Restore your existing wallet using a 12 or 24-word recovery phrase. Perfect if you're switching devices or browsers."
                        icon={importSeedIcon}
                        linkTo="/setup/import"
                        linkLabel="Import with Seed"
                        recommended={false}
                    />

                    <SetupOption
                        title="Import Private Key"
                        description="Add a specific account using its private key. Ideal for importing individual accounts from other wallets."
                        icon={privateKeyIcon}
                        linkTo="/setup/import-private-key"
                        linkLabel="Import Key"
                        recommended={false}
                    />

                    <SetupOption
                        title="Create New Wallet"
                        description="Generate a brand new wallet with a fresh recovery phrase. Best choice for new users starting their Web3 journey."
                        icon={newAccountIcon}
                        linkTo="/setup/create"
                        linkLabel="Create Wallet"
                        recommended={true}
                    />
                </div>

                {/* Help section */}
                <div className="mt-6 max-w-2xl mx-auto">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Need Help Choosing?
                                </h3>
                                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                    <strong>New to crypto?</strong> Choose "Create New Wallet".<br />
                                    <strong>Have an existing wallet?</strong> Use "Import Wallet".<br />
                                    <strong>Moving a specific account?</strong> Use "Import Private Key".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="absolute top-1/4 -left-12 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-1/3 -right-12 w-32 h-32 bg-gradient-to-tl from-indigo-400/10 to-blue-400/10 dark:from-indigo-400/5 dark:to-blue-400/5 rounded-full blur-2xl"></div>
        </PageLayout>
    )
}

export default SetupPage
