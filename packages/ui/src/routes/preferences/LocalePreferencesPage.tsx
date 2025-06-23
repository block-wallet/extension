import { useCallback, useEffect, useState } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    getValidCurrencies,
    setNativeCurrency,
} from "../../context/commActions"
import { CurrencySelection } from "../../components/currency/CurrencySelection"
import { BsInfoCircle } from "react-icons/bs"

const LocalePreferencesPage = () => {
    const history = useHistory()
    const [isLoading, setIsLoading] = useState(false)
    const [validCurrencies, setValidCurrencies] = useState<Currency[]>([])
    const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false)
    const { nativeCurrency } = useBlankState()!
    const [newCurrency, setNewCurrency] = useState<Currency>()

    const onSave = useCallback(async () => {
        try {
            if (
                !newCurrency ||
                newCurrency.code.toLowerCase() === nativeCurrency.toLowerCase()
            )
                return

            setIsLoading(true)
            await setNativeCurrency(newCurrency.code)
            setShowSuccessDialog(true)
        } catch (e) {
            throw new Error("Could not update the currency")
        } finally {
            setIsLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newCurrency])

    useEffect(() => {
        getValidCurrencies().then((currencies) => {
            setValidCurrencies(currencies)
        })
    }, [])

    useEffect(() => {
        setNewCurrency(
            validCurrencies.find(
                (currency) =>
                    currency.code.toLowerCase() === nativeCurrency.toLowerCase()
            )
        )
    }, [nativeCurrency, validCurrencies])

    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit: onSave,
                isEnabled: newCurrency?.code !== nativeCurrency,
            }}
            header={
                <PopupHeader
                    title="Locale Configuration"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        isLoading={isLoading}
                        disabled={newCurrency?.code === nativeCurrency}
                        onClick={onSave}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={showSuccessDialog}
                title="Locale Configuration"
                timeout={800}
                message="Your changes have been successfully saved!"
                onDone={history.goBack}
            />

            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Header Information */}
                <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <BsInfoCircle className="text-primary-blue-default dark:text-primary-blue-300 mt-0.5 flex-shrink-0" size={16} />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Display Currency Settings
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                Choose your preferred currency for displaying token values and portfolio totals.
                                This setting only affects the display format and doesn't change your actual token balances.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Currency Selection Section */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Native Currency
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Select the currency for displaying values throughout the wallet
                                </p>
                            </div>

                            {validCurrencies.length ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Currency
                                    </label>
                                    <CurrencySelection
                                        onCurrencyChange={setNewCurrency}
                                        topMargin={100}
                                        bottomMargin={60}
                                        dropdownWidth="w-[309px]"
                                        selectedCurrency={newCurrency}
                                        defaultCurrencyList={validCurrencies}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                                    <div className="text-center">
                                        <div className="animate-spin w-6 h-6 border-2 border-primary-blue-default border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-sm">Loading available currencies...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Current Selection Info */}
                {newCurrency && (
                    <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg border border-blue-200 dark:border-gray-600">
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="font-medium text-blue-700 dark:text-gray-300">
                                Current Selection:
                            </span>
                            <span className="text-blue-600 dark:text-white font-semibold">
                                {newCurrency.code.toUpperCase()} - {newCurrency.name}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default LocalePreferencesPage
