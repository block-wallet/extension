import { FunctionComponent } from "react"
import { Classes } from "../../styles"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import FullScreenDialog from "./FullScreenDialog"

interface BetaDialogProps {
    isOpen: boolean
    onClick: () => void
}

const IsBetaDialog: FunctionComponent<BetaDialogProps> = ({
    isOpen,
    onClick,
}) => {
    return (
        <FullScreenDialog
            open={isOpen}
            className="relative py-6 opacity-100 w-3/12 bg-white shadow-md rounded-md flex-col flex"
        >
            <div className="flex flex-col items-center space-y-6 p-4">
                <div className="bg-yellow-100 opacity-90 rounded-md w-full p-4 flex space-x-4 items-center font-bold justify-center">
                    <ExclamationCircleIconFull size="20" profile="outlined" />{" "}
                    <span className="text-xl" style={{ color: "#FFBB54" }}>
                        Warning! Experimental Version
                    </span>
                </div>
                <span className="text-sm  text-center">
                    This version of BlockWallet is experimental and intended for
                    testing purposes only. Please proceed with caution and read
                    about the intended use{" "}
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-300"
                        href="https://chrome.google.com/webstore/detail/experimental-blockwallet/fhjkaoanopnkfmlahebnoeghlacnimpj"
                    >
                        here.
                    </a>
                </span>
                <button className={Classes.button} onClick={onClick}>
                    I understand
                </button>
            </div>
        </FullScreenDialog>
    )
}

export default IsBetaDialog
