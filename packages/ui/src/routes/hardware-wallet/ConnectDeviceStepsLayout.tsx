import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import HardwareWalletSetupLayout from "./SetupLayout"
import classnames from "classnames"
import Step from "./Step"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import { useHistory } from "react-router-dom"
import { Classes } from "../../styles"
import { ConnectionSeptInfo } from "../../util/connectionStepUtils"
import Tooltip from "../../components/label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"

interface ConnectDeviceProps {
    onConnect: () => void
    onCancel?: () => void
    steps: ConnectionSeptInfo[]
    isLoading: boolean
    title: string
    subtitle: string
    stepFontSize?: "sm" | "md" | "lg" | undefined
}

const ConnectDeviceStepsLayout: React.FC<ConnectDeviceProps> = ({
    onConnect,
    onCancel,
    steps,
    isLoading,
    title,
    subtitle,
    stepFontSize,
}) => {
    const history = useHistory()
    return (
        <HardwareWalletSetupLayout
            title={title}
            subtitle={subtitle}
            buttons={
                <>
                    <ButtonWithLoading
                        label="Cancel"
                        buttonClass={classnames(Classes.liteButton, "h-14")}
                        disabled={isLoading}
                        onClick={
                            onCancel
                                ? onCancel
                                : () => history.push("/hardware-wallet")
                        }
                    />

                    <ButtonWithLoading
                        label="Continue"
                        buttonClass={classnames(Classes.button, "h-14")}
                        isLoading={isLoading}
                        onClick={onConnect}
                    />
                </>
            }
        >
            {isLoading && <LoadingOverlay />}
            <div className="w-full p-8 space-y-6 bg-white dark:bg-gray-800">
                {/* Steps Header */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">
                        🔧 Connection Steps
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Follow these steps in order to establish a secure connection with your hardware wallet.
                    </p>
                </div>

                {/* Steps List */}
                <div className="space-y-4">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="flex flex-row items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-sm dark:hover:shadow-gray-900/30 transition-all duration-200"
                        >
                            <Step
                                step={index + 1}
                                text={step.label}
                                size={stepFontSize}
                            />
                            {step.info && (
                                <div className="group relative ml-auto">
                                    <AiFillInfoCircle
                                        size={20}
                                        className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-blue-default dark:hover:text-primary-blue-400 transition-colors duration-200"
                                    />
                                    <Tooltip content={
                                        <div className="max-w-xs p-2">
                                            <span className="text-xs text-gray-700 dark:text-gray-300">
                                                {step.info}
                                            </span>
                                        </div>
                                    } />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Additional Tips */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-6">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        💡 <strong>Tip:</strong> Make sure your device is properly connected and unlocked before clicking Continue.
                    </p>
                </div>
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default ConnectDeviceStepsLayout
