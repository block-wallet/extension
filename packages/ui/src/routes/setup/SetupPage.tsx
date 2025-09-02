import { FunctionComponent } from "react"

import { Link } from "react-router-dom"
import Divider from "../../components/Divider"
import { classnames } from "../../styles/classes"

import importSeedIcon from "../../assets/images/icons/import_seed.svg"
import newAccountIcon from "../../assets/images/icons/new_account.svg"
import PageLayout from "../../components/PageLayout"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

const SetupOption: FunctionComponent<{
    title: string
    description: string
    icon: string | React.ReactElement
    linkTo: string
    linkLabel: string
    recommended?: boolean
}> = ({ title, description, icon, linkTo, linkLabel, recommended = false }) => (
    <div className="group relative h-full">
        {recommended && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    Recommended
                </span>
            </div>
        )}

        <div className={classnames(
            "relative flex flex-col h-full p-4 rounded-xl border-2 transition-all duration-300 transform group-hover:scale-[1.02]",
            "bg-white dark:bg-gray-800/50 backdrop-blur-sm",
            "border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-500",
            "shadow-sm group-hover:shadow-lg dark:group-hover:shadow-xl",
            recommended && "ring-2 ring-green-200 dark:ring-green-400/30"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-purple-50/0 to-indigo-50/0 dark:from-blue-900/0 dark:via-purple-900/0 dark:to-indigo-900/0 group-hover:from-blue-50/30 group-hover:via-purple-50/20 group-hover:to-indigo-50/30 dark:group-hover:from-blue-900/10 dark:group-hover:via-purple-900/5 dark:group-hover:to-indigo-900/10 rounded-xl transition-all duration-300"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-center mb-3">
                    <div className="relative">
                        <div className="relative w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg shadow-md dark:shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all duration-300">
                            {typeof icon === 'string' ? (
                                <img
                                    src={icon}
                                    alt={title}
                                    className="w-5 h-5 rounded-lg filter group-hover:brightness-110 transition-all duration-300"
                                />
                            ) : (
                                <div className="w-5 h-5 filter group-hover:brightness-110 transition-all duration-300">
                                    {icon}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col flex-grow text-center space-y-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                        {title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                        {description}
                    </p>
                </div>

                <div className="mt-3">
                    <Link
                        to={linkTo}
                        className="group/button relative w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 hover:from-blue-500 hover:to-purple-500 text-gray-900 dark:text-gray-100 hover:text-white font-semibold text-xs rounded-lg border border-gray-200 dark:border-gray-600 hover:border-transparent shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden"
                        draggable={false}
                    >
                        <span className="relative z-10">{linkLabel}</span>

                        <svg className="w-3 h-3 ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    </div>
)

const SetupPage = () => {
    useCheckUserIsOnboarded()

    return (
        <PageLayout screen className="w-full h-screen max-w-none shadow-none rounded-none relative bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 flex flex-col">
            <div className="flex-1 flex flex-col py-3 min-h-0">
                <div className="text-center mb-4 px-6">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Choose Your Setup Method
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                        Select how you'd like to access your wallet. Each option is secure and can be changed later.
                    </p>
                </div>

                <Divider />

                {/* Cards grid */}
                <div className="flex-1 flex flex-col justify-center w-full px-6 py-3 min-h-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto h-full max-h-96">
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
                        icon={
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 32 32">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 9.33a2.67 2.67 0 012.67 2.67m5.33 0a8 8 0 01-10.32 7.66L14.67 22.67H12v2.66H9.33v2.67H5.33a1.33 1.33 0 01-1.33-1.33v-3.45a1.33 1.33 0 01.39-.94l7.95-7.95A8 8 0 0128 12z" />
                            </svg>
                        }
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
                    <div className="mt-3 max-w-4xl mx-auto">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3">
                            <div className="flex items-center justify-center space-x-6 text-center">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-blue-900 dark:text-blue-100 font-semibold">Need Help?</p>
                                        <p className="text-xs text-blue-800 dark:text-blue-200">
                                            <span className="font-semibold">New?</span> Create • <span className="font-semibold">Existing?</span> Import • <span className="font-semibold">Single account?</span> Private Key
                                        </p>
                                    </div>
                                </div>
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
