import { FunctionComponent, useState } from "react"
import { CgArrowsExchangeV } from "react-icons/cg"

import { DappRequestParams } from "@block-wallet/background/utils/types/ethereum"

import { DappReq } from "../../context/hooks/useDappRequest"
import { useBlankState } from "../../context/background/backgroundHooks"
import { confirmDappRequest } from "../../context/commActions"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"
import InfoComponent from "../../components/InfoComponent"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import NetworkDisplayBadge from "../../components/chain/NetworkDisplayBadge"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"

import { getNetworkFromChainId } from "../../util/getExplorer"
import { Classes } from "../../styles"
import { DappRequest, DappRequestProps } from "./DappRequest"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import Divider from "../../components/Divider"
import DAppPopupHeader from "../../components/dApp/DAppPopupHeader"
import DAppOrigin from "../../components/dApp/DAppOrigin"

const SwitchEthereumChainPage = () => {
    return (
        <DappRequest
            requestType={DappReq.SWITCH_NETWORK}
            layoutRender={(props: DappRequestProps) => {
                return <SwitchEthereumChain {...props} />
            }}
        />
    )
}

const SwitchEthereumChain: FunctionComponent<DappRequestProps> = ({
    requestId,
    siteMetadata,
    dappReqData,
}) => {
    const { availableNetworks } = useBlankState()!
    const network = useSelectedNetwork()
    const { status, isOpen, dispatch, texts, titles } = useWaitingDialog()

    const currentNetworkChainId = network.chainId

    // Get the network names
    const { chainId: newNetworkChainId } =
        dappReqData as DappRequestParams[DappReq.SWITCH_NETWORK]

    const [currentNetwork] = useState(
        getNetworkFromChainId(availableNetworks, currentNetworkChainId)
    )
    const [newNetwork] = useState(
        getNetworkFromChainId(availableNetworks, newNetworkChainId)
    )

    const [currentSiteMetadata] = useState(siteMetadata)

    const approve = async () => {
        try {
            dispatch({ type: "open", payload: { status: "loading" } })
            await confirmDappRequest(requestId, true)
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
                texts: { loading: "Rejecting network switch..." },
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
                    error: "Switching network request was rejected.",
                },
            },
        })
    }

    return (
        <PopupLayout
            header={<DAppPopupHeader title="Switch Network" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={reject}
                        buttonClass={Classes.liteButton}
                        label="Reject"
                    ></ButtonWithLoading>
                    <ButtonWithLoading
                        onClick={approve}
                        label="Switch"
                    ></ButtonWithLoading>
                </PopupFooter>
            }
        >
            <WaitingDialog
                clickOutsideToClose={false}
                status={status}
                open={isOpen}
                titles={{
                    loading: titles?.loading || "Switching...",
                    success: titles?.success || "Success",
                    error: titles?.error || "Error",
                }}
                texts={{
                    loading: texts?.loading || "Switching networks....",
                    success: texts?.success || "You've switched the network.",
                    error:
                        texts?.error ||
                        "There was an error switching the network.",
                }}
                onDone={() => {
                    dispatch({ type: "close" })
                }}
                timeout={DAPP_FEEDBACK_WINDOW_TIMEOUT}
                hideButton
                showCloseButton
            />
            <DAppOrigin
                iconURL={currentSiteMetadata.iconURL}
                name={currentSiteMetadata.name}
            />
            <Divider />
            <div className="flex flex-col p-6 space-y-4 h-full justify-between">
                {/* Header */}
                <div className="flex flex-col space-y-2 text-sm">
                    <span className="font-semibold text-primary-black-default">
                        Allow this site to switch the network?
                    </span>
                    <span className="text-primary-grey-dark">
                        This will switch the selected network within BlockWallet
                        to a previously added network:
                    </span>
                </div>

                <div className="flex flex-col space-y-6">
                    {/* Current network */}
                    {currentNetwork && (
                        <NetworkDisplayBadge
                            className="min-w-[50%] py-1 m-auto"
                            network={currentNetwork}
                            showName
                        />
                    )}

                    {/* Switch Line */}
                    <div className="flex flex-row items-center justify-center">
                        <div
                            className="absolute border-t z-0"
                            style={{ width: "calc(100%)" }}
                        ></div>
                        {/* Arrow icon */}
                        <div className="flex flex-row items-center justify-center w-9 h-9 p-1.5 bg-white border border-primary-grey-hover rounded-full z-0">
                            <CgArrowsExchangeV fontStyle="bold" fontSize="48" />
                        </div>
                    </div>

                    {/* New network */}
                    {newNetwork && (
                        <NetworkDisplayBadge
                            className="min-w-[50%] py-1 m-auto"
                            network={newNetwork}
                            showName
                        />
                    )}
                </div>
                {/* Info component */}
                <InfoComponent className="mt-12">
                    Switching networks will cancel all pending confirmations
                </InfoComponent>
            </div>
        </PopupLayout>
    )
}

export default SwitchEthereumChainPage
