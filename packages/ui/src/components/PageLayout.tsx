import { FunctionComponent } from "react"
import { classnames } from "../styles/classes"
import FullCenterContainer from "./FullCenterContainer"
import StepIndicator from "./setup/StepIndicator"

const PageLayout: FunctionComponent<{
    centered?: boolean
    header?: boolean
    className?: string
    maxWidth?: string
    style?: React.CSSProperties
    sideComponent?: React.ReactNode
    children?: React.ReactNode
    screen?: boolean
    /**
     * Show step indicator with current step progress
     */
    withSteps?: boolean
    /**
     * Current step number (1-based)
     */
    currentStep?: number
    /**
     * Total number of steps
     */
    totalSteps?: number
    /**
     * Optional step labels
     */
    stepLabels?: string[]
}> = ({
    children,
    centered = false,
    className,
    maxWidth,
    style,
    sideComponent,
    screen = false,
    withSteps = false,
    currentStep = 1,
    totalSteps = 1,
    stepLabels,
}) => (
        <FullCenterContainer centered={centered} screen={screen}>
            <div className="flex-1 flex flex-col items-center min-h-0">
                <div
                    className={classnames(
                        "flex-1 flex flex-row w-full justify-center min-h-0"
                    )}
                >
                    <div
                        className={classnames(
                            "flex-1 flex flex-col items-center bg-white dark:bg-gray-900 min-h-0",
                            screen ? "shadow-none rounded-none max-w-none" : "shadow-lg rounded-md",
                            maxWidth || (screen ? "" : "max-w-2xl"),
                            className
                        )}
                        style={style}
                    >
                        {withSteps && (
                            <StepIndicator
                                currentStep={currentStep}
                                totalSteps={totalSteps}
                                stepLabels={stepLabels}
                            />
                        )}
                        {children}
                    </div>
                    {sideComponent}
                </div>
            </div>
        </FullCenterContainer>
    )

export default PageLayout
