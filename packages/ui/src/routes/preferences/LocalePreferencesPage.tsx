import { Currency } from "@block-wallet/background/utils/currency"
import React, { useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import Select from "../../components/input/Select"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    getValidCurrencies,
    setNativeCurrency,
} from "../../context/commActions"

const LocalePreferencesPage = () => {
    const history = useHistory()
    const [isLoading, setIsLoading] = useState(false)
    const [validCurrencies, setValidCurrencies] = useState<Currency[]>([])
    const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false)
    const { nativeCurrency } = useBlankState()!
    const [newCurrency, setNewCurrency] = useState(nativeCurrency)
    const onSave = async () => {
        try {
            setIsLoading(true)
            await setNativeCurrency(newCurrency)
            setShowSuccessDialog(true)
        } catch (e) {
            throw new Error("Could not update the currency")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        getValidCurrencies().then((currencies) => {
            setValidCurrencies(currencies)
        })
    }, [])
    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit: onSave,
                isEnabled: newCurrency !== nativeCurrency,
            }}
            header={<PopupHeader title="Locale Configuration" close="/" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        isLoading={isLoading}
                        disabled={newCurrency === nativeCurrency}
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
                    <Select
                        onChange={setNewCurrency}
                        currentValue={newCurrency}
                        id="currency"
                        label="Currency"
                    >
                        {validCurrencies.map((c) => (
                            <Select.Option value={c.code}>
                                {`${c.code.toUpperCase()} - ${
                                    c.name || c.code.toUpperCase()
                                }`}
                            </Select.Option>
                        ))}
                    </Select>
                ) : null}
            </div>
        </PopupLayout>
    )
}

export default LocalePreferencesPage
