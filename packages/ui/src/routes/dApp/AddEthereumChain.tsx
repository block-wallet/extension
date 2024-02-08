import { FunctionComponent, useState } from "react"
import { NormalizedAddEthereumChainParameter } from "@block-wallet/background/utils/types/ethereum"

import { DappReq } from "../../context/hooks/useDappRequest"
import { confirmDappRequest } from "../../context/commActions"

import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import InfoComponent from "../../components/InfoComponent"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import { Classes } from "../../styles"
import { DappRequest, DappRequestProps } from "./DappRequest"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT, LINKS } from "../../util/constants"
import ClickableText from "../../components/button/ClickableText"
import DetailsDialog from "../../components/dialog/DetailsDialog"
import RPCValidationEndLabelInfo, {
    BlockExplorerValidation,
    ChainIdValidation,
    IconURLValidation,
    RPCUrlValidation,
} from "../../components/chain/RPCValidationEndLabelInfo"

import unknownChainIcon from "../../assets/images/unknown_token.svg"
import ExpandableText from "../../components/ExpandableText"
import Spinner from "../../components/spinner/Spinner"
import DAppPopupHeader from "../../components/dApp/DAppPopupHeader"
import DAppOrigin from "../../components/dApp/DAppOrigin"
import Divider from "../../components/Divider"
import { useBlankState } from "../../context/background/backgroundHooks"
import { CgDanger } from "react-icons/cg"
import Tooltip from "../../components/label/Tooltip"

const AddEthereumChainPage = () => {
    return (
        <DappRequest
            requestType={DappReq.ADD_ETHEREUM_CHAIN}
            layoutRender={(props: DappRequestProps) => {
                return <AddEthereumChain {...props} />
            }}
        />
    )
}

const ChainIcon: FunctionComponent<{ iconUrl: string; hide: boolean }> = ({
    iconUrl,
    hide,
}) => {
    const [loaded, setLoaded] = useState(false)
    return (
        <div className="flex flex-row items-center justify-center w-6 h-6 rounded-full bg-primary-grey-default mr-2">
            {!hide && !loaded && <Spinner />}
            <img
                alt="icon"
                draggable={false}
                className="rounded-full"
                style={!hide && !loaded ? { display: "none" } : {}}
                src={hide ? unknownChainIcon : iconUrl}
                onLoad={() => !hide && setLoaded(true)}
            />
        </div>
    )
}

const AddEthereumChain: FunctionComponent<DappRequestProps> = ({
    requestId,
    siteMetadata,
    dappReqData,
    requestCount,
}) => {
    const { status, isOpen, dispatch, texts, titles } = useWaitingDialog()
    const {
        chainId,
        blockExplorerUrl,
        chainName,
        iconUrl,
        nativeCurrency,
        rpcUrl,
        validations,
    } = dappReqData as NormalizedAddEthereumChainParameter

    const { availableNetworks } = useBlankState()!

    const networkNameExists = Object.values(availableNetworks).some(
        (network) => {
            return network.desc.toLowerCase() === chainName.toLowerCase()
        }
    )

    const [hasDialog, setHasDialog] = useState(false)
    const [isImageSaved, setIsImageSaved] = useState(false)

    const approve = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            await confirmDappRequest<DappReq.ADD_ETHEREUM_CHAIN>(
                requestId,
                true,
                {
                    saveImage: isImageSaved,
                }
            )
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
                texts: { loading: "Rejecting add new network..." },
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
                    error: "Add new network request was rejected.",
                },
            },
        })
    }

    return (
        <PopupLayout
            header={
                <DAppPopupHeader
                    title="Add Network"
                    requestCount={requestCount}
                    className="justify-between"
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
                        onClick={approve}
                        label="Add Network"
                        disabled={networkNameExists}
                    ></ButtonWithLoading>
                </PopupFooter>
            }
        >
            <WaitingDialog
                clickOutsideToClose={false}
                status={status}
                open={isOpen}
                titles={{
                    loading: titles?.loading || "Adding...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Adding new network....",
                    success:
                        texts?.success ||
                        "You've succesfully added the network.",
                    error:
                        texts?.error ||
                        "There was an error adding the network.",
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                }}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                hideButton
            />
            <DetailsDialog
                open={hasDialog}
                fixedTitle
                titleSize="text-base"
                itemTitleSize="text-sm"
                itemContentSize="text-xs"
                title="Network Details"
                onClose={() => setHasDialog(false)}
                options={[
                    {
                        title: "Network Name",
                        content: chainName,
                    },
                    {
                        title: (
                            <div className="flex flex-row w-full">
                                <h3 className="text-sm font-semibold mr-2">
                                    Chain ID
                                </h3>
                                <RPCValidationEndLabelInfo
                                    isValidating={false}
                                    rpcValidation={
                                        validations.knownChainId
                                            ? ChainIdValidation.KNOWN_CHAIN_ID
                                            : ChainIdValidation.UNKNOWN_CHAIN_ID
                                    }
                                    toolTipClassName="!-translate-x-16"
                                />
                            </div>
                        ),
                        content: chainId.toString(),
                    },
                    {
                        title: (
                            <div className="flex flex-row w-full">
                                <h3 className="text-sm font-semibold mr-2">
                                    Network URL
                                </h3>
                                {validations.knownChainId && (
                                    <RPCValidationEndLabelInfo
                                        isValidating={false}
                                        rpcValidation={
                                            validations.knownRpcUrl
                                                ? RPCUrlValidation.VERIFIED_ENDPOINT
                                                : RPCUrlValidation.UNVERIFIED_ENDPOINT
                                        }
                                        toolTipClassName="!-translate-x-20"
                                    />
                                )}
                            </div>
                        ),
                        content: rpcUrl,
                        expandable: true,
                    },
                    {
                        title: "Network Icon URL",
                        content: iconUrl,
                        expandable: true,
                    },
                    {
                        title: "Currency Symbol",
                        content: nativeCurrency.symbol,
                    },
                    {
                        title: "Currency Decimals",
                        content: nativeCurrency.decimals.toString(),
                    },
                    {
                        title: (
                            <div className="flex flex-row w-full">
                                <h3 className="text-sm font-semibold mr-2">
                                    Block Explorer URL
                                </h3>
                                {validations.knownChainId && (
                                    <RPCValidationEndLabelInfo
                                        isValidating={false}
                                        rpcValidation={
                                            validations.knownBlockExplorer
                                                ? BlockExplorerValidation.KNOWN_EXPLORER
                                                : BlockExplorerValidation.UNKNOWN_EXPLORER
                                        }
                                        toolTipClassName="!-translate-x-24"
                                    />
                                )}
                            </div>
                        ),
                        content: blockExplorerUrl,
                        expandable: true,
                    },
                ]}
            />
            <DAppOrigin
                iconURL={siteMetadata.iconURL}
                name={siteMetadata.name}
            />
            <Divider />
            <div className="flex flex-col px-6 pt-3 pb-1 space-y-2 h-full justify-between">
                {/* Header */}
                <div className="flex flex-col space-y-1 text-sm">
                    <span className="font-semibold text-primary-black-default">
                        Allow this site to add a network?
                    </span>
                    <span className="text-primary-grey-dark">
                        This will allow this network to be used within
                        BlockWallet
                    </span>
                </div>
                <div className="flex flex-col border border-primary-grey-hover rounded-lg space-y-2 px-4 py-3">
                    <div>
                        <div className="flex flex-row w-full">
                            <p className="font-semibold text-primary-black-default mr-2">
                                Network Name
                            </p>

                            {networkNameExists && (
                                <span className="flex flex-row items-center text-xxs group relative z-0">
                                    <CgDanger className="w-4 h-4 text-red-700 z-20" />
                                    <Tooltip
                                        className="!translate-x-6 !w-40 !break-word !whitespace-normal"
                                        content="Network name already in use."
                                    />
                                </span>
                            )}
                        </div>

                        <p className="text-primary-grey-dark">
                            {chainName || "-"}
                        </p>
                    </div>
                    <div>
                        <div className="flex flex-row w-full">
                            <p className="font-semibold text-primary-black-default mr-2">
                                Chain ID
                            </p>
                            <RPCValidationEndLabelInfo
                                isValidating={false}
                                rpcValidation={
                                    validations.knownChainId
                                        ? ChainIdValidation.KNOWN_CHAIN_ID
                                        : ChainIdValidation.UNKNOWN_CHAIN_ID
                                }
                                toolTipClassName="!translate-x-6"
                                wrapperClassName="z-0"
                            />
                        </div>
                        <p className="text-primary-grey-dark">{chainId}</p>
                    </div>
                    <div>
                        <div className="flex flex-row w-full">
                            <p className="font-semibold text-primary-black-default mr-2">
                                Network URL
                            </p>
                            {validations.knownChainId && (
                                <RPCValidationEndLabelInfo
                                    isValidating={false}
                                    rpcValidation={
                                        validations.knownRpcUrl
                                            ? RPCUrlValidation.VERIFIED_ENDPOINT
                                            : RPCUrlValidation.UNVERIFIED_ENDPOINT
                                    }
                                    toolTipClassName="!translate-x-0"
                                    wrapperClassName="z-0"
                                />
                            )}
                        </div>
                        <ExpandableText className="text-primary-grey-dark">
                            {rpcUrl}
                        </ExpandableText>
                    </div>

                    {iconUrl && (
                        <div>
                            <div className="flex flex-row w-full">
                                <p className="font-semibold text-primary-black-default mr-2">
                                    {validations.knownIcon
                                        ? "Network Icon"
                                        : "Network Icon URL"}
                                </p>
                                {!validations.knownIcon && (
                                    <RPCValidationEndLabelInfo
                                        isValidating={false}
                                        rpcValidation={
                                            IconURLValidation.CUSTOM_ICON
                                        }
                                        toolTipClassName="!-translate-x-16"
                                        wrapperClassName="z-0"
                                    />
                                )}
                            </div>
                            {!validations.knownIcon ? (
                                <>
                                    <ExpandableText className="text-primary-grey-dark">
                                        {iconUrl}
                                    </ExpandableText>
                                    <div className="pt-1 flex flex-row items-center">
                                        <ChainIcon
                                            iconUrl={iconUrl}
                                            hide={!isImageSaved}
                                        />
                                        <input
                                            type="checkbox"
                                            checked={isImageSaved}
                                            className={Classes.checkbox}
                                            onChange={() => {
                                                setIsImageSaved(!isImageSaved)
                                            }}
                                        />
                                        <span className="text-xs pl-2">
                                            Save image URL
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <ChainIcon iconUrl={iconUrl} hide={false} />
                            )}
                        </div>
                    )}
                    <div>
                        <ClickableText
                            className="font-semibold"
                            onClick={(e) => {
                                e.preventDefault()
                                setHasDialog(true)
                            }}
                        >
                            View all details
                        </ClickableText>
                    </div>
                </div>
                {/* Info component */}
                <InfoComponent className="pb-2">
                    BlockWallet does not verify custom networks. Make sure you
                    understand{" "}
                    <a
                        className="underline text-primary-blue-default hover:text-primary-blue-hover"
                        href={LINKS.ARTICLES.CUSTOM_NETWORK_RISKS}
                        target="_blank"
                        rel="noreferrer"
                    >
                        the potential risks adding a custom network may pose
                    </a>
                    .
                </InfoComponent>
            </div>
        </PopupLayout>
    )
}

export default AddEthereumChainPage
