import type { DappRequestParams } from "@block-wallet/background/utils/types/ethereum"
import AccountIcon from "../../components/icons/AccountIcon"
import CopyTooltip from "../../components/label/СopyToClipboardTooltip"
import Divider from "../../components/Divider"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import { useState, useEffect, FunctionComponent } from "react"
import blankIcon from "../../assets/images/logo.svg"
import { AiFillQuestionCircle } from "react-icons/ai"
import { Classes } from "../../styles/classes"
import { DappReq } from "../../context/hooks/useDappRequest"
import { capitalize } from "../../util/capitalize"
import { confirmDappRequest, getTokenBalance } from "../../context/commActions"
import { formatHash, formatName } from "../../util/formatAccount"
import { formatNumberLength } from "../../util/formatNumberLength"
import { formatUnits } from "@ethersproject/units"
import { getAccountColor } from "../../util/getAccountColor"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useTokensList } from "../../context/hooks/useTokensList"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import WarningTip from "../../components/label/WarningTip"
import { formatRounded } from "../../util/formatRounded"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"
import GenericTooltip from "../../components/label/GenericTooltip"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { DappRequestProps, DappRequest } from "./DappRequest"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import DAppPopupHeader from "../../components/dApp/DAppPopupHeader"
import DAppOrigin from "../../components/dApp/DAppOrigin"

const UNKNOWN_BALANCE = "UNKNOWN_BALANCE"
const IS_BASE64_IMAGE = "IS_BASE64_IMAGE"

const WatchAssetPage = () => {
    return (
        <DappRequest
            requestType={DappReq.ASSET}
            layoutRender={(props: DappRequestProps) => {
                return <WatchAsset {...props} />
            }}
        />
    )
}

const WatchAsset: FunctionComponent<DappRequestProps> = ({
    requestCount,
    requestId,
    dappReqData,
    siteMetadata,
}) => {
    const network = useSelectedNetwork()
    const { accounts } = useBlankState()!
    const selectedAccount = useSelectedAccount()
    const { nativeToken } = useTokensList()
    const { status, isOpen, dispatch, texts, titles } = useWaitingDialog()

    const [copied, setCopied] = useState(false)
    const [balance, setBalance] = useState("")
    const [isImageSaved, setIsImageSaved] = useState(false)

    const {
        params: token,
        activeAccount,
        isUpdate,
        savedToken,
    } = dappReqData as DappRequestParams[DappReq.ASSET]

    // Default to selected account if no active account is found for the dapp
    const accountData = accounts[activeAccount ?? selectedAccount.address]

    const isBase64Image = token.image === IS_BASE64_IMAGE

    const assetImageSrc = (): string => {
        if (isBase64Image || !isImageSaved) {
            return unknownTokenIcon
        }

        return token.image ?? unknownTokenIcon
    }

    const addToken = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            await confirmDappRequest<DappReq.ASSET>(requestId, true, {
                symbol: token.symbol,
                decimals: token.decimals,
                image: assetImageSrc(),
            })
            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (err) {
            dispatch({
                type: "setStatus",
                payload: {
                    status: "error",
                    texts: {
                        error: err.message,
                    },
                },
            })
        }
    }

    const reject = async () => {
        dispatch({
            type: "open",
            payload: {
                status: "loading",
                titles: { loading: "Rejecting..." },
                texts: { loading: "Rejecting watch asset request..." },
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
                    error: "Watch Asset request was rejected.",
                },
            },
        })
    }

    const copyAssetAddress = async () => {
        await navigator.clipboard.writeText(token.address)
        setCopied(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setCopied(false)
    }

    useEffect(() => {
        getTokenBalance(token.address, accountData.address)
            .then((fetchedBalance) => {
                setBalance(
                    formatRounded(
                        formatUnits(fetchedBalance || "0", token.decimals)
                    )
                )
            })
            .catch((error: Error) => {
                // If this happens the asset doesn't exist
                // (At least on current chain)
                if (error.message.includes("code=CALL_EXCEPTION")) {
                    setBalance(UNKNOWN_BALANCE)
                }
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const UpdateAssetLayout = () => {
        return (
            <>
                <div className="px-6 pt-3">
                    <WarningTip
                        text="Updating existing assets could put your privacy at risk or be used to scam you."
                        fontSize="text-xs"
                    />
                </div>
                <div className="flex flex-row items-center px-6 py-3">
                    <div className="flex flex-row items-center justify-center w-10 h-10 rounded-full bg-primary-grey-default">
                        <img
                            alt="icon"
                            src={
                                savedToken!.image
                                    ? savedToken!.image
                                    : blankIcon
                            }
                        />
                    </div>
                    <button
                        type="button"
                        className="relative flex flex-col group space-y-1 ml-4"
                        onClick={() => copyAssetAddress()}
                    >
                        <span className="text-sm font-semibold">
                            {savedToken!.symbol}
                        </span>
                        <span className="text-xs text-primary-grey-dark">
                            {formatHash(savedToken!.address)}
                        </span>
                        <CopyTooltip copied={copied} />
                    </button>
                </div>
                <span className="font-medium px-6 text-xxs text-primary-grey-dark">
                    WITH ASSET:
                </span>
            </>
        )
    }

    return (
        <PopupLayout
            header={
                <DAppPopupHeader
                    title={`${isUpdate ? "Update" : "Add"} Asset`}
                    requestCount={requestCount}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={reject}
                        buttonClass={Classes.liteButton}
                        label="Reject"
                    ></ButtonWithLoading>
                    <ButtonWithLoading
                        label={`${isUpdate ? "Update" : "Add"} asset`}
                        onClick={addToken}
                    />
                </PopupFooter>
            }
        >
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
                        texts?.success ||
                        `You've ${isUpdate ? "updated" : "added"} the asset.`,
                    error:
                        texts?.error ||
                        `There was an error ${
                            isUpdate ? "updating" : "adding"
                        } the asset.`,
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                }}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                clickOutsideToClose={false}
                hideButton
                showCloseButton
            />
            <DAppOrigin
                name={siteMetadata.name}
                iconURL={siteMetadata.iconURL}
            />
            <Divider />
            {isUpdate ? UpdateAssetLayout() : null}
            <div className="flex flex-row items-center px-6 pt-6 pb-3">
                <div className="flex flex-row items-center justify-center w-10 h-10 rounded-full bg-primary-grey-default">
                    <img alt="icon" src={assetImageSrc()} />
                </div>
                <button
                    type="button"
                    className="relative ml-4 flex flex-col group space-y-1"
                    onClick={() => copyAssetAddress()}
                >
                    <span className="text-sm font-semibold">
                        {token.symbol}
                    </span>
                    <span className="text-xs text-primary-grey-dark">
                        {formatHash(token.address)}
                    </span>
                    <CopyTooltip copied={copied} />
                </button>
                <div className="flex flex-col ml-auto h-full">
                    <span className="text-sm font-semibold mb-auto text-left">
                        Balance
                    </span>
                    {balance === UNKNOWN_BALANCE ? (
                        <div className="flex flex-row items-end">
                            <span className="pr-1 text-xs text-primary-grey-dark">
                                Unknown
                            </span>
                            <GenericTooltip
                                bottom
                                className="right-0"
                                content={
                                    <p className="w-40 text-center">
                                        Make sure this address corresponds to a
                                        valid {capitalize(network.name)} asset.
                                    </p>
                                }
                            >
                                <AiFillQuestionCircle
                                    size={18}
                                    className="cursor-pointer text-primary-200 hover:text-primary-blue-default"
                                />
                            </GenericTooltip>
                        </div>
                    ) : (
                        <span className="text-xs text-primary-grey-dark">
                            {balance} {token.symbol}
                        </span>
                    )}
                </div>
            </div>
            <span className="font-medium px-6 pt-3 text-xxs text-primary-grey-dark">
                {isUpdate ? "IN " : "TO "} ACCOUNT:
            </span>
            <div className="flex flex-col px-6 pb-6 pt-3">
                <div className="flex flex-row items-center space-x-4">
                    <AccountIcon
                        className="w-10 h-10"
                        fill={getAccountColor(accountData.address)}
                    />
                    <div className="relative flex flex-col group space-y-1">
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
                    </div>
                </div>
            </div>
            <Divider />
            <div className="flex flex-col px-6 py-3 space-y-2 text-xs text-gray-800 break-words">
                <div className="flex flex-col space-y-0.5">
                    <span className="font-semibold">Decimals</span>
                    <span className="text-primary-grey-dark">
                        {token.decimals}
                    </span>
                </div>
                {token!.image && !isBase64Image ? (
                    <div className="flex flex-col space-y-0.5">
                        <span className="font-semibold pt-1">Image URL</span>
                        <span className="text-primary-grey-dark pb-2">
                            {token!.image}
                        </span>
                        <WarningTip
                            text={
                                <span>
                                    <span className="font-semibold">
                                        Attention!{" "}
                                    </span>
                                    Your IP address will be exposed to this
                                    domain if you choose to save the image URL.
                                </span>
                            }
                            fontSize="text-xs"
                        />
                        <div className="pt-2 flex flex-row items-center">
                            <input
                                id="save_asset_image_checkbox"
                                type="checkbox"
                                checked={isImageSaved}
                                className={Classes.checkbox}
                                onChange={() => {
                                    setIsImageSaved(!isImageSaved)
                                }}
                            />
                            <label
                                className="text-xs pl-2"
                                htmlFor="save_asset_image_checkbox"
                            >
                                Save image URL
                            </label>
                        </div>
                    </div>
                ) : null}
                {isBase64Image && (
                    <div className="text-xs py-2">
                        <WarningTip
                            text={
                                "BlockWallet does not currently support Base64 encoded images. It will be replaced by a default image."
                            }
                            fontSize="text-xs"
                        />
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default WatchAssetPage
