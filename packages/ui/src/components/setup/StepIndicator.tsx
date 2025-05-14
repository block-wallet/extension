import { FunctionComponent } from "react"
import { classnames } from "../../styles/classes"

export interface StepIndicatorProps {
    /**
     * Current step number (1-based)
     */
    currentStep: number
    /**
     * Total number of steps
     */
    totalSteps: number
    /**
     * Step labels to display
     */
    stepLabels?: string[]
    /**
     * Optional CSS class name
     */
    className?: string
}

const StepIndicator: FunctionComponent<StepIndicatorProps> = ({
    currentStep,
    totalSteps,
    stepLabels,
    className
}) => {
    return (
        <div className={classnames("w-full px-6 py-4", className)}>
            <div className="flex flex-col space-y-2">
                {/* Step text indicator */}
                <div className="flex justify-between items-center">
                    {stepLabels ? (
                        <span className="text-sm font-medium text-primary-blue-default">
                            {stepLabels[currentStep - 1]}
                        </span>
                    ) : (
                        <span className="text-sm font-medium text-primary-blue-default">
                            Step {currentStep} of {totalSteps}
                        </span>
                    )}
                    <span className="text-xs text-primary-grey-dark">
                        {Math.round((currentStep / totalSteps) * 100)}% Complete
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-primary-grey-default rounded-full h-2">
                    <div
                        className="bg-primary-blue-default h-2 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    )
}

export default StepIndicator
