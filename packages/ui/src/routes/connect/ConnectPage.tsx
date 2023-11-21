import { useEffect, useState } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import { Classes } from "../../styles/classes"

import Divider from "../../components/Divider"
import connectIcon from "../../assets/images/icons/connect_dapp.svg"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import AccountMultipleSelect from "../../components/account/AccountMultipleSelect"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import AppIcon from "../../components/icons/AppIcon"
import { confirmPermission } from "../../context/commActions"
import { usePendingPermissionRequest } from "../../context/hooks/usePendingPermissionRequest"
import { Redirect } from "react-router-dom"
import LoadingOverlay from "../../components/loading/LoadingOverlay"
import { AiFillInfoCircle, AiOutlineWarning } from "react-icons/ai"
import Tooltip from "../../components/label/Tooltip"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import AccountSearchBar from "../../components/account/AccountSearchBar"
import useAccountSearch from "../../util/hooks/account/useAccountSearch"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { PermissionRequest } from "@block-wallet/background/controllers/PermissionsController"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT, LINKS } from "../../util/constants"
import GenericTooltip from "../../components/label/GenericTooltip"
import CollapsableMessage from "../../components/CollapsableMessage"
import { isOriginSafe } from "../../util/isOriginSafe"

const ConnectPage = () => {
    const pendingPermissionRequest = usePendingPermissionRequest()
    const route = useNextRequestRoute()
    const [nextRequest, setNextRequest] = useDebouncedState(
        pendingPermissionRequest,
        DAPP_FEEDBACK_WINDOW_TIMEOUT
    )
    useEffect(() => {
        setNextRequest(pendingPermissionRequest)
    }, [setNextRequest, pendingPermissionRequest])

    return nextRequest.requestId ? (
        <ConnectSteps {...nextRequest} />
    ) : (
        <Redirect to={route} />
    )
}

const ConnectSteps = ({
    requestCount,
    requestId,
    site,
}: {
    requestCount: number
    requestId: string
    site: PermissionRequest
}) => {
    const isSiteOriginSafe = isOriginSafe(site.origin)
    const accountsList = useSortedAccounts()
    const account = useSelectedAccount()

    // State
    const [selectedAccounts, setSelectedAccounts] = useState<AccountInfo[]>([
        account,
    ])

    const { accounts: filteredAccounts, onChangeSearch } = useAccountSearch([
        account, // Place selected account at the top
        ...accountsList.filter((a) => a.address !== account.address),
    ])
    const { status, isOpen, dispatch, texts, titles } = useWaitingDialog()
    const [step, setStep] = useState(1)
    const [allowSite, setAllowSite] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [checkAll, setCheckAll] = useState(false)

    const nextEnabled = step === 1 ? selectedAccounts.length > 0 : allowSite

    const next = async () => {
        step === 1 ? setStep(2) : confirm()
    }

    const cancel = () => {
        step === 2 ? setStep(1) : confirm(false)
    }

    const confirm = async (accept = true) => {
        dispatch({
            type: "open",
            payload: {
                status: "loading",
                titles: { loading: accept ? "Connecting..." : "Rejecting..." },
                texts: {
                    loading: accept
                        ? "Connecting accounts..."
                        : "Rejecting request...",
                },
            },
        })
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 300)
        })
        await confirmPermission(
            requestId,
            accept ? selectedAccounts.map((a) => a.address) : null
        )
        dispatch({
            type: "setStatus",
            payload: {
                status: accept ? "success" : "error",
                titles: {
                    error: "Rejected",
                    success: "Connected",
                },
                texts: {
                    success: "You've successfully connected your accounts.",
                    error: "Request rejected.",
                },
            },
        })
    }

    useEffect(() => {
        if (selectedAccounts.length !== filteredAccounts.length) {
            setCheckAll(false)
        }
    }, [selectedAccounts, filteredAccounts])

    const postProcess = async () => {
        setStep(1)
        setSelectedAccounts([account])
        setIsLoading(false)
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Connect With BlockWallet"
                    close={false}
                    onBack={cancel}
                >
                    {requestCount > 1 && (
                        <div className="group relative">
                            <AiFillInfoCircle
                                size={26}
                                className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                            />
                            <Tooltip
                                content={`${requestCount - 1} more ${
                                    requestCount > 2 ? "requests" : "request"
                                }`}
                            />
                        </div>
                    )}
                    <span className="ml-auto text-sm text-primary-grey-dark">
                        {step} of 2
                    </span>
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={step === 1 ? "Next" : "Connect"}
                        disabled={!nextEnabled}
                        onClick={next}
                    />
                </PopupFooter>
            }
        >
            {isLoading && <LoadingOverlay />}
            {!isSiteOriginSafe && (
                <CollapsableMessage
                    dialog={{
                        title: "Warning: Suspicious URL",
                        message: (
                            <span>
                                The DApp URL you are connecting to seems
                                malicious. Make sure{" "}
                                <a
                                    className="underline text-primary-blue-default hover:text-primary-blue-hover"
                                    href={LINKS.ARTICLES.MALICIOUS_DAPPS}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    you know and trust this decentralized
                                    application
                                </a>{" "}
                                before connecting your wallet. Failure to do so
                                may result in loss of funds.
                            </span>
                        ),
                    }}
                    isCollapsedByDefault
                    collapsedMessage={
                        <div className="text-center  bg-yellow-200 hover:bg-yellow-100 opacity-90  w-full p-2 space-x-2 flex tems-center font-semibold justify-center">
                            <AiOutlineWarning className="w-4 h-4 yellow-300" />
                            <span className="text-xs text-yellow-900">
                                <span className="font-semibold">
                                    This DApp URL seems malicious.
                                </span>
                            </span>
                        </div>
                    }
                />
            )}
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: titles?.loading || "Connecting...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Loading...",
                    success:
                        texts?.success || "You've connected your accounts.",
                    error:
                        texts?.error ||
                        "There was an error connecting the accounts.",
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                    postProcess()
                }}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                hideButton
                showCloseButton
            />
            <div className="overflow-auto hide-scroll">
                <div className="flex flex-col items-center w-full p-6 space-y-3">
                    <AppIcon
                        iconURL={site.siteMetadata.iconURL || connectIcon}
                        size={14}
                        background={false}
                    />
                    <div className="w-max max-w-full group relative">
                        <p className="text-center text-sm text-gray-800 whitespace-pre-wrap max-w-full truncate">
                            {site.origin}
                        </p>
                        <GenericTooltip
                            bottom
                            className="p-2 break-all max-w-[310px]"
                            content={
                                <div>
                                    <p>
                                        <span className="font-semibold">
                                            Origin:
                                        </span>
                                        <br />
                                        <span data-testid="transaction-origin">
                                            {site.origin}
                                        </span>
                                    </p>
                                </div>
                            }
                        />
                    </div>

                    <span className="text-xs text-primary-grey-dark">
                        Only connect with sites you trust.
                    </span>
                </div>
                <Divider />
                {step === 1 ? (
                    <div className="flex flex-col p-6 space-y-5">
                        <AccountSearchBar
                            setIsSearching={(isSearching: boolean) => {
                                if (!isSearching) {
                                    onChangeSearch("")
                                }
                            }}
                            onChange={onChangeSearch}
                        />
                        <div className="flex flex-row items-center justify-start w-full text-sm space-x-4 cursor-pointer">
                            <input
                                type="checkbox"
                                className={Classes.checkboxAlt}
                                checked={checkAll}
                                onClick={() => {
                                    !checkAll
                                        ? setSelectedAccounts(filteredAccounts)
                                        : setSelectedAccounts([])
                                }}
                                onChange={() => {
                                    setCheckAll((c) => !c)
                                }}
                                id="selectAll"
                            />
                            <label
                                className="text-primary-grey-dark cursor-pointer"
                                htmlFor="selectAll"
                            >
                                Please select accounts:
                            </label>
                        </div>
                        <div className="flex flex-col space-y-3 text-sm text-primary-grey-dark">
                            <AccountMultipleSelect
                                accounts={filteredAccounts}
                                selectedAccount={account}
                                value={selectedAccounts}
                                onChange={setSelectedAccounts}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col p-6 space-y-6">
                        <span className="text-sm text-primary-grey-dark">
                            Allow this site to:
                        </span>
                        <div className="flex flex-row items-center space-x-4 text-sm text-primary-grey-dark cursor-pointer">
                            <input
                                type="checkbox"
                                className={Classes.checkboxAlt}
                                checked={allowSite}
                                onChange={() => setAllowSite(!allowSite)}
                                id="allowCheck"
                            />
                            <label
                                className="cursor-pointer"
                                htmlFor="allowCheck"
                            >
                                View the addresses of your permitted accounts
                                (required)
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default ConnectPage
