import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useState } from "react"

import SeedImport from "../../components/setup/SeedImport"
import { importWallet, discoverAccountsFromSeed } from "../../context/commActions"
import { getQueryParameter } from "../../util/url"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"
import { DiscoveredAccountInfo } from "../../../../background/src/utils/types/communication"
import Spinner from "../../components/spinner/Spinner"
import Checkbox from "../../components/input/Checkbox"
import AccountDisplay from "../../components/account/AccountDisplay"

enum ImportStep {
    ENTER_SEED_AND_PASSWORD,
    SELECT_ACCOUNTS,
}

const SeedImportPage = () => {
    const history: any = useOnMountHistory()
    const [currentStep, setCurrentStep] = useState<ImportStep>(
        ImportStep.ENTER_SEED_AND_PASSWORD
    )
    const [seedPhrase, setSeedPhrase] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccountInfo[]>([])
    const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({})
    const [discoveryLoading, setDiscoveryLoading] = useState<boolean>(false)
    const [discoveryError, setDiscoveryError] = useState<string>("")
    const [isImporting, setIsImporting] = useState<boolean>(false)
    const [importError, setImportError] = useState<string>("")

    useCheckUserIsOnboarded()

    const handleSeedAndPasswordSubmit = async (
        submittedPassword: string,
        submittedSeedPhrase: string
    ) => {
        setPassword(submittedPassword)
        setSeedPhrase(submittedSeedPhrase)
        setCurrentStep(ImportStep.SELECT_ACCOUNTS)

        setDiscoveryLoading(true)
        setDiscoveryError("")
        setDiscoveredAccounts([])
        setSelectedAccounts({})
        try {
            const accounts = await discoverAccountsFromSeed(
                submittedSeedPhrase,
                submittedPassword
            )
            setDiscoveredAccounts(accounts)
            if (accounts.length > 0) {
                setSelectedAccounts({ [accounts[0].address]: true })
            }
        } catch (error) {
            console.error("Error discovering accounts:", error)
            setDiscoveryError(
                error instanceof Error ? error.message : "Failed to discover accounts."
            )
        } finally {
            setDiscoveryLoading(false)
        }
    }

    const handleFinalImport = async () => {
        const addressesToImport = Object.entries(selectedAccounts)
            .filter(([_, isSelected]) => isSelected)
            .map(([address, _]) => address)

        if (addressesToImport.length === 0) {
            alert("Please select at least one account to import.")
            return
        }

        const indicesToImport = addressesToImport
            .map(addr => discoveredAccounts.find(acc => acc.address === addr)?.index)
            .filter(index => index !== undefined) as number[];

        console.log("Attempting final import with:", { password, seedPhrase, indicesToImport })
        setIsImporting(true)
        setImportError("")
        try {
            const defaultNetwork = getQueryParameter("defaultNetwork")
            const result = await importWallet(
                password,
                seedPhrase,
                defaultNetwork ? defaultNetwork : undefined,
                indicesToImport
            )
            if (result) {
                history.push({ pathname: "/setup/done" })
            } else {
                console.error("Importing wallet failed in final step (result=false).")
                setImportError("Import failed. Please check details and try again.")
            }
        } catch (error) {
            console.error("Error during final import:", error)
            setImportError(
                error instanceof Error ? error.message : "An unknown error occurred during import."
            )
        } finally {
            setIsImporting(false)
        }
    }

    const handleAccountSelectionChange = (address: string, isSelected: boolean) => {
        setSelectedAccounts(prev => ({
            ...prev,
            [address]: isSelected,
        }))
    }

    const handleBack = () => {
        if (currentStep === ImportStep.SELECT_ACCOUNTS) {
            setCurrentStep(ImportStep.ENTER_SEED_AND_PASSWORD)
            setDiscoveryError("")
            setImportError("")
        }
    }

    const renderStepContent = () => {
        const addressesToImport = Object.entries(selectedAccounts)
            .filter(([_, isSelected]) => isSelected)
            .map(([address, _]) => address)

        switch (currentStep) {
            case ImportStep.ENTER_SEED_AND_PASSWORD:
                return (
                    <div className="w-full max-w-lg mx-auto">
                        {/* Step indicator */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center space-x-2 mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        1
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Enter Seed Phrase</span>
                                </div>
                                <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm font-bold">
                                        2
                                    </div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Select Accounts</span>
                                </div>
                            </div>
                        </div>

                        {/* Main content card */}
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="text-center space-y-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Import Your Wallet
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Enter your seed phrase and set a password to restore your wallet
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning section */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                                Security Warning
                                            </h3>
                                            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                                Never share your seed phrase with anyone. BlockWallet will never ask for your seed phrase.
                                                Anyone with access to your seed phrase can control your wallet and steal your funds.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form section */}
                            <div className="p-6">
                                <SeedImport
                                    buttonLabel="Next: Discover Accounts"
                                    action={handleSeedAndPasswordSubmit}
                                />
                            </div>
                        </div>
                    </div>
                )
            case ImportStep.SELECT_ACCOUNTS:
                return (
                    <div className="w-full max-w-2xl mx-auto">
                        {/* Step indicator */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center space-x-2 mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        ✓
                                    </div>
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Seed Phrase Verified</span>
                                </div>
                                <div className="w-8 h-0.5 bg-green-300 dark:bg-green-600"></div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        2
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Accounts</span>
                                </div>
                            </div>
                        </div>

                        {/* Main content card */}
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="text-center space-y-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Select Accounts to Import
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Choose which accounts you'd like to add to your wallet
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Loading state */}
                                {discoveryLoading && (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                                <Spinner />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                                Discovering Accounts
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                                                Scanning your seed phrase for existing accounts using standard derivation paths...
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Error state */}
                                {discoveryError && (
                                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-6">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                                    Discovery Error
                                                </h3>
                                                <p className="text-xs text-red-800 dark:text-red-200">
                                                    {discoveryError}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Import error state */}
                                {importError && (
                                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-6">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                                    Import Error
                                                </h3>
                                                <p className="text-xs text-red-800 dark:text-red-200">
                                                    {importError}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* No accounts found */}
                                {!discoveryLoading && !discoveryError && discoveredAccounts.length === 0 && (
                                    <div className="text-center py-12 space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                No Accounts Found
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                                We couldn't find any accounts for this seed phrase using standard derivation paths.
                                                This might be a new wallet or use custom derivation paths.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Accounts list */}
                                {!discoveryLoading && !discoveryError && discoveredAccounts.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Found {discoveredAccounts.length} account{discoveredAccounts.length !== 1 ? 's' : ''}
                                            </h3>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {addressesToImport.length} selected
                                            </span>
                                        </div>

                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                            {discoveredAccounts.map((account, index) => (
                                                <div
                                                    key={account.address}
                                                    className={`group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${selectedAccounts[account.address]
                                                        ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                    onClick={() => handleAccountSelectionChange(account.address, !selectedAccounts[account.address])}
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex-shrink-0">
                                                            <Checkbox
                                                                label=""
                                                                checked={selectedAccounts[account.address] || false}
                                                                onChange={(checked) => handleAccountSelectionChange(account.address, checked)}
                                                            />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                    Account #{account.index + 1}
                                                                </h4>
                                                                {index === 0 && (
                                                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                                                                        Primary
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                                                                    {account.address}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                                    Derivation Path: m/44'/60'/0'/0/{account.index}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedAccounts[account.address] && (
                                                        <div className="absolute top-2 right-2">
                                                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer with actions */}
                            {!discoveryLoading && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-row justify-between space-x-4">
                                        <button
                                            onClick={handleBack}
                                            className="flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            disabled={isImporting}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Back
                                        </button>

                                        <button
                                            onClick={handleFinalImport}
                                            className="flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg min-w-[140px]"
                                            disabled={isImporting || addressesToImport.length === 0}
                                        >
                                            {isImporting ? (
                                                <>
                                                    <Spinner />
                                                    <span className="ml-2">Importing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Import {addressesToImport.length} Account{addressesToImport.length !== 1 ? 's' : ''}</span>
                                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {addressesToImport.length === 0 && discoveredAccounts.length > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                            Please select at least one account to import
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            default:
                return <div>Unknown step</div>
        }
    }

    return (
        <PageLayout className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-screen">
            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
                {/* Page header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
                        Import Your Wallet
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Restore your existing wallet using your recovery phrase
                    </p>
                </div>

                <Divider />

                {/* Step content */}
                <div className="mt-8">
                    {renderStepContent()}
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-purple-400/10 dark:from-indigo-400/5 dark:to-purple-400/5 rounded-full blur-3xl"></div>

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
                backgroundSize: '24px 24px'
            }}></div>
        </PageLayout>
    )
}

export default SeedImportPage
