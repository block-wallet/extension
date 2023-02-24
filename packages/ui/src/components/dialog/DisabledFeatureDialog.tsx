import { FunctionComponent } from "react"
import WarningDialog from "./WarningDialog"

interface DisabledFeatureProps {
    isOpen: boolean
    onDone: () => void
    disabledFeatureName: string
}

const DisabledFeatureDialog: FunctionComponent<DisabledFeatureProps> = ({
    isOpen,
    onDone,
    disabledFeatureName,
}) => {
    return (
        <WarningDialog
            open={isOpen}
            message={
                <>
                    This is an experimental version of BlockWallet.{" "}
                    {disabledFeatureName} functionality has been disabled. You
                    can install the standard version of BlockWallet{" "}
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-300 mt-auto"
                        href="https://chrome.google.com/webstore/detail/blockwallet/bopcbmipnjdcdfflfgjdgdjejmgpoaab"
                    >
                        here.
                    </a>
                </>
            }
            title={"Disabled!"}
            onDone={onDone}
        />
    )
}

export default DisabledFeatureDialog
