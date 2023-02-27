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
}

const ConnectDeviceStepsLayout: React.FC<ConnectDeviceProps> = ({
    onConnect,
    onCancel,
    steps,
    isLoading,
    title,
    subtitle,
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
            <div className="w-full p-8 space-y-4">
                {steps.map((step, index) => (
                    <div className="flex flex-row items-center space-x-2">
                        <Step step={index + 1} text={step.label} key={index} />
                        {step.info && (
                            <div className="group relative">
                                <AiFillInfoCircle
                                    size={26}
                                    className="pl-2 text-primary-200 cursor-pointer hover:text-primary-blue-default"
                                />
                                <Tooltip content={step.info} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default ConnectDeviceStepsLayout
