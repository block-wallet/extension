import { useBlankState } from "../../context/background/backgroundHooks"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import FullScreenDialog from "./FullScreenDialog"

const IsLockedDialog = () => {
    const { isUnlocked } = useBlankState()!

    return (
        <FullScreenDialog open={!isUnlocked}>
            <div className="p-8 flex flex-col items-center space-y-6">
                {/* Warning Banner */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg w-full p-4 flex space-x-4 items-center font-semibold justify-center border border-yellow-200 dark:border-yellow-800">
                    <ExclamationCircleIconFull
                        size="24"
                        profile="outlined"
                        className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                    />
                    <span className="text-lg text-yellow-800 dark:text-yellow-200">
                        Wallet Locked
                    </span>
                </div>

                {/* Message */}
                <div className="text-center space-y-4">
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                        BlockWallet is locked for your security.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Please open the BlockWallet extension and enter your password to continue accessing your wallet.
                    </p>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2 bg-primary-blue-default hover:bg-primary-blue-hover text-white rounded-lg font-medium transition-colors duration-200"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        </FullScreenDialog>
    )
}

export default IsLockedDialog
