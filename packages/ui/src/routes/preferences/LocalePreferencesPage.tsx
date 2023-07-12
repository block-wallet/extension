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
                message="Your changes have been succesfully saved!"
                onDone={history.goBack}
            />
            <div className="flex flex-col p-6 space-y-6 w-full">
                {validCurrencies.length ? (
                    <>
                        <CurrencySelection
                            onCurrencyChange={setNewCurrency}
                            topMargin={100}
                            bottomMargin={60}
                            dropdownWidth="w-[309px]"
                            selectedCurrency={newCurrency}
                            defaultCurrencyList={validCurrencies}
                        />
                    </>
                ) : null}
            </div>
        </PopupLayout>
    )
}

export default LocalePreferencesPage
