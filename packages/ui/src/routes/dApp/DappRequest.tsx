import type {
    DappRequestSigningStatus,
    DappSignatureReq,
    NormalizedSwitchEthereumChainParameters,
    QRSignParams,
    RawSignatureData,
    WatchAssetReq,
} from "@block-wallet/background/utils/types/ethereum"
import { FunctionComponent, useEffect } from "react"

import useNextRequestRoute from "../../context/hooks/useNextRequestRoute"
import { DappReq, useDappRequest } from "../../context/hooks/useDappRequest"
import { Redirect } from "react-router"
import { SiteMetadata } from "@block-wallet/provider/types"
import useDebouncedState from "../../util/hooks/useDebouncedState"
import { DAPP_FEEDBACK_WINDOW_TIMEOUT } from "../../util/constants"
import { QRTransactionParams } from "@block-wallet/background/controllers/transactions/utils/types"

export interface DappRequestProps {
    dappReqData:
        | DappSignatureReq<keyof RawSignatureData>
        | NormalizedSwitchEthereumChainParameters
        | Record<string, unknown>
        | WatchAssetReq
    origin: string
    requestCount: number
    requestId: string
    status?: DappRequestSigningStatus
    approveTime?: number
    error?: Error
    siteMetadata: SiteMetadata
    qrParams?: QRSignParams
}

export const DappRequest: FunctionComponent<{
    requestType: DappReq
    layoutRender: React.FunctionComponent<DappRequestProps>
}> = ({ requestType, layoutRender }) => {
    const latestDappRequest = useDappRequest()
    const route = useNextRequestRoute()

    const [nextRequest, setNextRequest] = useDebouncedState(
        latestDappRequest,
        DAPP_FEEDBACK_WINDOW_TIMEOUT
    )
    useEffect(() => {
        setNextRequest(
            latestDappRequest,
            typeof latestDappRequest === "undefined" ||
                latestDappRequest.requestId !== nextRequest?.requestId
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        latestDappRequest?.status,
        latestDappRequest?.requestId,
        setNextRequest,
    ])

    if (
        typeof nextRequest === "undefined" ||
        nextRequest.type !== requestType
    ) {
        return <Redirect to={route} />
    }
    return layoutRender({
        dappReqData: nextRequest.dappReqData,
        origin: nextRequest.origin,
        requestCount: latestDappRequest?.requestCount ?? 1,
        requestId: nextRequest.requestId,
        siteMetadata: nextRequest.siteMetadata,
        status: nextRequest.status,
        approveTime: nextRequest.approveTime,
        qrParams: nextRequest.qrParams,
        error: nextRequest.error,
    })
}
