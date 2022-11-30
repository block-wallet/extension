import VerticalSelect from "../../components/input/VerticalSelect"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import searchIcon from "../../assets/images/icons/search.svg"
import padlock from "../../assets/images/icons/padlock.svg"

import { useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import { forceDepositsImport } from "../../context/commActions"
import Alert from "../../components/ui/Alert"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import Spinner from "../../components/spinner/ThinSpinner"
import LoadingDots from "../../components/loading/LoadingDots"
import CollapsableMessage from "../../components/CollapsableMessage"
import { CgDanger } from "react-icons/cg"

const PrivacySettingsPage = () => {
    const history = useOnMountHistory()
    const reconstructTornadoNotes =
        history.location.state?.reconstructTornadoNotes ?? false
    const {
        importingErrors,
        isImportingDeposits,
        isUserNetworkOnline,
        areDepositsPending,
        areWithdrawalsPending,
    } = useBlankState()!
    const [showReconstructDialog, setShowReconstructDialog] = useState<boolean>(
        reconstructTornadoNotes
    )
    const [showReconstructSuccessDialog, setShowReconstructSuccessDialog] =
        useState<boolean>(false)

    const showError =
        importingErrors && importingErrors.length > 0 && !isImportingDeposits
    return (
        <PopupLayout header={<PopupHeader title="Privacy" close="/" />}>
            <ConfirmDialog
                title="Reconstruct tornado notes"
                message={`This will query all tornado events. It can take up to 15 minutes and you will not be able to use privacy features or change networks during this time.`}
                open={showReconstructDialog}
                onClose={() => {
                    setShowReconstructDialog(false)
                }}
                onConfirm={() => {
                    setShowReconstructSuccessDialog(true)
                }}
            />

            <SuccessDialog
                open={showReconstructSuccessDialog}
                title="Reconstruct tornado notes"
                timeout={800}
                message="Note reconstruction started."
                onDone={() => {
                    forceDepositsImport()
                    setShowReconstructSuccessDialog(false)
                }}
            />
            {showError && (
                <CollapsableMessage
                    type="error"
                    isCollapsedByDefault={true}
                    dialog={{
                        title: "Error reconstructing notes",
                        message:
                            "There was an error trying to import your deposits. Please try one more time.",
                    }}
                    collapsedMessage={
                        <div className="text-center bg-red-100 hover:bg-red-50 opacity-90  w-full p-2 space-x-2 flex tems-center font-bold justify-center">
                            <CgDanger className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-600">
                                <span className="font-bold">
                                    We found an error trying to import your
                                    deposits.
                                </span>
                            </span>
                        </div>
                    }
                />
            )}
            <div className="flex flex-col space-y-7 p-6">
                {isImportingDeposits && (
                    <div className="flex flex-row space-x-2 mb-2">
                        <Spinner />
                        <span className="text-xs text-gray-500">
                            Please wait until notes are fully reconstructed{" "}
                            <LoadingDots />
                        </span>
                    </div>
                )}
                <VerticalSelect
                    options={[
                        {
                            icon: searchIcon,
                            label: "Deposits and Withdrawals",
                            to: "/settings/privacy/depositWithdrawalsHistory",
                        },
                        {
                            icon: padlock,
                            label: "Reconstruct Tornado Notes",
                            to: "/",
                            name: "reconstruct",
                        },
                    ]}
                    value={undefined}
                    onChange={(option) => {
                        if (option.name === "reconstruct") {
                            return setShowReconstructDialog(true)
                        }
                        history.push(option.to)
                    }}
                    containerClassName="flex flex-col space-y-3"
                    display={(option, i) => {
                        const className =
                            "flex flex-row space-x-3 items-center text-gray-900"
                        const children = (
                            <>
                                <img
                                    src={option.icon}
                                    alt="icon"
                                    className="w-5 h-5"
                                />
                                <span className="font-bold">
                                    {option.label}
                                </span>
                            </>
                        )
                        return <div className={className}>{children}</div>
                    }}
                    isDisabled={(option) =>
                        isImportingDeposits ||
                        (option.name === "reconstruct" &&
                            !isUserNetworkOnline) ||
                        (option.name === "reconstruct" &&
                            (areDepositsPending || areWithdrawalsPending))
                    }
                />
                <Alert type="warn">
                    <span className="text-sm font-medium">
                        <span>
                            On 8th August 2022, U.S. Department of the
                            Treasury’s Office of Foreign Assets Control
                            sanctioned Tornado Cash. As a response, BlockWallet
                            halted the use of the Tornado Protocol in our
                            wallet.
                        </span>
                        <br />
                        <br />
                        <span>
                            With the functions above users of BlockWallet that
                            have deposited into the Tornado Protocol before, can
                            still see their Tornado Notes, in order to use
                            another interface to withdraw their funds from
                            Tornado or use BlockWallet’s compliance feature.
                        </span>
                    </span>
                </Alert>
            </div>
        </PopupLayout>
    )
}

export default PrivacySettingsPage
