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
                    <>
                        <div className="flex flex-col p-6 space-y-6">
                            <div className="flex flex-col space-y-4">
                                <div className="flex flex-col px-6 my-2 space-y-1">
                                    <span className="text-sm leading-relaxed text-center text-primary-grey-dark">
                                        Select the length of your seed phrase, enter it,
                                        and set a password to import your account.
                                    </span>
                                </div>
                                <div className="w-full px-4 py-4 text-sm text-center text-secondary-red-default bg-red-100 rounded">
                                    <strong className="font-semibold">Warning: </strong>
                                    <span>
                                        Never disclose your seed phrase. Anyone asking for
                                        your seed phrase is most likely trying to steal your
                                        funds.
                                    </span>
                                </div>
                            </div>
                        </div>
                        <SeedImport
                            buttonLabel="Next"
                            action={handleSeedAndPasswordSubmit}
                        />
                    </>
                )
            case ImportStep.SELECT_ACCOUNTS:
                return (
                    <div className="flex flex-col items-center p-6 space-y-4 w-full">
                        <span className="text-lg font-semibold">Select Accounts to Import</span>
                        {discoveryLoading && (
                            <div className="flex flex-col items-center space-y-2">
                                <Spinner />
                                <span className="text-sm text-primary-grey-dark">
                                    Discovering accounts...
                                </span>
                            </div>
                        )}
                        {discoveryError && (
                            <div className="w-full p-3 my-2 text-sm text-center text-yellow-800 bg-yellow-100 border border-yellow-300 rounded">
                                <strong>Discovery Error:</strong> {discoveryError}
                            </div>
                        )}
                        {importError && (
                            <div className="w-full p-3 my-2 text-sm text-center text-red-700 bg-red-100 border border-red-300 rounded">
                                <strong>Import Error:</strong> {importError}
                            </div>
                        )}
                        {!discoveryLoading && !discoveryError && discoveredAccounts.length === 0 && (
                            <p className="text-sm text-center text-primary-grey-dark">
                                No accounts found for this seed phrase using the standard derivation path.
                            </p>
                        )}
                        {!discoveryLoading && !discoveryError && discoveredAccounts.length > 0 && (
                            <div className="w-full space-y-2 max-h-60 overflow-y-auto pr-2">
                                {discoveredAccounts.map((account) => (
                                    <div key={account.address} className="flex items-center justify-between p-2 border rounded border-gray-300">
                                        <div className="flex items-center space-x-2 flex-grow">
                                            <Checkbox
                                                label=""
                                                checked={selectedAccounts[account.address] || false}
                                                onChange={(checked) => handleAccountSelectionChange(account.address, checked)}
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{`Account #${account.index + 1}`}</span>
                                                <span className="text-xs font-mono text-gray-500 truncate" title={account.address}>
                                                    {account.address}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-row w-full justify-between mt-6">
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isImporting || discoveryLoading}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleFinalImport}
                                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-blue-default rounded hover:bg-primary-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isImporting || discoveryLoading || addressesToImport.length === 0}
                            >
                                {isImporting ? (
                                    <Spinner />
                                ) : (
                                    "Import Selected Accounts"
                                )}
                            </button>
                        </div>
                    </div>
                )
            default:
                return <div>Unknown step</div>
        }
    }

    return (
        <PageLayout header maxWidth="max-w-lg">
            <span className="my-6 text-lg font-semibold">
                Import an Account
            </span>
            <Divider />
            {renderStepContent()}
        </PageLayout>
    )
}

export default SeedImportPage
