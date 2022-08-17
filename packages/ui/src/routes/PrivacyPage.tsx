import { useState } from "react"

// Components
import PopupHeader from "../components/popup/PopupHeader"
import PopupLayout from "../components/popup/PopupLayout"
import VerticalSelect from "../components/input/VerticalSelect"
import ConfirmDialog from "../components/dialog/ConfirmDialog"
import SuccessDialog from "../components/dialog/SuccessDialog"

// Assets
import compliance from "../assets/images/icons/compliance.svg"
import tornado from "../assets/images/icons/tornado.svg"

// Context
import { useOnMountHistory } from "../context/hooks/useOnMount"
import { forceDepositsImport } from "../context/commActions"
import AccountIcon from "../components/icons/AccountIcon"
import { useBlankState } from "../context/background/backgroundHooks"
import classnames from "classnames"
import Spinner from "../components/spinner/Spinner"
import { TokenWithBalance } from "../context/hooks/useTokensList"

/**
 * PrivacyPage:
 */
const PrivacyPage = () => {
    const history = useOnMountHistory()
    const preSelectedAsset = history.location.state
        ?.preSelectedAsset as TokenWithBalance
    const isAssetDetailsPage =
        history.location.state?.isAssetDetailsPage ?? false

    const {
        isImportingDeposits,
        importingErrors,
        isUserNetworkOnline,
        areDepositsPending,
        areWithdrawalsPending,
    } = useBlankState()!

    const [isLoading, setIsLoading] = useState(false)
    const [showReconstructDialog, setShowReconstructDialog] = useState(false)
    const [showReconstructSuccessDialog, setShowReconstructSuccessDialog] =
        useState(false)

    const thereIsImportDepositErrors =
        importingErrors && importingErrors.length > 0

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Privacy"
                    onBack={() => {
                        isAssetDetailsPage && preSelectedAsset
                            ? history.push({
                                  pathname: "/asset/details",
                                  state: {
                                      address: preSelectedAsset.token.address,
                                      transitionDirection: "right",
                                  },
                              })
                            : history.push("/")
                    }}
                />
            }
        >
            <div className="flex flex-col space-y-7 p-6">
                <div className="space-y-4">
                    <span className="text-xs">PRIVACY POOL ACTIONS</span>
                    <div className="flex flex-row space-x-4 items-center justify-evenly">
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    !isImportingDeposits &&
                                    !thereIsImportDepositErrors
                                ) {
                                    history.push({
                                        pathname: "/privacy/deposit",
                                        state: {
                                            preSelectedAsset,
                                            isAssetDetailsPage,
                                        },
                                    })
                                }
                            }}
                            className={classnames(
                                "bg-primary-100 rounded-md p-4 w-1/2 flex flex-col items-center group space-y-3 cursor-pointer hover:bg-primary-200",
                                (isImportingDeposits || !isUserNetworkOnline) &&
                                    "opacity-50 pointer-events-none"
                            )}
                            disabled={
                                isImportingDeposits ||
                                thereIsImportDepositErrors ||
                                !isUserNetworkOnline
                            }
                        >
                            <div className="w-full flex justify-center text-primary-300">
                                {isImportingDeposits ? (
                                    <Spinner size="32" color="black" />
                                ) : (
                                    <AccountIcon className="fill-current h-8 w-8" />
                                )}
                            </div>
                            <span className="text-sm font-bold text-center">
                                Deposit
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    !isImportingDeposits &&
                                    !thereIsImportDepositErrors
                                ) {
                                    history.push({
                                        pathname: "/privacy/withdraw",
                                        state: {
                                            preSelectedAsset,
                                            isAssetDetailsPage,
                                        },
                                    })
                                }
                            }}
                            className={classnames(
                                "bg-primary-100 rounded-md p-4 w-1/2 flex flex-col items-center group space-y-3 cursor-pointer hover:bg-primary-200",
                                (isImportingDeposits || !isUserNetworkOnline) &&
                                    "opacity-50 pointer-events-none"
                            )}
                            disabled={
                                isImportingDeposits ||
                                thereIsImportDepositErrors ||
                                !isUserNetworkOnline
                            }
                        >
                            <div className="w-full flex justify-center text-black">
                                {isImportingDeposits ? (
                                    <Spinner size="32" color="black" />
                                ) : (
                                    <AccountIcon className="fill-current h-8 w-8" />
                                )}
                            </div>
                            <span className="text-sm font-bold text-center">
                                Withdraw
                            </span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col space-y-4">
                    <span className="text-xs">OTHER</span>

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
                            history.push("/")
                        }}
                    />

                    <VerticalSelect
                        options={[
                            {
                                icon: compliance,
                                label: "Compliance (Withdrawals History)",
                                to: "/privacy/withdrawals",
                            },
                            {
                                icon: tornado,
                                label: "Reconstruct Tornado Notes",
                                to: "/",
                                name: "reconstruct",
                            },
                        ]}
                        value={undefined}
                        onChange={(option) => {
                            if (option.name === "reconstruct") {
                                setShowReconstructDialog(true)
                            } else {
                                option.to.includes("https://")
                                    ? chrome.tabs.create({ url: option.to })
                                    : history.push(option.to)
                            }
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
                </div>
                {/*<hr className="border-0.5 border-gray-200 w-full" />*/}
                {!isImportingDeposits && thereIsImportDepositErrors && (
                    <div className="flex flex-row items-center w-full p-4 mt-auto text-center bg-red-100 rounded-md">
                        <span className="w-3/4 text-sm text-red-600 text-left">
                            We found an error trying to import your deposits.
                            Try one more time.
                        </span>

                        <div className="w-1/4">
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsLoading(true)
                                    await forceDepositsImport()
                                    setIsLoading(false)
                                }}
                                className={classnames(
                                    "w-100 rounded-md cursor-pointer font-normal hover:bg-gray-50 border border-red-600 p-1 bg-white text-red-600",
                                    isLoading &&
                                        "opacity-50 pointer-events-none"
                                )}
                                disabled={isLoading}
                            >
                                {!isLoading ? "Retry" : <Spinner color="red" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default PrivacyPage
