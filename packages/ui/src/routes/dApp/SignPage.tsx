import {
    FunctionComponent,
    PropsWithChildren,
    useCallback,
    useState,
} from "react"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import { Classes } from "../../styles/classes"
import Divider from "../../components/Divider"
import { formatHash, formatName } from "../../util/formatAccount"
import { formatUnits } from "@ethersproject/units"
import { getAddress } from "@ethersproject/address"
import {
    DappReq,
    DappRequestSigningStatus,
} from "../../context/hooks/useDappRequest"
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite"
import {
    attemptRejectDappRequest,
    confirmDappRequest,
    setUserSettings,
} from "../../context/commActions"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    EIP712Domain,
    EIP712DomainKey,
    MessageSchema,
    NormalizedSignatureData,
    SignatureMethods,
    TypedMessage,
    V1TypedData,
    DappRequestParams,
} from "@block-wallet/background/utils/types/ethereum"
import AccountIcon from "../../components/icons/AccountIcon"
import { getAccountColor } from "../../util/getAccountColor"
import { formatNumberLength } from "../../util/formatNumberLength"
import CopyTooltip from "../../components/label/СopyToClipboardTooltip"
import { useTokensList } from "../../context/hooks/useTokensList"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { DappRequestProps, DappRequest } from "./DappRequest"
import CheckBoxDialog from "../../components/dialog/CheckboxDialog"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import WarningDialog from "../../components/dialog/WarningDialog"
import HardwareDeviceNotLinkedDialog from "../../components/dialog/HardwareDeviceNotLinkedDialog"
import useCheckAccountDeviceLinked from "../../util/hooks/useCheckAccountDeviceLinked"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import { getDeviceFromAccountType } from "../../util/hardwareDevice"
import { useTransactionWaitingDialog } from "../../context/hooks/useTransactionWaitingDialog"
import { HardwareWalletOpTypes } from "../../context/commTypes"
import DAppPopupHeader from "../../components/dApp/DAppPopupHeader"
import DAppOrigin from "../../components/dApp/DAppOrigin"
import { getNetworkNameFromChainId } from "../../util/getExplorer"
import CodeBlock from "../../components/ui/CodeBlock"

import "react-json-view-lite/dist/index.css"

const SignPage = () => {
    return (
        <DappRequest
            requestType={DappReq.SIGNING}
            layoutRender={(props: DappRequestProps) => {
                return <Sign {...props} key={props.requestId} />
            }}
        />
    )
}

const Sign: FunctionComponent<PropsWithChildren<DappRequestProps>> = ({
    requestCount,
    requestId,
    origin,
    siteMetadata,
    dappReqData,
    status: requestStatus,
    approveTime,
    qrParams,
    error,
}) => {
    const { accounts, availableNetworks, selectedAddress, settings } =
        useBlankState()!
    const { nativeToken } = useTokensList()
    const { hideAddressWarning } = useUserSettings()
    const [copied, setCopied] = useState(false)
    const [accountWarningClosed, setAccountWarningClosed] = useState(false)
    const [isEthSignWarningOpen, setIsEthSignWarningOpen] = useState(true)
    const { isDeviceUnlinked, checkDeviceIsLinked, resetDeviceLinkStatus } =
        useCheckAccountDeviceLinked()

    const { method, params: dappReqParams } =
        dappReqData as DappRequestParams[DappReq.SIGNING]

    const websiteIcon = siteMetadata.iconURL
    const { address, data, rawData } = dappReqParams

    const accountData = accounts[address]

    // Detect if the transaction was triggered using an address different to the active one
    const checksumFromAddress = getAddress(address)
    const differentAddress = checksumFromAddress !== selectedAddress

    const { status, isOpen, dispatch, texts, titles, closeDialog, gifs } =
        useTransactionWaitingDialog(
            {
                id: requestId,
                status: requestStatus,
                error,
                epochTime: approveTime,
                qrParams,
            },
            HardwareWalletOpTypes.SIGN_MESSAGE,
            accountData.accountType,
            {
                reject: useCallback(() => {
                    if (requestId) {
                        attemptRejectDappRequest(requestId)
                    }
                }, [requestId]),
            }
        )

    const sign = async () => {
        dispatch({ type: "open", payload: { status: "loading" } })
        const isLinked = await checkDeviceIsLinked()
        if (!isLinked) {
            closeDialog()
            return
        }
        await confirmDappRequest(requestId, true)
    }

    const reject = async () => {
        dispatch({
            type: "open",
            payload: {
                status: "loading",
                titles: { loading: "Rejecting..." },
                texts: { loading: "Rejecting signing request..." },
            },
        })
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 300)
        })
        await confirmDappRequest(requestId, false)
        dispatch({
            type: "setStatus",
            payload: {
                status: "error",
                titles: { error: "Request Rejected" },
                texts: {
                    error: "Signing request was rejected.",
                },
            },
        })
    }

    const copy = async () => {
        await navigator.clipboard.writeText(accountData.address)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(false)
    }

    const formatTypedDomain = (domain: EIP712Domain) => {
        const displayOrder: EIP712DomainKey[] = [
            "name",
            "version",
            "chainId",
            "verifyingContract",
            "salt",
        ]

        const formattedDomainKeyNames: { [key in EIP712DomainKey]: string } = {
            chainId: "Chain ID",
            name: "DApp",
            salt: "Salt",
            verifyingContract: "Verifying Contract",
            version: "Version",
        }

        let parsedDomain = []

        // Arrayifi(lol) domain following the display order
        for (let i = 0; i < displayOrder.length; i++) {
            // Check existing properties on the domain
            if (
                typeof domain[displayOrder[i]] === "string" ||
                typeof domain[displayOrder[i]] === "number"
            ) {
                parsedDomain[i] = `${domain[displayOrder[i]]}`
            } else {
                parsedDomain[i] = null
            }
        }

        // Add chain id name if it exists
        if (domain.chainId) {
            const networkName = getNetworkNameFromChainId(
                availableNetworks,
                Number(domain.chainId)
            )
            parsedDomain[2] += ` (${networkName})`
        }

        // Display them
        return parsedDomain.map((param: string | null, i: number) => {
            if (param) {
                return (
                    <>
                        <span className="font-semibold pt-1">
                            {formattedDomainKeyNames[displayOrder[i]]}
                        </span>
                        <span className="text-primary-grey-dark allow-select-all">
                            {param}
                        </span>
                    </>
                )
            } else {
                return null
            }
        })
    }

    const formatSignatureData = (
        method: SignatureMethods,
        data: NormalizedSignatureData[SignatureMethods],
        rawData: string | undefined
    ) => {
        if (method === "eth_sign") {
            return (
                <>
                    <WarningDialog
                        open={isEthSignWarningOpen}
                        onDone={() => setIsEthSignWarningOpen(false)}
                        title="Warning"
                        message="Signing this message can be dangerous. It could allow the requesting site to perform any operation on your wallet's behalf, including complete control of your assets. Sign only if you completely trust the requesting site."
                        buttonLabel="I understand"
                        useClickOutside={false}
                        iconColor="text-red-500"
                        wideMargins={false}
                    />
                    <div className="w-full px-3 py-3 text-sm text-red-500 bg-red-100 rounded">
                        <strong className="font-semibold">Warning: </strong>
                        {`Make sure you trust ${origin}. Signing this could grant complete control of your assets`}
                    </div>
                    <span className="font-semibold py-2">Message</span>
                    <CodeBlock className="max-h-56">
                        <>{rawData ?? data}</>
                    </CodeBlock>
                </>
            )
        }

        if (method === "personal_sign") {
            return (
                <>
                    <span className="font-semibold py-2">Message</span>
                    <CodeBlock className="max-h-56">
                        <>{rawData ?? data}</>
                    </CodeBlock>
                </>
            )
        }

        if (method === "eth_signTypedData_v1") {
            const v1Data = data as V1TypedData[]
            return (
                <>
                    {v1Data.map((param: V1TypedData) => {
                        return (
                            <>
                                <span className="font-semibold pt-1">
                                    {param.name}
                                </span>
                                <span className="text-primary-grey-dark allow-select-all">
                                    {`${param.value}`}
                                </span>
                            </>
                        )
                    })}
                </>
            )
        }

        const v4Data = data as TypedMessage<MessageSchema>
        return (
            <>
                {formatTypedDomain(v4Data.domain)}
                <span className="font-semibold py-1">Message</span>
                <JsonView
                    data={v4Data.message}
                    style={{ ...defaultStyles, container: "" }}
                    shouldInitiallyExpand={allExpanded}
                />
            </>
        )
    }

    return (
        <PopupLayout
            header={
                <DAppPopupHeader
                    title="Signature Request"
                    requestCount={requestCount}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={reject}
                        buttonClass={Classes.liteButton}
                        disabled={
                            requestStatus === undefined ||
                            requestStatus !== DappRequestSigningStatus.PENDING
                        }
                        label="Reject"
                    ></ButtonWithLoading>
                    <ButtonWithLoading
                        label="Sign"
                        onClick={sign}
                        disabled={
                            requestStatus === undefined ||
                            requestStatus !== DappRequestSigningStatus.PENDING
                        }
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: titles?.loading || "Confirming...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Signing request...",
                    success: texts?.success || "You've signed the request.",
                    error: texts?.error || "Something went wrong",
                }}
                clickOutsideToClose={false}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                onDone={closeDialog}
                gifs={gifs}
                hideButton
                showCloseButton
            />
            <CheckBoxDialog
                message={`Approval request was sent with an account that's different from the selected one in your wallet. \n\n Please select if you want to continue or reject the transaction.`}
                onClose={() => {
                    setAccountWarningClosed(true)
                }}
                onCancel={reject}
                onConfirm={(saveChoice) => {
                    if (saveChoice) {
                        setUserSettings({
                            ...settings,
                            hideAddressWarning: true,
                        })
                    }
                }}
                title="Different address detected"
                open={
                    differentAddress &&
                    !accountWarningClosed &&
                    !hideAddressWarning
                }
                closeText="Reject"
                confirmText="Continue"
                showCheckbox
                checkboxText="Don't show this warning again"
            />
            <DAppOrigin name={origin} iconURL={websiteIcon} />
            <Divider />
            <span className="font-semibold px-6 py-3 text-sm text-gray-800">
                Signing Account
            </span>
            <div className="flex flex-col px-6">
                <div className="flex flex-row items-center space-x-4">
                    <AccountIcon
                        className="w-10 h-10"
                        fill={getAccountColor(accountData.address)}
                    />
                    <button
                        type="button"
                        className="relative flex flex-col group space-y-1"
                        onClick={copy}
                    >
                        <span className="text-sm font-semibold">
                            {formatName(accountData.name, 15)}
                            {" ("}
                            {formatNumberLength(
                                formatUnits(
                                    nativeToken.balance,
                                    nativeToken.token.decimals
                                ),
                                5
                            )}
                            {` ${nativeToken.token.symbol})`}
                        </span>
                        <span className="text-xs text-primary-grey-dark">
                            {formatHash(accountData.address)}
                        </span>
                        <CopyTooltip copied={copied} />
                    </button>
                </div>
            </div>
            <div className="flex flex-col px-6 py-3 space-y-0.5 text-sm text-gray-800 break-words">
                {formatSignatureData(method, data, rawData)}
            </div>
            <HardwareDeviceNotLinkedDialog
                onDone={resetDeviceLinkStatus}
                isOpen={isDeviceUnlinked}
                vendor={getDeviceFromAccountType(accountData.accountType)}
                address={accountData.address}
            />
        </PopupLayout>
    )
}

export default SignPage
