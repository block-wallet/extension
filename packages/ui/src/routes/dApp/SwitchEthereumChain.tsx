import { FunctionComponent, useEffect, useState } from "react"
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

import { getNetworkNameFromChainId } from "../../util/getExplorer"
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

    const [currentNetworkName, setCurrentNetworkName] = useState(
        getNetworkNameFromChainId(
            availableNetworks,
            currentNetworkChainId,
            "desc"
        )
    )
    const [newNetworkName, setNewNetworkName] = useState(
        getNetworkNameFromChainId(availableNetworks, newNetworkChainId, "desc")
    )

    const [currentSiteMetadata, setSiteMetadata] = useState(siteMetadata)

    useEffect(() => {
        // Check that this wasn't the last request and popup is still open to prevent
        // displaying same network on both labels
        setCurrentNetworkName(
            getNetworkNameFromChainId(
                availableNetworks,
                currentNetworkChainId,
                "desc"
            )
        )
        setNewNetworkName(
            getNetworkNameFromChainId(
                availableNetworks,
                newNetworkChainId,
                "desc"
            )
        )
        setSiteMetadata(siteMetadata)
    }, [
        newNetworkChainId,
        currentNetworkChainId,
        siteMetadata,
        availableNetworks,
        requestId,
        currentSiteMetadata,
    ])

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
            />
            <DAppOrigin
                iconURL={currentSiteMetadata.iconURL}
                name={currentSiteMetadata.name}
            />
            <Divider />
            <div className="flex flex-col p-6 space-y-4 h-full justify-between">
                {/* Header */}
                <div className="flex flex-col space-y-2 text-sm">
                    <span className="font-bold text-black">
                        Allow this site to switch the network?
                    </span>
                    <span className="text-gray-500">
                        This will switch the selected network within BlockWallet
                        to a previously added network:
                    </span>
                </div>

                <div className="flex flex-col space-y-6">
                    {/* Current network */}
                    <NetworkDisplayBadge
                        iconColor="bg-green-500"
                        className="min-w-[50%] max-w-[80%] py-1 m-auto"
                        network={currentNetworkName}
                        truncate={true}
                        fill={false}
                    />

                    {/* Switch Line */}
                    <div className="flex flex-row items-center justify-center">
                        <div
                            className="absolute border-t z-0"
                            style={{ width: "calc(100%)" }}
                        ></div>
                        {/* Arrow icon */}
                        <div className="flex flex-row items-center justify-center w-9 h-9 p-1.5 bg-white border border-gray-200 rounded-full z-0">
                            <CgArrowsExchangeV fontStyle="bold" fontSize="48" />
                        </div>
                    </div>

                    {/* New network */}
                    <NetworkDisplayBadge
                        iconColor="bg-blue-500"
                        className="min-w-[50%] max-w-[80%] py-1 m-auto"
                        network={newNetworkName}
                        truncate={true}
                        fill={false}
                    />
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
