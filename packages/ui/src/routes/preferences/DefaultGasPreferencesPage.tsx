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
import { BsFuelPumpFill, BsInfoCircle, BsSpeedometer2, BsClock, BsCurrencyDollar } from "react-icons/bs"

const gasOptions = [
    {
        name: "low",
        desc: "Cheaper but slower",
        icon: BsClock,
        details: "Lowest gas fees, longer confirmation times",
        color: "text-green-600 dark:text-green-400"
    },
    {
        name: "medium",
        desc: "Balance price and speed",
        icon: BsSpeedometer2,
        details: "Balanced approach for most transactions",
        color: "text-blue-600 dark:text-blue-400"
    },
    {
        name: "high",
        desc: "Pricier but faster",
        icon: BsFuelPumpFill,
        details: "Higher gas fees, faster confirmation times",
        color: "text-orange-600 dark:text-orange-400"
    },
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

    const selectedGasOption = gasOptions.find(option => option.name === selectedOption)

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
                message="Your changes have been successfully saved!"
                onDone={history.goBack}
            />

            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsFuelPumpFill className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Gas Fee Preferences
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Set your preferred default gas setting for all future transactions.
                                You can always adjust individual transaction fees before confirming.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Current Selection */}
                {selectedGasOption && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Current Selection:
                            </span>
                            <span className={`text-sm font-semibold capitalize ${selectedGasOption.color}`}>
                                {selectedGasOption.name}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedGasOption.details}
                        </p>
                    </div>
                )}

                {/* Gas Options */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Choose Gas Setting
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Select your preferred balance between transaction speed and cost
                            </p>
                        </div>

                        <div className="space-y-3">
                            {gasOptions.map((option) => {
                                const IconComponent = option.icon
                                const isSelected = selectedOption === option.name

                                return (
                                    <div
                                        key={option.name}
                                        className={classnames(
                                            "w-full flex items-center p-4 cursor-pointer rounded-lg border-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700",
                                            isSelected
                                                ? "border-primary-blue-default bg-primary-blue-50 dark:bg-primary-blue-900/20 dark:border-primary-blue-400"
                                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                        )}
                                        onClick={() => {
                                            setSelectedOption(option.name as DefaultGasOptions)
                                        }}
                                    >
                                        <div className="flex items-center space-x-3 flex-grow">
                                            <div className={`p-2 rounded-lg ${isSelected
                                                ? "bg-primary-blue-100 dark:bg-primary-blue-800"
                                                : "bg-gray-100 dark:bg-gray-700"
                                                }`}>
                                                <IconComponent className={`text-lg ${isSelected
                                                    ? "text-primary-blue-600 dark:text-primary-blue-300"
                                                    : option.color
                                                    }`} />
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-sm font-semibold cursor-pointer capitalize text-gray-900 dark:text-gray-100">
                                                        {option.name}
                                                    </label>
                                                    {option.name === "medium" && (
                                                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    {option.desc}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {option.details}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center ml-3 text-primary-blue-600 dark:text-primary-blue-400">
                                                <MiniCheckmark fill="currentColor" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Information Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start space-x-3">
                        <BsInfoCircle className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                Important Information
                            </h4>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <p>• This setting applies to all transactions on all networks</p>
                                <p>• You can still adjust gas fees before confirming each transaction</p>
                                <p>• Higher gas fees generally result in faster transaction confirmation</p>
                                <p>• Network congestion may affect actual confirmation times</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gas Fee Explanation */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsCurrencyDollar className="text-green-600 dark:text-green-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Understanding Gas Fees
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <p>• <span className="font-medium">Low:</span> Best for non-urgent transactions when you want to minimize costs</p>
                                <p>• <span className="font-medium">Medium:</span> Good balance for most everyday transactions</p>
                                <p>• <span className="font-medium">High:</span> Use when you need transactions to confirm quickly</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default DefaultGasPreferencesPage
