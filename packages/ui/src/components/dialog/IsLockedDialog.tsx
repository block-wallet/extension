import { useBlankState } from "../../context/background/backgroundHooks"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import FullScreenDialog from "./FullScreenDialog"

const IsLockedDialog = () => {
    const { isUnlocked } = useBlankState()!

    return (
        <FullScreenDialog open={!isUnlocked}>
            <div className="p-8 flex flex-col items-center space-y-4">
                <div className="bg-yellow-100 opacity-90 rounded-md w-full p-4 flex space-x-4 items-center font-bold justify-center">
                    <ExclamationCircleIconFull size="20" profile="outlined" />{" "}
                    <span className="text-xl" style={{ color: "#FFBB54" }}>
                        Warning: Locked Wallet
                    </span>
                </div>
                <span className="text-base p-4 text-center inline-flex">
                    BlockWallet is locked. Please login again in the extension
                    to continue.
                </span>
            </div>
        </FullScreenDialog>
    )
}

export default IsLockedDialog
