import { DefaultGasOptions } from "@block-wallet/background/controllers/PreferencesController"
import classnames from "classnames"
import { useCallback, useState } from "react"
import { useHistory } from "react-router-dom"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import MiniCheckmark from "../../components/icons/MiniCheckmark"
import InfoComponent from "../../components/InfoComponent"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { setDefaultGasPreference } from "../../context/commActions"

const gasOptions = [
    { name: "low", desc: "Cheaper but slower" },
    { name: "medium", desc: "Balance price and speed" },
    { name: "high", desc: "Pricier but faster" },
]
const DefaultGasPreferencesPage = () => {
    const history = useHistory()

    const defaultGasOption = useBlankState()?.defaultGasOption || "medium"
    const [selectedOption, setSelectedOption] =
        useState<DefaultGasOptions>(defaultGasOption)
    const [isLoading, setIsLoading] = useState(false)
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)

    const onSave = useCallback(async () => {
        try {
            setIsLoading(true)
            await setDefaultGasPreference(selectedOption)
            setShowSuccessDialog(true)
        } catch (e) {
            throw new Error("Could not update the default gas option")
        } finally {
            setIsLoading(false)
        }
    }, [selectedOption])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Default Gas Setting"
                    disabled={isLoading}
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        isLoading={isLoading}
                        disabled={defaultGasOption === selectedOption}
                        onClick={onSave}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={showSuccessDialog}
                title="Default Gas Option"
                timeout={800}
                message="Your changes have been succesfully saved!"
                onDone={history.goBack}
            />
            <div className="flex flex-col p-6 space-y-4 w-full">
                <span className="text-sm text-primary-grey-dark">
                    Set your preferred gas setting for all future transactions.
                </span>
                <div className="flex flex-col w-full space-y-4">
                    {gasOptions.map((option) => (
                        <div
                            key={option.name}
                            className={classnames(
                                "w-full flex flex-row p-4 justify-between cursor-pointer rounded-md hover:border-primary-black-default hover:text-primary-black-default border",
                                selectedOption === option.name &&
                                    "text-primary-black-default border-primary-black-default"
                            )}
                            onClick={() => {
                                setSelectedOption(
                                    option.name as DefaultGasOptions
                                )
                            }}
                        >
                            <div className="flex flex-col space-y-1">
                                <label
                                    className={classnames(
                                        "text-sm font-semibold cursor-pointer capitalize"
                                    )}
                                >
                                    {option.name}
                                </label>
                                <span className="text-xs">{option.desc}</span>
                            </div>
                            {selectedOption === option.name && (
                                <div className="h-full flex items-center">
                                    <MiniCheckmark fill="#08090A" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex flex-row space-x-2 w-full ">
                    <InfoComponent className="!space-x-2">
                        This setting will apply on all transactions on all
                        networks. You will still be able to change the gas
                        amount before submitting your transactions.
                    </InfoComponent>
                </div>
            </div>
        </PopupLayout>
    )
}

export default DefaultGasPreferencesPage
